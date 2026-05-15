import { cookies } from "next/headers";

import { prismaAdmin } from "@/lib/db/admin-client";
import { ACTIVE_TENANT_COOKIE } from "@/lib/rbac";

/**
 * Active-tenant — Fase 3 do plano [[sso-pekiart-logto]].
 *
 * O conceito de "tenant ativo" agora vive num **cookie**
 * (`portal-active-tenant`) em vez de coluna `activeTenantId` na tabela
 * Session (que foi descontinuada junto com Auth.js).
 *
 * Memberships do user vêm das **claims do Logto** (`organizations`), não
 * mais da tabela TenantMembership.
 *
 * `setActiveTenant(_sessionToken, tenantId)` mantém o primeiro arg
 * (ignorado) por compat com call sites antigos. Quando o lint pegar todos
 * os call sites, simplificamos a assinatura.
 */
export async function setActiveTenant(
  _sessionToken: string | null,
  tenantId: string | null,
): Promise<void> {
  const cookieStore = await cookies();
  if (tenantId === null) {
    cookieStore.delete(ACTIVE_TENANT_COOKIE);
    return;
  }
  cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    // 30 dias — mesma vida útil do refresh token do Logto.
    maxAge: 60 * 60 * 24 * 30,
  });
}

/**
 * Lista tenants do account baseado nos org IDs do Logto.
 *
 * **Important shape change:** assinatura mudou de `(accountId: string)`
 * pra `(orgIds: string[])` porque a fonte de membership virou o JWT
 * Logto, não a tabela TenantMembership.
 *
 * Usa `prismaAdmin` (BYPASS RLS) — query "pré-tenant" porque o user ainda
 * não selecionou um tenant pra setar `app.current_tenant`. Fronteira de
 * segurança: `where: { id: { in: orgIds } }` com `orgIds` vindo da claim
 * validada pelo Logto.
 *
 * `globalRole` antes vinha de TenantMembership. Agora vem das claims —
 * usar `assertSessionAndMembership()` no rbac pra obter (já leva conta do
 * tenant ativo). Aqui devolvemos `null` por shape compat.
 */
export async function listAccountMemberships(logtoOrgIds: string[]) {
  if (logtoOrgIds.length === 0) return [];
  // Lookup por logtoOrgId (string Logto) → Tenant.id (UUID interno).
  // Migration `add_logto_org_id` adicionou a coluna. Ver docs/migration-logto-org-ids.md.
  const tenants = await prismaAdmin.tenant.findMany({
    where: { logtoOrgId: { in: logtoOrgIds } },
    select: {
      id: true,
      slug: true,
      nomeFantasia: true,
      status: true,
      logtoOrgId: true,
    },
  });

  return tenants.map((tenant) => ({
    id: tenant.id,
    tenantId: tenant.id,
    logtoOrgId: tenant.logtoOrgId,
    globalRole: null as null,
    lastActiveAt: null as Date | null,
    tenant,
  }));
}

export type AccountMembership = Awaited<ReturnType<typeof listAccountMemberships>>[number];
