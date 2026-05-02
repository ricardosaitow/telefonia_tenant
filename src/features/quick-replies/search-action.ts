"use server";

import { z } from "zod";

import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

const searchSchema = z.object({
  prefix: z.string().min(1).max(50),
  departmentId: z.string().uuid().optional(),
});

export const searchQuickRepliesAction = actionClient
  .schema(searchSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "chat:send");

    const { prefix, departmentId } = parsedInput;

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      const replies = await tx.quickReply.findMany({
        where: {
          active: true,
          shortcut: { startsWith: prefix },
          ...(departmentId ? { OR: [{ departmentId }, { departmentId: null }] } : {}),
        },
        orderBy: { usageCount: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          shortcut: true,
          content: true,
          mediaUrl: true,
          mediaMimeType: true,
        },
      });

      return { replies };
    });
  });

const useSchema = z.object({
  id: z.string().uuid(),
});

export const trackQuickReplyUsageAction = actionClient
  .schema(useSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "chat:send");

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      await tx.quickReply.update({
        where: { id: parsedInput.id },
        data: { usageCount: { increment: 1 } },
      });
      return { ok: true };
    });
  });
