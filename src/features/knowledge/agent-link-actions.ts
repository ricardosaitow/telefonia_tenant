"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const linkSchema = z.object({
  agentId: z.string().uuid(),
  knowledgeSourceId: z.string().uuid(),
});

export async function addAgentKnowledgeAction(formData: FormData) {
  const parsed = linkSchema.safeParse({
    agentId: formData.get("agentId"),
    knowledgeSourceId: formData.get("knowledgeSourceId"),
  });
  if (!parsed.success) redirect("/agents");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "agent:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    // Verifica que agent + knowledge_source pertencem ao tenant ativo
    // (RLS já garante, mas explícito ajuda quem ler).
    const [agent, ks] = await Promise.all([
      tx.agent.findUnique({ where: { id: parsed.data.agentId }, select: { id: true } }),
      tx.knowledgeSource.findUnique({
        where: { id: parsed.data.knowledgeSourceId },
        select: { id: true },
      }),
    ]);
    if (!agent || !ks) return;

    // Idempotente: se já existe, ignora (PK composta).
    try {
      await tx.agentKnowledge.create({
        data: {
          tenantId: ctx.activeTenantId,
          agentId: parsed.data.agentId,
          knowledgeSourceId: parsed.data.knowledgeSourceId,
        },
      });
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return; // já vinculado.
      }
      throw err;
    }

    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "agent_knowledge.add",
        entityType: "agent",
        entityId: parsed.data.agentId,
        after: { knowledgeSourceId: parsed.data.knowledgeSourceId },
      },
    );
  });

  redirect(`/agents/${parsed.data.agentId}`);
}

export async function removeAgentKnowledgeAction(formData: FormData) {
  const parsed = linkSchema.safeParse({
    agentId: formData.get("agentId"),
    knowledgeSourceId: formData.get("knowledgeSourceId"),
  });
  if (!parsed.success) redirect("/agents");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "agent:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    await tx.agentKnowledge.deleteMany({
      where: {
        agentId: parsed.data.agentId,
        knowledgeSourceId: parsed.data.knowledgeSourceId,
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
        action: "agent_knowledge.remove",
        entityType: "agent",
        entityId: parsed.data.agentId,
        before: { knowledgeSourceId: parsed.data.knowledgeSourceId },
      },
    );
  });

  redirect(`/agents/${parsed.data.agentId}`);
}
