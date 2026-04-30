import { withTenantContext } from "@/lib/db/tenant-context";

/**
 * Queries de Agent — todas via withTenantContext (RLS).
 */

export async function listAgents(activeTenantId: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.agent.findMany({
      orderBy: [{ nome: "asc" }],
      select: {
        id: true,
        slug: true,
        nome: true,
        descricao: true,
        status: true,
        lastPublishedAt: true,
        currentVersionId: true,
        department: {
          select: { id: true, slug: true, nome: true },
        },
      },
    }),
  );
}

export async function getAgentById(activeTenantId: string, id: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.agent.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        nome: true,
        descricao: true,
        status: true,
        draftState: true,
        currentVersionId: true,
        lastPublishedAt: true,
        departmentId: true,
        department: {
          select: { id: true, slug: true, nome: true },
        },
      },
    }),
  );
}

/**
 * Lista departments minimal pra select de Agent — só id+nome.
 */
export async function listDepartmentOptions(activeTenantId: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.department.findMany({
      orderBy: [{ nome: "asc" }],
      select: { id: true, nome: true },
    }),
  );
}

/**
 * Lista agents minimal pra select (knowledge form, routing rules, etc.).
 * Inclui nome do departamento pra desambiguar agentes com nomes parecidos.
 */
export async function listAgentOptions(activeTenantId: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.agent.findMany({
      orderBy: [{ nome: "asc" }],
      select: {
        id: true,
        nome: true,
        department: { select: { nome: true } },
      },
    }),
  );
}

/**
 * Lista versões publicadas de um agente, mais recente primeiro.
 */
export async function listAgentVersions(activeTenantId: string, agentId: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.agentVersion.findMany({
      where: { agentId },
      orderBy: [{ version: "desc" }],
      select: {
        id: true,
        version: true,
        publishedAt: true,
        changelog: true,
        publishedByAccount: { select: { id: true, nome: true, email: true } },
      },
    }),
  );
}

export type AgentListItem = Awaited<ReturnType<typeof listAgents>>[number];
export type AgentDetail = NonNullable<Awaited<ReturnType<typeof getAgentById>>>;
export type AgentVersionListItem = Awaited<ReturnType<typeof listAgentVersions>>[number];
export type DepartmentOption = Awaited<ReturnType<typeof listDepartmentOptions>>[number];
export type AgentOption = Awaited<ReturnType<typeof listAgentOptions>>[number];
