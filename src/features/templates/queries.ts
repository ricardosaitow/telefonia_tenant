import { withTenantContext } from "@/lib/db/tenant-context";

/**
 * Lista templates de scope=tenant — agrupar por key/locale fica no caller.
 * V1 não exibe templates de outros scopes (sem picker pra department/channel
 * ainda).
 */
export async function listTenantTemplates(activeTenantId: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.messageTemplate.findMany({
      where: { scope: "tenant" },
      orderBy: [{ key: "asc" }, { locale: "asc" }],
      select: {
        id: true,
        key: true,
        locale: true,
        content: true,
        updatedAt: true,
      },
    }),
  );
}
