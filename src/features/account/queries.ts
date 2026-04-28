import { prismaAdmin } from "@/lib/db/admin-client";

/**
 * Account é GLOBAL (D004) — sem RLS. Usa prismaAdmin pra ficar explícito
 * que é uma query sem contexto de tenant. Filtra por id (próprio user).
 */
export async function getAccountById(accountId: string) {
  return prismaAdmin.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      email: true,
      nome: true,
      locale: true,
      mfaEnabled: true,
      lastLoginAt: true,
      createdAt: true,
      memberships: {
        where: { status: "active" },
        select: {
          id: true,
          globalRole: true,
          tenant: { select: { id: true, slug: true, nomeFantasia: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
}
