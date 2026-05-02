"use server";

import { chatEventBus } from "@/lib/chat/event-bus";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { addNoteSchema } from "./schemas";

export const addNoteAction = actionClient.schema(addNoteSchema).action(async ({ parsedInput }) => {
  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "chat:send");

  const { chatId, content } = parsedInput;

  return withTenantContext(ctx.activeTenantId, async (tx) => {
    const chat = await tx.chat.findUnique({
      where: { id: chatId },
      select: { id: true },
    });

    if (!chat) throw new Error("Chat não encontrado.");

    const note = await tx.chatNote.create({
      data: {
        tenantId: ctx.activeTenantId,
        chatId,
        authorMembershipId: ctx.membership.id,
        content,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: { account: { select: { nome: true } } },
        },
      },
    });

    chatEventBus.emit(ctx.activeTenantId, {
      type: "new_note",
      chatId,
      note: {
        id: note.id,
        content: note.content,
        authorName: note.author.account.nome,
        createdAt: note.createdAt.toISOString(),
      },
    });

    return { ok: true, noteId: note.id };
  });
});
