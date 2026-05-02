"use server";

import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { deleteChatSchema } from "./schemas";

/**
 * Soft-delete a chat for the current user.
 * Sets `deletedAt` on their ChatParticipant record (chat still exists for others).
 */
export const deleteChatAction = actionClient
  .schema(deleteChatSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "chat:view");

    const { chatId } = parsedInput;

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      await tx.chatParticipant.updateMany({
        where: { chatId, membershipId: ctx.membership.id, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      return { ok: true };
    });
  });
