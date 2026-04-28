"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { publishAgentInTx } from "@/lib/agents/publish";
import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({ id: z.string().uuid() });

export async function publishAgentAction(formData: FormData) {
  const parsed = inputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) redirect("/agents");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "agent:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    const result = await publishAgentInTx(tx, {
      agentId: parsed.data.id,
      tenantId: ctx.activeTenantId,
      publishedByAccountId: ctx.account.id,
    });
    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "agent.publish",
        entityType: "agent_version",
        entityId: result.versionId,
        after: { agentId: parsed.data.id, version: result.version },
      },
    );
  });

  redirect(`/agents/${parsed.data.id}`);
}
