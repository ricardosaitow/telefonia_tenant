"use server";

import { chatEventBus } from "@/lib/chat/event-bus";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { markReadSchema } from "./schemas";

export const markReadAction = actionClient
  .schema(markReadSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "chat:view");

    const { chatId } = parsedInput;

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      await tx.chatParticipant.updateMany({
        where: { chatId, membershipId: ctx.membership.id },
        data: { lastReadAt: new Date() },
      });

      chatEventBus.emit(ctx.activeTenantId, {
        type: "message_read",
        chatId,
        membershipId: ctx.membership.id,
      });

      return { ok: true };
    });
  });
