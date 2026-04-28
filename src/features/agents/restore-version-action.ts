"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({
  agentId: z.string().uuid(),
  versionId: z.string().uuid(),
});

export async function restoreAgentVersionAction(formData: FormData) {
  const parsed = inputSchema.safeParse({
    agentId: formData.get("agentId"),
    versionId: formData.get("versionId"),
  });
  if (!parsed.success) redirect("/agents");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "agent:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    const version = await tx.agentVersion.findUnique({
      where: { id: parsed.data.versionId },
      select: {
        agentId: true,
        version: true,
        systemPrompt: true,
        params: true,
        toolsSnapshot: true,
      },
    });
    if (!version || version.agentId !== parsed.data.agentId) return;

    await tx.agent.update({
      where: { id: parsed.data.agentId },
      data: {
        draftState: {
          systemPrompt: version.systemPrompt,
          params: version.params as Prisma.InputJsonValue,
          toolsConfig: version.toolsSnapshot as Prisma.InputJsonValue,
        },
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
        action: "agent.restore",
        entityType: "agent",
        entityId: parsed.data.agentId,
        after: { restoredFromVersion: version.version },
      },
    );
  });

  redirect(`/agents/${parsed.data.agentId}`);
}
