"use server";

import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { createQuickReplySchema } from "./schemas";

export const createQuickReplyAction = actionClient
  .schema(createQuickReplySchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "quick_reply:manage");

    const { title, shortcut, content, mediaUrl, mediaMimeType, departmentId } = parsedInput;

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      const reply = await tx.quickReply.create({
        data: {
          tenantId: ctx.activeTenantId,
          title,
          shortcut,
          content,
          mediaUrl: mediaUrl ?? null,
          mediaMimeType: mediaMimeType ?? null,
          departmentId: departmentId ?? null,
        },
        select: { id: true },
      });

      return { ok: true, id: reply.id };
    });
  });
