import type { Prisma } from "@/generated/prisma/client";

/**
 * Publica nova AgentVersion a partir do draftState atual do Agent (D005).
 *
 * Fluxo:
 *  1. Lê Agent (com versions ordenadas) dentro da TX.
 *  2. Calcula próxima version (max + 1).
 *  3. Cria AgentVersion (snapshot imutável).
 *  4. Atualiza Agent: currentVersionId, lastPublishedAt, status=production.
 *
 * Caller é responsável pelo `withTenantContext` (RLS). Recebe TX pra
 * encadear com auditoria/notificações futuras.
 *
 * Lança Error se draft inválido (sem systemPrompt). Validação extensa
 * (Zod) fica nas Server Actions; aqui só guarda mínima pra evitar
 * publish corrompido.
 */
export type PublishAgentResult = {
  versionId: string;
  version: number;
};

export async function publishAgentInTx(
  tx: Prisma.TransactionClient,
  input: {
    agentId: string;
    tenantId: string;
    publishedByAccountId: string;
    changelog?: string | undefined;
  },
): Promise<PublishAgentResult> {
  const agent = await tx.agent.findUnique({
    where: { id: input.agentId },
    select: {
      id: true,
      tenantId: true,
      draftState: true,
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        select: { version: true },
      },
    },
  });
  if (!agent) {
    throw new Error("agent_not_found");
  }
  if (agent.tenantId !== input.tenantId) {
    // Defesa em profundidade — RLS já filtra, mas explícito ajuda quem ler.
    throw new Error("tenant_mismatch");
  }

  const draft = (agent.draftState ?? {}) as {
    systemPrompt?: string;
    params?: Record<string, unknown>;
    toolsConfig?: unknown[];
  };
  if (typeof draft.systemPrompt !== "string" || draft.systemPrompt.trim().length === 0) {
    throw new Error("draft_invalid_system_prompt");
  }

  const nextVersion = (agent.versions[0]?.version ?? 0) + 1;

  const created = await tx.agentVersion.create({
    data: {
      agentId: agent.id,
      tenantId: agent.tenantId,
      version: nextVersion,
      publishedByAccountId: input.publishedByAccountId,
      systemPrompt: draft.systemPrompt,
      params: (draft.params ?? {}) as Prisma.InputJsonValue,
      toolsSnapshot: (draft.toolsConfig ?? []) as Prisma.InputJsonValue,
      knowledgeSnapshot: [] as unknown as Prisma.InputJsonValue,
      changelog: input.changelog ?? null,
    },
    select: { id: true, version: true },
  });

  await tx.agent.update({
    where: { id: agent.id },
    data: {
      currentVersionId: created.id,
      lastPublishedAt: new Date(),
      status: "production",
    },
  });

  return { versionId: created.id, version: created.version };
}
