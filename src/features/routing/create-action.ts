"use server";

import { redirect } from "next/navigation";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { routingRuleInputSchema } from "./schemas";

/**
 * Cria nova RoutingRule (tipo direct) num Channel.
 *
 * Recebe FormData com: channelId, targetType (department|agent), targetId.
 * Mapeia targetType pro field correto (targetDepartmentId OU targetAgentId)
 * — CHECK constraint no DB garante XOR.
 */
export async function createRoutingRuleAction(formData: FormData) {
  const parsed = routingRuleInputSchema.safeParse({
    channelId: formData.get("channelId"),
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
  });
  if (!parsed.success) redirect("/channels");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "routing:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    const created = await tx.routingRule.create({
      data: {
        tenantId: ctx.activeTenantId,
        channelId: parsed.data.channelId,
        tipo: "direct",
        targetDepartmentId: parsed.data.targetType === "department" ? parsed.data.targetId : null,
        targetAgentId: parsed.data.targetType === "agent" ? parsed.data.targetId : null,
      },
    });
    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "routing_rule.create",
        entityType: "routing_rule",
        entityId: created.id,
        after: created,
      },
    );
  });

  redirect(`/channels/${parsed.data.channelId}`);
}
