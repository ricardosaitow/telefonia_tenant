"use server";

import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { getChatById, getChatMessages, getChatNotes, getChats } from "./queries";
import { markReadSchema } from "./schemas";

/**
 * Load chat detail, messages, and notes in one round-trip.
 * Uses markReadSchema (just chatId) as input.
 */
export const loadChatAction = actionClient
  .schema(markReadSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "chat:view");

    const { chatId } = parsedInput;

    const [detail, messages, notes] = await Promise.all([
      getChatById(ctx.activeTenantId, chatId),
      getChatMessages(ctx.activeTenantId, chatId),
      getChatNotes(ctx.activeTenantId, chatId),
    ]);

    return { detail, messages, notes };
  });

/**
 * Reload the chat list.
 */
export const loadChatsAction = actionClient.action(async () => {
  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "chat:view");

  const chats = await getChats(ctx.activeTenantId, ctx.membership.id);
  return { chats };
});
