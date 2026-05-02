import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { getSignatureHtml } from "@/features/email-signature/queries";
import { renderCompactHtml, renderCompactText } from "@/features/email-signature/renderer";
import { decryptCredential } from "@/lib/crypto/channel-credentials";
import { withTenantContext } from "@/lib/db/tenant-context";
import { sendViaSmtp } from "@/lib/email/channel/smtp-client";
import type { SmtpConfig } from "@/lib/email/channel/types";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const ATTACHMENTS_DIR = join(process.cwd(), "data", "attachments");
const MAX_FILES = 10;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB per file

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "email:send");

  const rl = await checkRateLimit({
    key: `email_send:${ctx.account.id}`,
    ...RATE_LIMITS.EMAIL_SEND,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Muitas tentativas. Aguarde ${rl.resetSec}s.` },
      { status: 429 },
    );
  }

  const formData = await request.formData();

  const channelId = formData.get("channelId") as string | null;
  const to = formData.get("to") as string | null;
  const cc = (formData.get("cc") as string | null) || undefined;
  const subject = formData.get("subject") as string | null;
  const body = formData.get("body") as string | null;
  const inReplyTo = (formData.get("inReplyTo") as string | null) || undefined;
  const mode = (formData.get("mode") as string | null) ?? "new";

  if (!channelId || !to || !body) {
    return NextResponse.json({ error: "channelId, to e body sao obrigatorios." }, { status: 400 });
  }

  // Collect attachment files
  const files = formData
    .getAll("attachments")
    .filter((v): v is File => v instanceof File && v.size > 0);

  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Maximo ${MAX_FILES} anexos permitidos.` }, { status: 400 });
  }

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Arquivo "${file.name}" excede 25 MB.` }, { status: 400 });
    }
  }

  // Save files to disk
  type SavedFile = { filename: string; path: string; contentType: string; sizeBytes: number };
  const savedFiles: SavedFile[] = [];

  if (files.length > 0) {
    await mkdir(ATTACHMENTS_DIR, { recursive: true });

    for (const file of files) {
      const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
      const diskName = `${randomUUID()}${ext}`;
      const diskPath = join(ATTACHMENTS_DIR, diskName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(diskPath, buffer);
      savedFiles.push({
        filename: file.name,
        path: diskPath,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
    }
  }

  const result = await withTenantContext(ctx.activeTenantId, async (tx) => {
    const channel = await tx.channel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        identificador: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPassEnc: true,
        smtpSecurity: true,
      },
    });

    if (!channel || !channel.smtpHost || !channel.smtpUser || !channel.smtpPassEnc) {
      throw new Error("Canal sem configuracao SMTP.");
    }

    const smtpConfig: SmtpConfig = {
      host: channel.smtpHost,
      port: channel.smtpPort ?? 587,
      user: channel.smtpUser,
      pass: decryptCredential(channel.smtpPassEnc),
      security: (channel.smtpSecurity as SmtpConfig["security"]) ?? "tls",
    };

    // Build threading headers if replying
    let headers: Record<string, string> | undefined;
    if (inReplyTo) {
      const replyEmail = await tx.emailMessage.findUnique({
        where: { id: inReplyTo },
        select: { messageId: true, references: true },
      });
      if (replyEmail?.messageId) {
        headers = { "In-Reply-To": replyEmail.messageId };
        const refs = replyEmail.references ? (JSON.parse(replyEmail.references) as string[]) : [];
        if (!refs.includes(replyEmail.messageId)) refs.push(replyEmail.messageId);
        headers["References"] = refs.join(" ");
      }
    }

    const toList = to
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ccList = cc
      ? cc
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    // Inject email signature
    const sig = await getSignatureHtml(ctx.activeTenantId, ctx.membership.id);
    let bodyHtml = `<div style="white-space: pre-wrap;">${escapeHtml(body)}</div>`;
    let bodyText = body;
    if (sig.html && sig.config) {
      if (mode === "reply") {
        // Reply: compact signature (-- name)
        const compactHtml = renderCompactHtml(sig.config);
        const compactText = renderCompactText(sig.config);
        if (compactHtml)
          bodyHtml = `<div style="white-space: pre-wrap;">${escapeHtml(body)}</div>${compactHtml}`;
        if (compactText) bodyText = `${body}\n\n${compactText}`;
      } else {
        // New / Forward: full signature
        bodyHtml = `<div style="white-space: pre-wrap;">${escapeHtml(body)}</div><br />${sig.html}`;
        if (sig.text) bodyText = `${body}\n\n${sig.text}`;
      }
    }

    const smtpResult = await sendViaSmtp(smtpConfig, {
      from: channel.identificador,
      to: toList,
      cc: ccList,
      subject: subject || "(sem assunto)",
      html: bodyHtml,
      text: bodyText,
      headers,
      attachments: savedFiles.map((f) => ({
        filename: f.filename,
        path: f.path,
        contentType: f.contentType,
      })),
    });

    // Save to Sent folder
    const sentFolder = await tx.emailFolder.findFirst({
      where: { channelId, tipo: "sent" },
      select: { id: true },
    });

    if (sentFolder) {
      const emailMsg = await tx.emailMessage.create({
        data: {
          tenantId: ctx.activeTenantId,
          channelId,
          folderId: sentFolder.id,
          messageId: smtpResult.messageId,
          fromAddress: channel.identificador,
          toAddresses: JSON.stringify(toList),
          ccAddresses: ccList ? JSON.stringify(ccList) : null,
          subject: subject || "(sem assunto)",
          bodyText: bodyText,
          bodyHtml: bodyHtml,
          preview: body.substring(0, 200),
          sentAt: new Date(),
          isRead: true,
          inReplyTo: headers?.["In-Reply-To"] ?? null,
          references: headers?.["References"]
            ? JSON.stringify(headers["References"].split(" "))
            : null,
        },
      });

      // Save attachment records
      for (const file of savedFiles) {
        await tx.emailAttachment.create({
          data: {
            tenantId: ctx.activeTenantId,
            emailId: emailMsg.id,
            filename: file.filename,
            mimeType: file.contentType,
            sizeBytes: file.sizeBytes,
            storagePath: file.path,
          },
        });
      }

      // Update sent folder count
      const total = await tx.emailMessage.count({ where: { channelId, folderId: sentFolder.id } });
      await tx.emailFolder.update({
        where: { id: sentFolder.id },
        data: { totalEmails: total },
      });
    }

    return { ok: true, messageId: smtpResult.messageId };
  });

  return NextResponse.json(result);
}
