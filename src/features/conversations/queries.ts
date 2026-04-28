import { withTenantContext } from "@/lib/db/tenant-context";

/**
 * Lista conversations do tenant ativo, mais recentes primeiro. V1 sem
 * paginação UI — limit fixo. Filtros + paginação ficam pra V1.5 quando
 * volume justificar.
 */
export async function listConversations(activeTenantId: string, limit = 100) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.conversation.findMany({
      orderBy: [{ startedAt: "desc" }],
      take: limit,
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        status: true,
        durationSeconds: true,
        customerIdentifier: true,
        summary: true,
        assistanceMode: true,
        channel: { select: { id: true, tipo: true, nomeAmigavel: true } },
        currentAgent: { select: { id: true, nome: true } },
        currentDepartment: { select: { id: true, nome: true } },
      },
    }),
  );
}

export type ConversationListItem = Awaited<ReturnType<typeof listConversations>>[number];
