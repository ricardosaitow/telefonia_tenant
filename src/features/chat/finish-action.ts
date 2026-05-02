"use server";

import { recordAuditInTx } from "@/lib/audit/record";
import { chatEventBus } from "@/lib/chat/event-bus";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { finishChatSchema } from "./schemas";

export const finishChatAction = actionClient
  .schema(finishChatSchema)
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
      if (chat.status === "finished") throw new Error("Chat já finalizado.");

      const now = new Date();

      await tx.chat.update({
        where: { id: chatId },
        data: {
          status: "finished",
          finishedAt: now,
          finishedById: ctx.membership.id,
          lastActivityAt: now,
        },
      });

      // Add system message
      await tx.chatMessage.create({
        data: {
          tenantId: ctx.activeTenantId,
          chatId,
          content: "Chat finalizado.",
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
          action: "chat.finish",
          entityType: "chat",
          entityId: chatId,
          before: { status: chat.status },
          after: { status: "finished" },
        },
      );

      chatEventBus.emit(ctx.activeTenantId, {
        type: "chat_finished",
        chatId,
      });

      return { ok: true };
    });
  });
