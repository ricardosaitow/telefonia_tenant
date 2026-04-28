"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { publishAgentInTx } from "@/lib/agents/publish";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({ id: z.string().uuid() });

/**
 * Publica o Agent — cria nova AgentVersion (snapshot do draft) e marca
 * como production. Versão = max + 1 (incremental por Agent).
 *
 * Owner/admin/supervisor only. Falha se draft inválido (sem systemPrompt) —
 * por ora redirect /agents/[id] (UI deveria refletir erro inline em V1.5).
 */
export async function publishAgentAction(formData: FormData) {
  const parsed = inputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) redirect("/agents");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "agent:manage");

  await withTenantContext(ctx.activeTenantId, (tx) =>
    publishAgentInTx(tx, {
      agentId: parsed.data.id,
      tenantId: ctx.activeTenantId,
      publishedByAccountId: ctx.account.id,
    }),
  );

  redirect(`/agents/${parsed.data.id}`);
}
