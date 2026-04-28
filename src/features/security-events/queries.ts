import { withTenantContext } from "@/lib/db/tenant-context";

/**
 * Lista security_events do tenant ativo, mais recentes primeiro.
 *
 * RLS: a policy filtra eventos globais (tenant_id NULL) — esses só são
 * visíveis pra admin Pekiart via prismaAdmin. Aqui (app_user) sempre
 * traz só eventos do tenant.
 *
 * V1: 200 mais recentes, sem filtro de severidade no DB. Filtros + paginação
 * em V1.5 junto com a /audit.
 */
export async function listSecurityEvents(activeTenantId: string, limit = 200) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.securityEvent.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        severity: true,
        category: true,
        eventType: true,
        description: true,
        ipAddress: true,
        userAgent: true,
        metadata: true,
        resolvedAt: true,
        resolutionNote: true,
        createdAt: true,
        account: { select: { id: true, nome: true, email: true } },
      },
    }),
  );
}

export type SecurityEventListItem = Awaited<ReturnType<typeof listSecurityEvents>>[number];
