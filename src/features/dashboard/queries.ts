import { withTenantContext } from "@/lib/db/tenant-context";

/**
 * Métricas resumidas do dashboard. Tudo dentro de um único withTenantContext
 * pra reusar a transação e evitar SET LOCAL repetido.
 *
 * V1 sem agregação por período — só contagens totais. Trends/funil/conversion
 * chegam quando UsageRecord (Ontologia §16) for materializado.
 */

export type DashboardStats = {
  departments: number;
  agentsPublished: number;
  agentsDraft: number;
  channels: number;
  conversationsActive: number;
  conversationsLast24h: number;
  knowledgeSources: number;
  templates: number;
  recentSecurityEvents: number;
  recentConversations: Array<{
    id: string;
    startedAt: Date;
    status: string;
    customerIdentifier: string | null;
    channelTipo: string;
  }>;
};

export async function getDashboardStats(activeTenantId: string): Promise<DashboardStats> {
  return withTenantContext(activeTenantId, async (tx) => {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      departments,
      agentsPublished,
      agentsDraft,
      channels,
      conversationsActive,
      conversationsLast24h,
      knowledgeSources,
      templates,
      recentSecurityEvents,
      recentConversationsRaw,
    ] = await Promise.all([
      tx.department.count(),
      tx.agent.count({ where: { status: "production" } }),
      tx.agent.count({ where: { status: { in: ["draft", "testing"] } } }),
      tx.channel.count(),
      tx.conversation.count({ where: { status: "active" } }),
      tx.conversation.count({ where: { startedAt: { gte: since24h } } }),
      tx.knowledgeSource.count(),
      tx.messageTemplate.count(),
      tx.securityEvent.count({
        where: {
          createdAt: { gte: since7d },
          severity: { in: ["medium", "high", "critical"] },
        },
      }),
      tx.conversation.findMany({
        orderBy: [{ startedAt: "desc" }],
        take: 5,
        select: {
          id: true,
          startedAt: true,
          status: true,
          customerIdentifier: true,
          channel: { select: { tipo: true } },
        },
      }),
    ]);

    return {
      departments,
      agentsPublished,
      agentsDraft,
      channels,
      conversationsActive,
      conversationsLast24h,
      knowledgeSources,
      templates,
      recentSecurityEvents,
      recentConversations: recentConversationsRaw.map((c) => ({
        id: c.id,
        startedAt: c.startedAt,
        status: c.status,
        customerIdentifier: c.customerIdentifier,
        channelTipo: c.channel.tipo,
      })),
    };
  });
}
