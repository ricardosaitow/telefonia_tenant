"use server";

import { render } from "@react-email/render";

import { recordAuditInTx } from "@/lib/audit/record";
import { decryptCredential } from "@/lib/crypto/channel-credentials";
import { withTenantContext } from "@/lib/db/tenant-context";
import { sendViaSmtp } from "@/lib/email/channel/smtp-client";
import type { SmtpConfig } from "@/lib/email/channel/types";
import { ConversationReplyEmail } from "@/lib/email/templates/conversation-reply";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { replyEmailSchema } from "./schemas";

/**
 * Envia reply por email a uma conversa existente via SMTP do canal.
 *
 * 1. Parse + assertSessionAndMembership + assertCan("conversation:reply")
 * 2. Load conversation + emailData + channel (with SMTP config) via withTenantContext
 * 3. Validar: é canal email, tem emailData, tem SMTP config
 * 4. Render React Email template + enviar via SMTP
 * 5. Criar Turn (speaker: human_operator)
 * 6. Push message_id retornado nos emailData.references
 * 7. Audit log
 */
export const replyEmailAction = actionClient
  .schema(replyEmailSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "conversation:reply");

    const { conversationId, body } = parsedInput;

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      const conversation = await tx.conversation.findUnique({
        where: { id: conversationId },
        select: {
          id: true,
          emailData: true,
          channel: {
            select: {
              id: true,
              tipo: true,
              identificador: true,
              smtpHost: true,
              smtpPort: true,
              smtpUser: true,
              smtpPassEnc: true,
              smtpSecurity: true,
            },
          },
        },
      });

      if (!conversation) {
        throw new Error("Conversa não encontrada.");
      }

      if (conversation.channel.tipo !== "email" || !conversation.emailData) {
        throw new Error("Esta conversa não é do tipo email.");
      }

      const { emailData, channel } = conversation;

      if (!emailData.fromAddress) {
        throw new Error("Endereço do cliente não encontrado.");
      }

      if (!channel.smtpHost || !channel.smtpUser || !channel.smtpPassEnc) {
        throw new Error("Canal sem configuração SMTP. Configure nas configurações do canal.");
      }

      const smtpConfig: SmtpConfig = {
        host: channel.smtpHost,
        port: channel.smtpPort ?? 587,
        user: channel.smtpUser,
        pass: decryptCredential(channel.smtpPassEnc),
        security: (channel.smtpSecurity as SmtpConfig["security"]) ?? "tls",
      };

      // Headers de threading (RFC 5322).
      const headers: Record<string, string> = {};
      if (emailData.rootMessageId) {
        headers["In-Reply-To"] = emailData.rootMessageId;
      }
      if (emailData.references.length > 0) {
        headers["References"] = emailData.references.join(" ");
      }

      const subject = emailData.subject
        ? `Re: ${emailData.subject.replace(/^Re:\s*/i, "")}`
        : "Re: Resposta";

      // Render React Email template to HTML
      const html = await render(
        ConversationReplyEmail({
          bodyText: body,
          senderName: ctx.account.name,
        }),
      );

      const result = await sendViaSmtp(smtpConfig, {
        from: channel.identificador,
        to: emailData.fromAddress,
        subject,
        html,
        text: body,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      });

      // Criar Turn do operador.
      await tx.turn.create({
        data: {
          conversationId,
          tenantId: ctx.activeTenantId,
          speaker: "human_operator",
          contentText: body,
          actorAccountId: ctx.account.id,
        },
      });

      // Push message_id retornado pelo SMTP nos references.
      if (result.messageId) {
        const refs = [...emailData.references];
        if (!refs.includes(result.messageId)) refs.push(result.messageId);
        await tx.conversationEmailData.update({
          where: { conversationId },
          data: { references: refs },
        });
      }

      await recordAuditInTx(
        tx,
        {
          tenantId: ctx.activeTenantId,
          accountId: ctx.account.id,
          membershipId: ctx.membership.id,
        },
        {
          action: "conversation.reply_email",
          entityType: "conversation",
          entityId: conversationId,
          after: { to: emailData.fromAddress, subject },
        },
      );

      return { ok: true };
    });
  });
