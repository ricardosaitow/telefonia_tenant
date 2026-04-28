import { withTenantContext } from "@/lib/db/tenant-context";

export async function listKnowledgeSources(activeTenantId: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.knowledgeSource.findMany({
      orderBy: [{ nome: "asc" }],
      select: {
        id: true,
        nome: true,
        descricao: true,
        scope: true,
        scopeRefId: true,
        tipo: true,
        status: true,
        language: true,
        chunkCount: true,
        lastIndexedAt: true,
        createdAt: true,
      },
    }),
  );
}

export async function getKnowledgeSourceById(activeTenantId: string, id: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.knowledgeSource.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        descricao: true,
        scope: true,
        scopeRefId: true,
        tipo: true,
        status: true,
        language: true,
        chunkCount: true,
        lastIndexedAt: true,
        sourceMetadata: true,
        storageRef: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  );
}

/**
 * Knowledge sources vinculados a um agent específico (para UI Agent edit).
 */
export async function listAgentKnowledge(activeTenantId: string, agentId: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.agentKnowledge.findMany({
      where: { agentId },
      orderBy: [{ knowledgeSource: { nome: "asc" } }],
      select: {
        agentId: true,
        knowledgeSourceId: true,
        knowledgeSource: {
          select: { id: true, nome: true, scope: true, tipo: true, status: true },
        },
      },
    }),
  );
}

/**
 * Tools habilitadas num agent (pra UI Agent edit).
 */
export async function listAgentTools(activeTenantId: string, agentId: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.agentTool.findMany({
      where: { agentId },
      orderBy: [{ toolKey: "asc" }],
      select: {
        id: true,
        toolKey: true,
        enabled: true,
        config: true,
        createdAt: true,
      },
    }),
  );
}

export type KnowledgeSourceListItem = Awaited<ReturnType<typeof listKnowledgeSources>>[number];
export type KnowledgeSourceDetail = NonNullable<Awaited<ReturnType<typeof getKnowledgeSourceById>>>;
export type AgentKnowledgeItem = Awaited<ReturnType<typeof listAgentKnowledge>>[number];
export type AgentToolItem = Awaited<ReturnType<typeof listAgentTools>>[number];
