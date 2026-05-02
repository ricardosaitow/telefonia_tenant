"use server";

import { recordAuditInTx } from "@/lib/audit/record";
import { chatEventBus } from "@/lib/chat/event-bus";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { assignChatSchema } from "./schemas";

export const assignChatAction = actionClient
  .schema(assignChatSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "chat:manage");

    const { chatId, assignedToId } = parsedInput;

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      const chat = await tx.chat.findUnique({
        where: { id: chatId },
        select: { id: true, status: true, assignedToId: true },
      });

      if (!chat) throw new Error("Chat não encontrado.");
      if (chat.status === "finished") throw new Error("Chat finalizado.");

      // Validate assignee membership
      const assignee = await tx.tenantMembership.findUnique({
        where: { id: assignedToId },
        select: { id: true },
      });
      if (!assignee) throw new Error("Membro não encontrado.");

      await tx.chat.update({
        where: { id: chatId },
        data: {
          assignedToId,
          status: chat.status === "triage" ? "waiting" : chat.status,
          lastActivityAt: new Date(),
        },
      });

      // Add assignee as participant if not already
      await tx.chatParticipant.upsert({
        where: { chatId_membershipId: { chatId, membershipId: assignedToId } },
        create: {
          tenantId: ctx.activeTenantId,
          chatId,
          membershipId: assignedToId,
        },
        update: {
          leftAt: null,
          deletedAt: null,
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
          action: "chat.assign",
          entityType: "chat",
          entityId: chatId,
          before: { assignedToId: chat.assignedToId },
          after: { assignedToId },
        },
      );

      chatEventBus.emit(ctx.activeTenantId, {
        type: "chat_assigned",
        chatId,
        assignedToId,
      });

      return { ok: true };
    });
  });
