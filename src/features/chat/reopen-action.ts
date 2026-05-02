"use server";

import { recordAuditInTx } from "@/lib/audit/record";
import { chatEventBus } from "@/lib/chat/event-bus";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { reopenChatSchema } from "./schemas";

export const reopenChatAction = actionClient
  .schema(reopenChatSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "chat:manage");

    const { chatId } = parsedInput;

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      const chat = await tx.chat.findUnique({
        where: { id: chatId },
        select: { id: true, status: true },
      });

      if (!chat) throw new Error("Chat não encontrado.");
      if (chat.status !== "finished") throw new Error("Chat não está finalizado.");

      await tx.chat.update({
        where: { id: chatId },
        data: {
          status: "in_service",
          finishedAt: null,
          finishedById: null,
          lastActivityAt: new Date(),
        },
      });

      await tx.chatMessage.create({
        data: {
          tenantId: ctx.activeTenantId,
          chatId,
          content: "Chat reaberto.",
          tipo: "system",
        },
      });

      await recordAuditInTx(
        tx,
        {
          tenantId: ctx.activeTenantId,
          accountId: ctx.account.id,
          membershipId: ctx.membership.id,
        },
        {
          action: "chat.reopen",
          entityType: "chat",
          entityId: chatId,
          before: { status: "finished" },
          after: { status: "in_service" },
        },
      );

      chatEventBus.emit(ctx.activeTenantId, {
        type: "chat_reopened",
        chatId,
      });

      return { ok: true };
    });
  });
