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

export type AgentListItem = Awaited<ReturnType<typeof listAgents>>[number];
export type AgentDetail = NonNullable<Awaited<ReturnType<typeof getAgentById>>>;
export type DepartmentOption = Awaited<ReturnType<typeof listDepartmentOptions>>[number];
