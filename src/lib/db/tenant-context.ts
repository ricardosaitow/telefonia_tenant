/**
 * Helper de tenant context (D002).
 *
 * Toda query que toca tabela com tenant_id deve rodar dentro de
 * withTenantContext(tenantId, fn). A funcao envolve a operacao numa transacao
 * Prisma e seta `app.current_tenant` via set_config('...', ..., true) -- o
 * terceiro arg = is_local = true significa "vale so na transacao atual",
 * equivalente a SET LOCAL mas parametrizavel.
 *
 * RLS policies em prisma/migrations/*_init_account_tenant_membership/migration.sql
 * checam `current_setting('app.current_tenant', true)::uuid`. Sem o set,
 * a setting eh NULL -> predicate falha -> 0 rows (fail closed).
 *
 * Regras (rules/multi-tenant.md, rules/database.md):
 *   - tenantId DEVE ser validado como UUID antes do set_config (defesa em
 *     profundidade contra SQL injection mesmo via parametro).
 *   - Usar template tag $executeRaw (parametrizado), NAO $executeRawUnsafe
 *     com interpolacao de string.
 */

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class InvalidTenantIdError extends Error {
  constructor(value: string) {
    super(`tenantId nao eh UUID valido: ${JSON.stringify(value)}`);
    this.name = "InvalidTenantIdError";
  }
}

export async function withTenantContext<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!UUID_RE.test(tenantId)) {
    throw new InvalidTenantIdError(tenantId);
  }

  return prisma.$transaction(async (tx) => {
    // set_config(..., is_local=true) -> escopo da transacao apenas.
    // Valor do tenantId vai como parametro $1 (parametrizado, nao concatenado).
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`;
    return fn(tx);
  });
}
