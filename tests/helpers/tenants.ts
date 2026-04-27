/**
 * asTenant(tenantId, fn) -- equivalente teste de withTenantContext().
 *
 * Roda uma transacao no client `app_user` (RLS aplicada) e seta
 * app.current_tenant via set_config(... , true). Usado em tests/rls/* pra
 * validar que tenant B nao enxerga/altera/apaga registros de tenant A.
 *
 * asMigrator(fn) -- escopo "fora de tenant" (superuser, BYPASSRLS).
 * Usado em factories pra criar fixtures sem precisar de tenant context.
 */

import type { Prisma } from "@/generated/prisma/client";

import { appPrisma, migratorPrisma } from "./test-client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function asTenant<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!UUID_RE.test(tenantId)) {
    throw new Error(`asTenant: tenantId nao eh UUID valido: ${JSON.stringify(tenantId)}`);
  }
  return appPrisma().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`;
    return fn(tx);
  });
}

/**
 * Roda fn dentro do client com BYPASSRLS (postgres superuser).
 * Nao usar em testes de RLS -- so em factories / setup.
 */
export async function asMigrator<T>(
  fn: (client: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return migratorPrisma().$transaction(fn);
}
