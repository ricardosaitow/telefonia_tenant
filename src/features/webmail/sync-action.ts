"use server";

import type { EmailFolderType } from "@/generated/prisma/client";
import { decryptCredential } from "@/lib/crypto/channel-credentials";
import { withTenantContext } from "@/lib/db/tenant-context";
import { pollImap } from "@/lib/email/channel/imap-client";
import { pollPop3 } from "@/lib/email/channel/pop3-client";
import type { InboundConfig, InboundMessage } from "@/lib/email/channel/types";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { syncChannelSchema } from "./schemas";

const DEFAULT_FOLDERS: Array<{
  tipo: EmailFolderType;
  nome: string;
  imapPath: string;
  ordem: number;
}> = [
  { tipo: "inbox", nome: "Inbox", imapPath: "INBOX", ordem: 0 },
  { tipo: "sent", nome: "Enviados", imapPath: "Sent", ordem: 1 },
  { tipo: "drafts", nome: "Rascunhos", imapPath: "Drafts", ordem: 2 },
  { tipo: "trash", nome: "Lixeira", imapPath: "Trash", ordem: 3 },
  { tipo: "spam", nome: "Spam", imapPath: "Spam", ordem: 4 },
];

/**
 * Sync an email channel — fetch new messages from IMAP/POP3 and store in DB.
 *
 * IMPORTANT: The IMAP/POP3 fetch runs OUTSIDE the DB transaction to avoid
 * holding a Postgres transaction open for minutes on large mailboxes.
 * Only the DB writes run inside withTenantContext.
 */
export const syncEmailChannel = actionClient
  .schema(syncChannelSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "email:view");

    const { channelId } = parsedInput;

    // Phase 1: Read channel config (short DB transaction)
    const channel = await withTenantContext(ctx.activeTenantId, (tx) =>
      tx.channel.findUnique({
        where: { id: channelId },
        select: {
          id: true,
          tenantId: true,
          inboundProto: true,
          inboundHost: true,
          inboundPort: true,
          inboundUser: true,
          inboundPassEnc: true,
          inboundSecurity: true,
          lastPollAt: true,
        },
      }),
    );

    if (!channel || !channel.inboundHost || !channel.inboundUser || !channel.inboundPassEnc) {
      throw new Error("Canal sem configuração de recebimento.");
    }

    // Phase 2: Ensure default folders exist (short DB transaction)
    await withTenantContext(ctx.activeTenantId, async (tx) => {
      const existingFolders = await tx.emailFolder.findMany({
        where: { channelId },
        select: { tipo: true },
      });
      const existingTypes = new Set(existingFolders.map((f) => f.tipo));

      for (const folder of DEFAULT_FOLDERS) {
        if (!existingTypes.has(folder.tipo)) {
          await tx.emailFolder.create({
            data: {
              tenantId: ctx.activeTenantId,
              channelId,
              tipo: folder.tipo,
              nome: folder.nome,
              imapPath: folder.imapPath,
              ordem: folder.ordem,
            },
          });
        }
      }
    });

    // Phase 2.5: Get highest UID already synced (for incremental IMAP fetch)
    const maxUid = await withTenantContext(ctx.activeTenantId, async (tx) => {
      const latest = await tx.emailMessage.findFirst({
        where: { channelId, uid: { not: null } },
        orderBy: { uid: "desc" },
        select: { uid: true },
      });
      return latest?.uid ?? 0;
    });

    // Phase 3: Fetch messages from IMAP/POP3 (NO DB transaction — can take minutes)
    const config: InboundConfig = {
      proto: (channel.inboundProto as "imap" | "pop3") ?? "imap",
      host: channel.inboundHost,
      port: channel.inboundPort ?? (channel.inboundProto === "pop3" ? 995 : 993),
      user: channel.inboundUser,
      pass: decryptCredential(channel.inboundPassEnc),
      security: (channel.inboundSecurity as "tls" | "starttls" | "none") ?? "tls",
    };

    let messages: InboundMessage[];
    try {
      if (config.proto === "pop3") {
        messages = await pollPop3(config);
      } else {
        // Incremental: only fetch UIDs newer than what we already have
        messages = await pollImap(config, maxUid > 0 ? { sinceUid: maxUid } : undefined);
      }
    } catch (err) {
      // Save error to channel and return partial result
      await withTenantContext(ctx.activeTenantId, (tx) =>
        tx.channel.update({
          where: { id: channelId },
          data: {
            lastPollAt: new Date(),
            lastPollError:
              err instanceof Error ? err.message : "Erro ao conectar ao servidor de email",
          },
        }),
      );
      throw new Error(
        `Erro ao conectar ao servidor de email: ${err instanceof Error ? err.message : "timeout ou conexão recusada"}`,
      );
    }

    // Phase 4: Store messages in DB (short DB transaction per batch)
    const synced = await withTenantContext(ctx.activeTenantId, async (tx) => {
      const inboxFolder = await tx.emailFolder.findFirst({
        where: { channelId, tipo: "inbox" },
        select: { id: true },
      });
      if (!inboxFolder) {
        throw new Error("Pasta Inbox não encontrada.");
      }

      let count = 0;

      for (const msg of messages) {
        // Skip if already exists
        if (msg.messageId) {
          const existing = await tx.emailMessage.findFirst({
            where: { channelId, messageId: msg.messageId },
            select: { id: true },
          });
          if (existing) continue;
        }

        const preview = (msg.text ?? "").substring(0, 200);

        await tx.emailMessage.create({
          data: {
            tenantId: ctx.activeTenantId,
            channelId,
            folderId: inboxFolder.id,
            messageId: msg.messageId,
            uid: msg.uid,
            fromAddress: msg.from,
            fromName: msg.fromName,
            toAddresses: JSON.stringify(msg.to),
            ccAddresses: msg.cc ? JSON.stringify(msg.cc) : null,
            subject: msg.subject,
            bodyText: msg.text,
            bodyHtml: msg.html,
            preview,
            sentAt: msg.date,
            receivedAt: new Date(),
            isRead: msg.isRead ?? false,
            inReplyTo: msg.inReplyTo,
            references: msg.references.length > 0 ? JSON.stringify(msg.references) : null,
            sizeBytes: msg.sizeBytes,
          },
        });

        count++;
      }

      // Update folder counts
      const [totalCount, unreadCount] = await Promise.all([
        tx.emailMessage.count({ where: { channelId, folderId: inboxFolder.id } }),
        tx.emailMessage.count({ where: { channelId, folderId: inboxFolder.id, isRead: false } }),
      ]);

      await tx.emailFolder.update({
        where: { id: inboxFolder.id },
        data: { totalEmails: totalCount, unreadEmails: unreadCount },
      });

      // Update channel lastPollAt
      await tx.channel.update({
        where: { id: channelId },
        data: { lastPollAt: new Date(), lastPollError: null },
      });

      return count;
    });

    return { synced };
  });
