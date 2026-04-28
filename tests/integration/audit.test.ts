/**
 * Integration tests do helper recordAuditInTx (lib/audit/record.ts).
 *
 * Cobre o write de AuditLog no caminho real do runtime: app_user (RLS) +
 * withTenantContext. Sem testar Server Actions diretamente (importam
 * NextAuth, que não resolve em vitest puro).
 */

import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { recordAuditInTx } from "@/lib/audit/record";

import { makeAccount, makeMembership, makeTenant } from "../helpers/factories";
import { asMigrator, asTenant } from "../helpers/tenants";

afterAll(async () => {
  await asMigrator(async (tx) => {
    await tx.auditLog.deleteMany();
    await tx.tenantMembership.deleteMany();
    await tx.tenant.deleteMany();
    await tx.account.deleteMany();
  });
});

describe("recordAuditInTx", () => {
  it("grava AuditLog dentro de withTenantContext (app_user + RLS)", async () => {
    const tenant = await makeTenant();
    const account = await makeAccount();
    const membership = await makeMembership({
      tenantId: tenant.id,
      accountId: account.id,
      role: "tenant_admin",
    });

    const entityId = randomUUID();
    await asTenant(tenant.id, (tx) =>
      recordAuditInTx(
        tx,
        {
          tenantId: tenant.id,
          accountId: account.id,
          membershipId: membership.id,
        },
        {
          action: "department.create",
          entityType: "department",
          entityId,
          after: { id: entityId, nome: "Comercial" },
        },
      ),
    );

    // Confirma via migrator (bypass RLS).
    const logs = await asMigrator((tx) =>
      tx.auditLog.findMany({ where: { tenantId: tenant.id, entityId } }),
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]?.action).toBe("department.create");
    expect(logs[0]?.entityType).toBe("department");
    expect(logs[0]?.accountId).toBe(account.id);
    expect(logs[0]?.membershipId).toBe(membership.id);
    expect(logs[0]?.after).toEqual({ id: entityId, nome: "Comercial" });
    expect(logs[0]?.before).toBeNull();
  });

  it("serializa before+after pra update; ambos preservados", async () => {
    const tenant = await makeTenant();
    const account = await makeAccount();
    const membership = await makeMembership({
      tenantId: tenant.id,
      accountId: account.id,
    });

    const entityId = randomUUID();
    await asTenant(tenant.id, (tx) =>
      recordAuditInTx(
        tx,
        { tenantId: tenant.id, accountId: account.id, membershipId: membership.id },
        {
          action: "agent.update",
          entityType: "agent",
          entityId,
          before: { nome: "Antigo" },
          after: { nome: "Novo" },
        },
      ),
    );

    const log = await asMigrator((tx) =>
      tx.auditLog.findFirst({ where: { tenantId: tenant.id, entityId } }),
    );
    expect(log?.before).toEqual({ nome: "Antigo" });
    expect(log?.after).toEqual({ nome: "Novo" });
  });

  it("aceita membershipId opcional (null pra ações de sistema)", async () => {
    const tenant = await makeTenant();
    const account = await makeAccount();
    await makeMembership({ tenantId: tenant.id, accountId: account.id });

    const entityId = randomUUID();
    await asTenant(tenant.id, (tx) =>
      recordAuditInTx(
        tx,
        { tenantId: tenant.id, accountId: account.id },
        {
          action: "system.cleanup",
          entityType: "system",
          entityId,
        },
      ),
    );

    const log = await asMigrator((tx) =>
      tx.auditLog.findFirst({ where: { tenantId: tenant.id, entityId } }),
    );
    expect(log?.membershipId).toBeNull();
    expect(log?.accountId).toBe(account.id);
  });
});
