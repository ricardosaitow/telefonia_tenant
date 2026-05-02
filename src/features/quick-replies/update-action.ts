"use server";

import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { updateQuickReplySchema } from "./schemas";

export const updateQuickReplyAction = actionClient
  .schema(updateQuickReplySchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "quick_reply:manage");

    const { id, ...fields } = parsedInput;

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      const existing = await tx.quickReply.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) throw new Error("Resposta rápida não encontrada.");

      const data: Record<string, unknown> = {};
      if (fields.title !== undefined) data.title = fields.title;
      if (fields.shortcut !== undefined) data.shortcut = fields.shortcut;
      if (fields.content !== undefined) data.content = fields.content;
      if (fields.mediaUrl !== undefined) data.mediaUrl = fields.mediaUrl;
      if (fields.mediaMimeType !== undefined) data.mediaMimeType = fields.mediaMimeType;
      if (fields.departmentId !== undefined) data.departmentId = fields.departmentId;
      if (fields.active !== undefined) data.active = fields.active;

      if (Object.keys(data).length === 0) return { ok: true };

      await tx.quickReply.update({ where: { id }, data });

      return { ok: true };
    });
  });
