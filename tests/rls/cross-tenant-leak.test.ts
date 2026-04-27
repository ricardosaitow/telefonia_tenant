/**
 * SUITE BLOQUEANTE -- anti-cross-tenant.
 *
 * Invariante: usuario logado em tenant B NUNCA enxerga, atualiza ou apaga
 * registros de tenant A. Validado por Postgres RLS (D002), nao por filtro
 * em codigo.
 *
 * Toda nova model com `tenantId` exige caso aqui (rules/database.md,
 * rules/multi-tenant.md, rules/testing-portal.md). Falha bloqueia merge
 * (`pnpm test:rls` no pre-push hook + verify).
 *
 * Cobertura desta migration inicial:
 *   - tenants            (RLS no `id`)
 *   - tenant_memberships (RLS no `tenant_id`)
 *
 * accounts e GLOBAL (D004) -- NAO tem RLS, nao entra aqui.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Account, Tenant, TenantMembership } from "@/generated/prisma/client";

import { makeAccount, makeMembership, makeTenant } from "../helpers/factories";
import { asTenant } from "../helpers/tenants";
import { appPrisma, migratorPrisma } from "../helpers/test-client";

let tenantA: Tenant;
let tenantB: Tenant;
let accountX: Account;
let accountY: Account;
let membershipAX: TenantMembership;

beforeAll(async () => {
  // Setup: 2 tenants distintos, 1 account por tenant, membership cruzada
  // (X em A, Y em B). E suficiente pra exercitar todas as combinacoes.
  tenantA = await makeTenant({ slug: `rls-a-${crypto.randomUUID().slice(0, 8)}` });
  tenantB = await makeTenant({ slug: `rls-b-${crypto.randomUUID().slice(0, 8)}` });
  accountX = await makeAccount();
  accountY = await makeAccount();
  membershipAX = await makeMembership({
    tenantId: tenantA.id,
    accountId: accountX.id,
    role: "tenant_owner",
  });
  await makeMembership({
    tenantId: tenantB.id,
    accountId: accountY.id,
    role: "tenant_owner",
  });
});

afterAll(async () => {
  // Limpa pra nao poluir runs subsequentes do mesmo container.
  // Ordem: memberships (FK) -> tenants -> accounts.
  await migratorPrisma().$transaction(async (tx) => {
    await tx.tenantMembership.deleteMany({
      where: { tenantId: { in: [tenantA.id, tenantB.id] } },
    });
    await tx.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
    await tx.account.deleteMany({ where: { id: { in: [accountX.id, accountY.id] } } });
  });
  await appPrisma().$disconnect();
  await migratorPrisma().$disconnect();
});

describe("RLS: tenants", () => {
  it("tenant B nao enxerga o registro do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.tenant.findUnique({ where: { id: tenantA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao lista o tenant A em findMany", async () => {
    const list = await asTenant(tenantB.id, (tx) =>
      tx.tenant.findMany({ where: { id: { in: [tenantA.id, tenantB.id] } } }),
    );
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(tenantB.id);
  });

  it("tenant B nao consegue updateMany registro do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.tenant.updateMany({
        where: { id: tenantA.id },
        data: { nomeFantasia: "PWNED" },
      }),
    );
    expect(result.count).toBe(0);

    // Sanity: como migrator (bypass RLS), confirma que A nao foi tocado.
    const reread = await migratorPrisma().tenant.findUnique({ where: { id: tenantA.id } });
    expect(reread?.nomeFantasia).toBe(tenantA.nomeFantasia);
  });

  it("tenant B nao consegue deleteMany registro do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.tenant.deleteMany({ where: { id: tenantA.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().tenant.findUnique({ where: { id: tenantA.id } });
    expect(reread).not.toBeNull();
  });
});

describe("RLS: tenant_memberships", () => {
  it("tenant B nao enxerga membership do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.tenantMembership.findUnique({ where: { id: membershipAX.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao lista memberships do tenant A em findMany", async () => {
    const list = await asTenant(tenantB.id, (tx) =>
      tx.tenantMembership.findMany({
        where: { tenantId: { in: [tenantA.id, tenantB.id] } },
      }),
    );
    // So memberships do tenant B podem aparecer (no caso, a do account Y).
    for (const m of list) {
      expect(m.tenantId).toBe(tenantB.id);
    }
  });

  it("tenant B nao consegue updateMany membership do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.tenantMembership.updateMany({
        where: { id: membershipAX.id },
        data: { status: "disabled" },
      }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().tenantMembership.findUnique({
      where: { id: membershipAX.id },
    });
    expect(reread?.status).toBe("active");
  });

  it("tenant B nao consegue deleteMany membership do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.tenantMembership.deleteMany({ where: { id: membershipAX.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().tenantMembership.findUnique({
      where: { id: membershipAX.id },
    });
    expect(reread).not.toBeNull();
  });
});

describe("RLS: contexto ausente (defesa em profundidade)", () => {
  it("sem app.current_tenant setado, tenants devolve 0 rows", async () => {
    // Conectar via app_user SEM passar por asTenant -> sem set_config.
    // current_setting('app.current_tenant', true) retorna NULL ->
    // predicate `id = NULL::uuid` = NULL -> 0 rows. Fail closed.
    const list = await appPrisma().tenant.findMany({
      where: { id: { in: [tenantA.id, tenantB.id] } },
    });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, tenant_memberships devolve 0 rows", async () => {
    const list = await appPrisma().tenantMembership.findMany({
      where: { id: membershipAX.id },
    });
    expect(list).toEqual([]);
  });
});
