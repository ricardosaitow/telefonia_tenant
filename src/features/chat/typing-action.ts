"use server";

import { setTyping } from "@/lib/chat/typing-store";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { typingSchema } from "./schemas";

export const typingAction = actionClient.schema(typingSchema).action(async ({ parsedInput }) => {
  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "chat:send");

  const { chatId } = parsedInput;

  setTyping(ctx.activeTenantId, chatId, ctx.membership.id, ctx.account.name);

  return { ok: true };
});
