"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({
  channelId: z.string().uuid(),
  ruleId: z.string().uuid().nullable(),
});

/**
 * Marca uma RoutingRule como default do Channel (ou desmarca se ruleId=null).
 * Verifica que a rule pertence ao mesmo channel antes (defesa em
 * profundidade — RLS já garante tenant; channel match é responsabilidade
 * desta action).
 */
export async function setDefaultRoutingRuleAction(formData: FormData) {
  const ruleIdRaw = formData.get("ruleId");
  const parsed = inputSchema.safeParse({
    channelId: formData.get("channelId"),
    ruleId: ruleIdRaw === "" || ruleIdRaw === null ? null : ruleIdRaw,
  });
  if (!parsed.success) redirect("/channels");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "routing:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    if (parsed.data.ruleId) {
      const rule = await tx.routingRule.findUnique({
        where: { id: parsed.data.ruleId },
        select: { channelId: true },
      });
      if (!rule || rule.channelId !== parsed.data.channelId) return;
    }

    const result = await tx.channel.updateMany({
      where: { id: parsed.data.channelId },
      data: { defaultRoutingRuleId: parsed.data.ruleId },
    });
    if (result.count === 0) return;

    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "channel.set_default_routing",
        entityType: "channel",
        entityId: parsed.data.channelId,
        after: { defaultRoutingRuleId: parsed.data.ruleId },
      },
    );
  });

  redirect(`/channels/${parsed.data.channelId}`);
}
