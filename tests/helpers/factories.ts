/**
 * Builders de fixtures pros testes. Tudo via asMigrator (BYPASSRLS) pra que
 * factory sirva pros dois lados (cria registros de tenant A E tenant B sem
 * precisar trocar de contexto).
 *
 * Convencoes:
 *   - emails / slugs sempre unicos (UUID embutido) -- evita colisao em
 *     reuso de container entre test files.
 *   - retorna o registro completo do Prisma, sem omissao, pra teste poder
 *     usar campos derivados (id, createdAt).
 */

import type { Account, Tenant, TenantMembership } from "@/generated/prisma/client";

import { asMigrator } from "./tenants";

export interface MakeAccountOverrides {
  email?: string;
  nome?: string;
  passwordHash?: string;
}

export async function makeAccount(overrides: MakeAccountOverrides = {}): Promise<Account> {
  const id = crypto.randomUUID();
  return asMigrator((tx) =>
    tx.account.create({
      data: {
        email: overrides.email ?? `acc-${id}@test.local`,
        nome: overrides.nome ?? `Account ${id.slice(0, 8)}`,
        passwordHash: overrides.passwordHash ?? "argon2id$placeholder",
      },
    }),
  );
}

export interface MakeTenantOverrides {
  slug?: string;
  nomeFantasia?: string;
}

export async function makeTenant(overrides: MakeTenantOverrides = {}): Promise<Tenant> {
  const id = crypto.randomUUID();
  return asMigrator((tx) =>
    tx.tenant.create({
      data: {
        slug: overrides.slug ?? `tenant-${id.slice(0, 12)}`,
        nomeFantasia: overrides.nomeFantasia ?? `Tenant ${id.slice(0, 8)}`,
      },
    }),
  );
}

export interface MakeMembershipInput {
  tenantId: string;
  accountId: string;
  role?: "tenant_owner" | "tenant_admin" | "department_supervisor" | "operator" | "auditor";
  status?: "invited" | "active" | "disabled";
}

export async function makeMembership(input: MakeMembershipInput): Promise<TenantMembership> {
  return asMigrator((tx) =>
    tx.tenantMembership.create({
      data: {
        tenantId: input.tenantId,
        accountId: input.accountId,
        globalRole: input.role ?? "tenant_admin",
        status: input.status ?? "active",
        joinedAt: new Date(),
      },
    }),
  );
}
