"use server";

import { chatEventBus } from "@/lib/chat/event-bus";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { addParticipantSchema, removeParticipantSchema } from "./schemas";

export const addParticipantAction = actionClient
  .schema(addParticipantSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "chat:manage");

    const { chatId, membershipId, isAdmin } = parsedInput;

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      const chat = await tx.chat.findUnique({
        where: { id: chatId },
        select: { id: true, tipo: true },
      });

      if (!chat) throw new Error("Chat não encontrado.");

      // Validate membership exists in tenant
      const member = await tx.tenantMembership.findUnique({
        where: { id: membershipId },
        select: { id: true, account: { select: { nome: true } } },
      });
      if (!member) throw new Error("Membro não encontrado.");

      await tx.chatParticipant.upsert({
        where: { chatId_membershipId: { chatId, membershipId } },
        create: {
          tenantId: ctx.activeTenantId,
          chatId,
          membershipId,
          isAdmin,
        },
        update: {
          leftAt: null,
          deletedAt: null,
          isAdmin,
        },
      });

      chatEventBus.emit(ctx.activeTenantId, {
        type: "chat_updated",
        chatId,
        changes: {},
      });

      return { ok: true };
    });
  });

export const removeParticipantAction = actionClient
  .schema(removeParticipantSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "chat:manage");

    const { chatId, membershipId } = parsedInput;

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      const chat = await tx.chat.findUnique({
        where: { id: chatId },
        select: { id: true },
      });

      if (!chat) throw new Error("Chat não encontrado.");

      const updated = await tx.chatParticipant.updateMany({
        where: { chatId, membershipId, leftAt: null },
        data: { leftAt: new Date() },
      });

      if (updated.count === 0) throw new Error("Participante não encontrado.");

      chatEventBus.emit(ctx.activeTenantId, {
        type: "chat_updated",
        chatId,
        changes: {},
      });

      return { ok: true };
    });
  });
