import { prismaAdmin } from "@/lib/db/admin-client";
import { prisma } from "@/lib/db/client";

/**
 * Atualiza o tenant ativo da sessão. `sessions` NÃO tem RLS (por-account),
 * então usa `prisma` (app_user) normal — `where: { sessionToken }` é a
 * fronteira de segurança.
 *
 * Passar `tenantId = null` desativa a seleção (volta pra picker).
 */
export async function setActiveTenant(
  sessionToken: string,
  tenantId: string | null,
): Promise<void> {
  await prisma.session.updateMany({
    where: { sessionToken, revokedAt: null },
    data: { activeTenantId: tenantId },
  });
}

/**
 * Lista memberships ATIVOS do account, com Tenant joinado, ordenados pra UI.
 *
 * !!! USA prismaAdmin (BYPASS RLS) !!!
 *
 * Isso é uma query pré-tenant (account-scoped) — não há `app.current_tenant`
 * pra setar antes (o user ainda nem escolheu o tenant; é justamente este
 * lookup que viabiliza a escolha). Se rodar como app_user, a policy de
 * `tenant_memberships` (`tenant_id = current_setting('app.current_tenant')`)
 * filtra fora todas as memberships -> retorna [] sempre.
 *
 * Fronteira de segurança: `where: { accountId }`. Caller é responsável por
 * passar SOMENTE o accountId da sessão validada (`assertSession`).
 */
export async function listAccountMemberships(accountId: string) {
  return prismaAdmin.tenantMembership.findMany({
    where: { accountId, status: "active" },
    select: {
      id: true,
      tenantId: true,
      globalRole: true,
      lastActiveAt: true,
      tenant: {
        select: {
          id: true,
          slug: true,
          nomeFantasia: true,
          status: true,
        },
      },
    },
    orderBy: [{ lastActiveAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });
}

export type AccountMembership = Awaited<ReturnType<typeof listAccountMemberships>>[number];
