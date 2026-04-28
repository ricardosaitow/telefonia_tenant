"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({ id: z.string().uuid() });

/**
 * Delete Agent. Owner/admin/supervisor only.
 *
 * AgentVersion → onDelete Cascade (ok). Agent.currentVersionId →
 * onDelete: Restrict — mas FK é desse Agent pra AgentVersion, não o
 * inverso. Quando deletamos Agent, AgentVersion CASCADE remove (criadas
 * pra esse agent). Sem orfãos.
 */
export async function deleteAgentAction(formData: FormData) {
  const parsed = inputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) redirect("/agents");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "agent:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    // Agent tem FK currentVersionId pra AgentVersion (ON DELETE Restrict).
    // Pra deletar limpo: 1) zera currentVersionId; 2) deleta agent (cascata
    // remove AgentVersion[]).
    await tx.agent.updateMany({
      where: { id: parsed.data.id },
      data: { currentVersionId: null },
    });
    await tx.agent.deleteMany({ where: { id: parsed.data.id } });
  });

  redirect("/agents");
}
