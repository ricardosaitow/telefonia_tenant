"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({
  id: z.string().uuid(),
  channelId: z.string().uuid(),
});

export async function deleteRoutingRuleAction(formData: FormData) {
  const parsed = inputSchema.safeParse({
    id: formData.get("id"),
    channelId: formData.get("channelId"),
  });
  if (!parsed.success) redirect("/channels");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "routing:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    const before = await tx.routingRule.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        channelId: true,
        tipo: true,
        targetDepartmentId: true,
        targetAgentId: true,
      },
    });
    if (!before) return;

    // Se essa rule era a default do channel, zera defaultRoutingRuleId antes
    // pra evitar FK SetNull — consistência explícita.
    await tx.channel.updateMany({
      where: { id: before.channelId, defaultRoutingRuleId: parsed.data.id },
      data: { defaultRoutingRuleId: null },
    });
    await tx.routingRule.delete({ where: { id: parsed.data.id } });
    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "routing_rule.delete",
        entityType: "routing_rule",
        entityId: before.id,
        before,
      },
    );
  });

  redirect(`/channels/${parsed.data.channelId}`);
}
