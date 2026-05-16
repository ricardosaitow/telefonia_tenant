import { type NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";

import { ChannelStatus, ChannelType } from "@/generated/prisma/client";
import { decryptCredential } from "@/lib/crypto/channel-credentials";
import { prismaAdmin } from "@/lib/db/admin-client";
import { isInternalRequestAuthorized } from "@/lib/internal-api/auth";

/**
 * Send-email "on behalf of" um tenant. Usa o canal email (tipo='email') do
 * tenant pra autenticar SMTP — assim o cliente final recebe email com From
 * do domínio do próprio tenant, não do Pekiart.
 *
 * Bridge-ia chama essa rota nas tools register_callback, register_complaint
 * etc. Auth: env INTERNAL_API_KEY no header X-Internal-Auth.
 */
export const dynamic = "force-dynamic";

const inputSchema = z.object({
  tenantSlug: z.string().min(1),
  to: z.string().email(),
  subject: z.string().min(1).max(300),
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional(),
  fromName: z.string().min(1).max(120).optional(),
  replyTo: z.string().email().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isInternalRequestAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof inputSchema>;
  try {
    const body = await req.json();
    parsed = inputSchema.parse(body);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", detail: String(err) },
      { status: 400 },
    );
  }

  if (!parsed.bodyHtml && !parsed.bodyText) {
    return NextResponse.json(
      { ok: false, error: "body_required", detail: "bodyHtml ou bodyText obrigatório" },
      { status: 400 },
    );
  }

  // Resolve tenant + canal email ativo
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { slug: parsed.tenantSlug },
    select: { id: true, nomeFantasia: true },
  });
  if (!tenant) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  const channel = await prismaAdmin.channel.findFirst({
    where: { tenantId: tenant.id, tipo: ChannelType.email, status: ChannelStatus.active },
    select: {
      identificador: true,
      smtpHost: true,
      smtpPort: true,
      smtpSecurity: true,
      smtpUser: true,
      smtpPassEnc: true,
    },
  });
  if (!channel || !channel.smtpHost || !channel.smtpUser || !channel.smtpPassEnc) {
    return NextResponse.json(
      {
        ok: false,
        error: "email_channel_not_configured",
        detail: "Tenant não tem canal email ativo com SMTP configurado",
      },
      { status: 422 },
    );
  }

  let smtpPass: string;
  try {
    smtpPass = decryptCredential(channel.smtpPassEnc);
  } catch (err) {
    console.error("[internal-send-email] decrypt falhou:", err);
    return NextResponse.json({ ok: false, error: "credential_decrypt_failed" }, { status: 500 });
  }

  // Porta 465 = TLS implícito (secure=true); 587 = STARTTLS (secure=false).
  // Alguns providers (Hostinger) cadastram security='tls' mesmo em 465 — nesse
  // caso a porta manda. Sem isso, nodemailer trava em handshake.
  const port = channel.smtpPort ?? 587;
  const secureImplicit = port === 465 || channel.smtpSecurity === "ssl";
  const transporter = nodemailer.createTransport({
    host: channel.smtpHost,
    port,
    secure: secureImplicit,
    auth: { user: channel.smtpUser, pass: smtpPass },
    // Timeouts curtos pra não travar a Helena enquanto SMTP responde.
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 8_000,
  });

  try {
    const info = await transporter.sendMail({
      from: `"${parsed.fromName ?? tenant.nomeFantasia}" <${channel.identificador}>`,
      to: parsed.to,
      subject: parsed.subject,
      text: parsed.bodyText,
      html: parsed.bodyHtml,
      replyTo: parsed.replyTo,
    });
    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error("[internal-send-email] sendMail falhou:", err);
    return NextResponse.json(
      { ok: false, error: "smtp_send_failed", detail: String(err) },
      { status: 502 },
    );
  } finally {
    transporter.close();
  }
}
