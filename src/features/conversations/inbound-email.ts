import { prismaAdmin } from "@/lib/db/admin-client";
import { withTenantContext } from "@/lib/db/tenant-context";
import type { InboundMessage } from "@/lib/email/channel/types";

/**
 * Processa email inbound recebido via IMAP/POP3 poll.
 *
 * Fluxo:
 *  1. Recebe channelId + tenantId já resolvidos pelo poll worker
 *  2. withTenantContext:
 *     a. Se inReplyTo → buscar thread existente
 *     b. Se encontrou → adicionar Turn + push references
 *     c. Se não → criar Conversation nova + ConversationEmailData + routing
 *     d. Criar Turn (speaker: customer)
 */
export async function processInboundEmail(
  channelId: string,
  tenantId: string,
  msg: InboundMessage,
) {
  if (!msg.from) {
    console.log("[inbound-email] missing from, discarding");
    return;
  }

  // Load channel routing config
  const channel = await prismaAdmin.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      tenantId: true,
      defaultRoutingRuleId: true,
      defaultRoutingRule: {
        select: {
          targetDepartmentId: true,
          targetAgentId: true,
        },
      },
    },
  });

  if (!channel) {
    console.log("[inbound-email] no channel found for id", channelId);
    return;
  }

  await withTenantContext(tenantId, async (tx) => {
    // Tentar encontrar thread existente via inReplyTo.
    if (msg.inReplyTo) {
      const existingEmailData = await tx.conversationEmailData.findFirst({
        where: {
          OR: [{ rootMessageId: msg.inReplyTo }, { references: { has: msg.inReplyTo } }],
        },
        select: { conversationId: true, references: true },
      });

      if (existingEmailData) {
        // Adiciona Turn à conversa existente.
        await tx.turn.create({
          data: {
            conversationId: existingEmailData.conversationId,
            tenantId,
            speaker: "customer",
            contentText: msg.text ?? null,
          },
        });

        // Push message_id nos references.
        const refs = [...existingEmailData.references];
        if (msg.messageId && !refs.includes(msg.messageId)) refs.push(msg.messageId);

        await tx.conversationEmailData.update({
          where: { conversationId: existingEmailData.conversationId },
          data: { references: refs },
        });

        return;
      }
    }

    // Nova conversa.
    const conversation = await tx.conversation.create({
      data: {
        tenantId,
        channelId: channel.id,
        customerIdentifier: msg.from,
        status: "active",
        assistanceMode: "ai_only",
        currentDepartmentId: channel.defaultRoutingRule?.targetDepartmentId ?? null,
        currentAgentId: channel.defaultRoutingRule?.targetAgentId ?? null,
      },
    });

    await tx.conversationEmailData.create({
      data: {
        conversationId: conversation.id,
        tenantId,
        subject: msg.subject ?? null,
        rootMessageId: msg.messageId ?? null,
        references: msg.messageId ? [msg.messageId] : [],
        fromAddress: msg.from,
      },
    });

    await tx.turn.create({
      data: {
        conversationId: conversation.id,
        tenantId,
        speaker: "customer",
        contentText: msg.text ?? null,
      },
    });
  });
}
