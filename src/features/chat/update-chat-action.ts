"use server";

import { chatEventBus } from "@/lib/chat/event-bus";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { updateChatSchema } from "./schemas";

export const updateChatAction = actionClient
  .schema(updateChatSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "chat:manage");

    const { chatId, ...fields } = parsedInput;

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      const chat = await tx.chat.findUnique({
        where: { id: chatId },
        select: { id: true },
      });

      if (!chat) throw new Error("Chat não encontrado.");

      // Build data object with only provided fields
      const data: Record<string, unknown> = {};
      if (fields.titulo !== undefined) data.titulo = fields.titulo;
      if (fields.pinned !== undefined) data.pinned = fields.pinned;
      if (fields.archived !== undefined) data.archived = fields.archived;
      if (fields.blocked !== undefined) data.blocked = fields.blocked;
      if (fields.priority !== undefined) data.priority = fields.priority;
      if (fields.tags !== undefined) data.tags = fields.tags;

      if (Object.keys(data).length === 0) {
        return { ok: true };
      }

      await tx.chat.update({
        where: { id: chatId },
        data,
      });

      chatEventBus.emit(ctx.activeTenantId, {
        type: "chat_updated",
        chatId,
        changes: data,
      });

      return { ok: true };
    });
  });
