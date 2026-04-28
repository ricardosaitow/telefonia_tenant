"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({
  agentId: z.string().uuid(),
  versionId: z.string().uuid(),
});

/**
 * Rollback (D005): copia snapshot de uma AgentVersion antiga pro draftState
 * do Agent. NÃO publica automaticamente — user revisa o draft restaurado e
 * clica "Publicar" pra gerar nova version (incrementada).
 *
 * Owner/admin/supervisor only.
 */
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
  });

  redirect(`/agents/${parsed.data.agentId}`);
}
