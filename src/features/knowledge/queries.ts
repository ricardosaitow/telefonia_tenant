import { withTenantContext } from "@/lib/db/tenant-context";

/**
 * Confirma que `scopeRefId` aponta pra entidade existente do tenant ativo
 * conforme o `scope`. Para `scope=tenant` (ou refId vazio), retorna true sem
 * tocar o DB. Usado pelas actions create/update de KnowledgeSource pra
 * impedir vínculo cruzado de tenant (RLS já bloqueia, mas validamos cedo
 * pra dar erro semântico bonito ao user).
 */
export async function assertScopeRefValid(
  activeTenantId: string,
  scope: "tenant" | "department" | "agent",
  scopeRefId: string | undefined | null,
): Promise<boolean> {
  if (scope === "tenant") return true;
  if (!scopeRefId) return false;
  return withTenantContext(activeTenantId, async (tx) => {
    if (scope === "department") {
      const d = await tx.department.findUnique({
        where: { id: scopeRefId },
        select: { id: true },
      });
      return !!d;
    }
    const a = await tx.agent.findUnique({
      where: { id: scopeRefId },
      select: { id: true },
    });
    return !!a;
  });
}

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
 * Fontes de conhecimento que um Agent específico recebe via cascata por scope.
 * Reproduz a regra de retrieval do data plane (ontologia §8):
 *   tenant ∪ department(do agente) ∪ agent
 *
 * Usado pra UI mostrar ao user o que efetivamente cai pra este agente.
 * RLS já filtra por tenant; aqui só compomos OR de scope/scopeRefId.
 */
export async function listKnowledgeForAgent(
  activeTenantId: string,
  agentId: string,
  departmentId: string,
) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.knowledgeSource.findMany({
      where: {
        OR: [
          { scope: "tenant" },
          { scope: "department", scopeRefId: departmentId },
          { scope: "agent", scopeRefId: agentId },
        ],
      },
      orderBy: [{ scope: "asc" }, { nome: "asc" }],
      select: {
        id: true,
        nome: true,
        descricao: true,
        scope: true,
        scopeRefId: true,
        tipo: true,
        status: true,
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
export type AgentKnowledgeCascadeItem = Awaited<ReturnType<typeof listKnowledgeForAgent>>[number];
export type AgentToolItem = Awaited<ReturnType<typeof listAgentTools>>[number];
