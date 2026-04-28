"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({ id: z.string().uuid() });

export async function deleteAgentAction(formData: FormData) {
  const parsed = inputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) redirect("/agents");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "agent:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    const before = await tx.agent.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        nome: true,
        slug: true,
        departmentId: true,
        status: true,
        currentVersionId: true,
      },
    });
    if (!before) return;

    // Zera currentVersionId pra contornar FK Restrict; AgentVersion CASCADE.
    await tx.agent.update({
      where: { id: parsed.data.id },
      data: { currentVersionId: null },
    });
    await tx.agent.delete({ where: { id: parsed.data.id } });

    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "agent.delete",
        entityType: "agent",
        entityId: before.id,
        before,
      },
    );
  });

  redirect("/agents");
}
