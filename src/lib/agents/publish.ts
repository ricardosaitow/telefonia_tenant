import type { Prisma } from "@/generated/prisma/client";

import { parseDraftState, validToolKeys } from "./draft-state-schema";
import { renderSystemPrompt } from "./render-prompt";
import { type ToolKey, TOOLS_CATALOG } from "./tools-catalog";

/**
 * Publica nova AgentVersion a partir do draftState atual do Agent (D005).
 *
 * Fluxo:
 *  1. Lê Agent + Tenant.nomeFantasia + KnowledgeSources scope=ready.
 *  2. Renderiza systemPrompt via renderSystemPrompt(draftState, ...).
 *  3. Snapshot de tools (key + label + criterio + integração).
 *  4. Snapshot de knowledge (id + nome + descricao).
 *  5. Cria AgentVersion (imutável) com next version (max + 1).
 *  6. Atualiza Agent: currentVersionId, lastPublishedAt, status=production.
 *
 * Caller é responsável pelo `withTenantContext` (RLS). Recebe TX pra
 * encadear com auditoria/notificações futuras.
 *
 * Lança Error se render falhar (draft sem prompt nem template válido).
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
      nome: true,
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

  const tenant = await tx.tenant.findUnique({
    where: { id: agent.tenantId },
    select: { nomeFantasia: true },
  });
  if (!tenant) {
    throw new Error("tenant_not_found");
  }

  // Knowledge sources visíveis: status=ready (filtra uploading/indexing/error).
  // Cascata por scope (tenant/department/agent) é responsabilidade do runtime
  // — o snapshot guarda TODOS pra que rollback de versão preserve a foto.
  const knowledgeSources = await tx.knowledgeSource.findMany({
    where: { tenantId: agent.tenantId, status: "ready" },
    select: {
      id: true,
      nome: true,
      descricao: true,
      scope: true,
      scopeRefId: true,
    },
  });

  const draft = parseDraftState(agent.draftState);

  // Renderiza prompt — falha aqui = draft inválido (lança).
  const renderedPrompt = renderSystemPrompt({
    agent: { nome: agent.nome },
    tenant: { nomeFantasia: tenant.nomeFantasia },
    knowledge: knowledgeSources.map((k) => ({
      nome: k.nome,
      descricao: k.descricao ?? null,
    })),
    draftState: agent.draftState,
  });

  // Snapshot de tools — captura state completo no momento do publish.
  const toolKeys = validToolKeys(
    draft.toolsEnabled,
    Object.keys(TOOLS_CATALOG) as readonly ToolKey[],
  );
  const toolsSnapshot = toolKeys.map((k) => ({
    key: k,
    label: TOOLS_CATALOG[k].label,
    criterioUso: TOOLS_CATALOG[k].criterioUso,
    requiresIntegration: TOOLS_CATALOG[k].requiresIntegration,
  }));

  const knowledgeSnapshot = knowledgeSources.map((k) => ({
    id: k.id,
    nome: k.nome,
    descricao: k.descricao,
    scope: k.scope,
    scopeRefId: k.scopeRefId,
  }));

  const nextVersion = (agent.versions[0]?.version ?? 0) + 1;

  const created = await tx.agentVersion.create({
    data: {
      agentId: agent.id,
      tenantId: agent.tenantId,
      version: nextVersion,
      publishedByAccountId: input.publishedByAccountId,
      systemPrompt: renderedPrompt,
      params: draft.params as Prisma.InputJsonValue,
      toolsSnapshot: toolsSnapshot as unknown as Prisma.InputJsonValue,
      knowledgeSnapshot: knowledgeSnapshot as unknown as Prisma.InputJsonValue,
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
