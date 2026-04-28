import { prisma } from "@/lib/db/client";

/**
 * Atualiza o tenant ativo da sessão (atomicamente). Quem chama precisa ter
 * verificado antes que o accountId tem membership ATIVA no tenantId — fazer
 * isso aqui acoplaria demais; deixa pra Server Action que sabe o contexto.
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
 * Lista memberships ATIVOS do account, com o Tenant joinado, ordenados pra UI
 * (último ativo primeiro). Cada item carrega o suficiente pra renderizar o picker.
 */
export async function listAccountMemberships(accountId: string) {
  return prisma.tenantMembership.findMany({
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
