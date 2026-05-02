"use server";

import { recordAuditInTx } from "@/lib/audit/record";
import { chatEventBus } from "@/lib/chat/event-bus";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { transferChatSchema } from "./schemas";

export const transferChatAction = actionClient
  .schema(transferChatSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "chat:manage");

    const { chatId, departmentId } = parsedInput;

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      const chat = await tx.chat.findUnique({
        where: { id: chatId },
        select: { id: true, status: true, departmentId: true },
      });

      if (!chat) throw new Error("Chat não encontrado.");
      if (chat.status === "finished") throw new Error("Chat finalizado.");

      const dept = await tx.department.findUnique({
        where: { id: departmentId },
        select: { id: true, nome: true },
      });
      if (!dept) throw new Error("Departamento não encontrado.");

      await tx.chat.update({
        where: { id: chatId },
        data: {
          departmentId,
          assignedToId: null,
          status: "waiting",
          lastActivityAt: new Date(),
        },
      });

      await tx.chatMessage.create({
        data: {
          tenantId: ctx.activeTenantId,
          chatId,
          content: `Chat transferido para ${dept.nome}.`,
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
          action: "chat.transfer",
          entityType: "chat",
          entityId: chatId,
          before: { departmentId: chat.departmentId },
          after: { departmentId },
        },
      );

      chatEventBus.emit(ctx.activeTenantId, {
        type: "chat_transferred",
        chatId,
        departmentId,
      });

      return { ok: true };
    });
  });
