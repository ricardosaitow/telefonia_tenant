import { withTenantContext } from "@/lib/db/tenant-context";

export async function listRoutingRulesByChannel(activeTenantId: string, channelId: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.routingRule.findMany({
      where: { channelId },
      orderBy: [{ prioridade: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        tipo: true,
        prioridade: true,
        targetDepartmentId: true,
        targetAgentId: true,
        targetRoutingRuleId: true,
        targetDepartment: { select: { id: true, nome: true } },
        targetAgent: { select: { id: true, nome: true } },
      },
    }),
  );
}

/**
 * Departments + agents do tenant ativo pra select de target. Retorna
 * formato achatado pra UI consumir como lista única com prefixo.
 */
export async function listRoutingTargets(activeTenantId: string) {
  return withTenantContext(activeTenantId, async (tx) => {
    const [departments, agents] = await Promise.all([
      tx.department.findMany({
        orderBy: [{ nome: "asc" }],
        select: { id: true, nome: true },
      }),
      tx.agent.findMany({
        orderBy: [{ nome: "asc" }],
        select: { id: true, nome: true, department: { select: { nome: true } } },
      }),
    ]);
    return { departments, agents };
  });
}

export type RoutingRuleListItem = Awaited<ReturnType<typeof listRoutingRulesByChannel>>[number];
