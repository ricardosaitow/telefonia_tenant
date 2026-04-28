import type { Prisma, Tenant } from "@/generated/prisma/client";
import { makeUniqueTenantSlug } from "@/lib/auth/slug";

export type CreateTenantWithOwnerInput = {
  accountId: string;
  nomeTenant: string;
  locale?: string | undefined;
};

/**
 * Helper compartilhado: cria Tenant em status "trial" + Membership owner ativa.
 *
 * Recebe um `tx` pra que o caller controle a transação (atomicidade obrigatória
 * com qualquer outra escrita — Account no signup, audit log no futuro, etc).
 *
 * Caller é responsável por usar TX que tenha BYPASSRLS (prismaAdmin) — Tenant +
 * TenantMembership têm RLS, INSERT sem contexto exige bypass. Documentado em
 * `src/lib/db/admin-client.ts`.
 */
export async function createTenantWithOwnerInTx(
  tx: Prisma.TransactionClient,
  input: CreateTenantWithOwnerInput,
): Promise<Tenant> {
  const tenant = await tx.tenant.create({
    data: {
      slug: makeUniqueTenantSlug(input.nomeTenant),
      nomeFantasia: input.nomeTenant,
      defaultLocale: input.locale ?? "pt-BR",
      status: "trial",
    },
  });

  await tx.tenantMembership.create({
    data: {
      tenantId: tenant.id,
      accountId: input.accountId,
      globalRole: "tenant_owner",
      status: "active",
      joinedAt: new Date(),
    },
  });

  return tenant;
}
