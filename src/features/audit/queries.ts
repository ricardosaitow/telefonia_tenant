import { withTenantContext } from "@/lib/db/tenant-context";

/**
 * Lista audit_logs do tenant ativo, mais recentes primeiro. Limit pra MVP V1
 * (sem paginação UI ainda — chega em V1.5 junto com filtros).
 */
export async function listAuditLogs(activeTenantId: string, limit = 100) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.auditLog.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        before: true,
        after: true,
        createdAt: true,
        account: { select: { id: true, nome: true, email: true } },
      },
    }),
  );
}

export type AuditLogListItem = Awaited<ReturnType<typeof listAuditLogs>>[number];
