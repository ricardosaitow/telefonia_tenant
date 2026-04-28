import { withTenantContext } from "@/lib/db/tenant-context";

/**
 * Lista membros (TenantMembership) do tenant ativo, com Account joinada.
 * Mostra todos: ativos, convidados (invited), desativados.
 */
export async function listMembers(activeTenantId: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.tenantMembership.findMany({
      orderBy: [{ status: "asc" }, { joinedAt: { sort: "desc", nulls: "last" } }],
      select: {
        id: true,
        globalRole: true,
        status: true,
        joinedAt: true,
        lastActiveAt: true,
        account: { select: { id: true, email: true, nome: true } },
      },
    }),
  );
}

export type MemberListItem = Awaited<ReturnType<typeof listMembers>>[number];
