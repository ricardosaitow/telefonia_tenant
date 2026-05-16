import { cookies } from "next/headers";
import { cache } from "react";

import { MembershipRole } from "@/generated/prisma/client";
import { ensureAccount, ensureTenantMembership } from "@/lib/auth/shadow-records";
import { prismaAdmin } from "@/lib/db/admin-client";
import { logtoServer } from "@/lib/logto-client";

/**
 * Wrapper cached pro `getLogtoContext` — React 19 paraleliza layout + page
 * render, e o `logtoServer` é singleton que muta `this.storage` em cada
 * chamada. Race condition entre layout (assertSession) e page (também usa
 * assertSession) corrompe o resultado de uma das chamadas (vimos
 * isAuthenticated alternar entre true/false no mesmo request).
 *
 * `React.cache` memoiza POR-REQUEST — a primeira chamada executa, as
 * próximas no mesmo request reusam o resultado sem disparar nova storage
 * inicialization.
 */
const getCachedLogtoContext = cache(async () =>
  logtoServer.getLogtoContext({ fetchUserInfo: false }),
);

/**
 * RBAC do portal — Fase 3 do plano [[sso-pekiart-logto]].
 *
 * Source of truth de identidade: **Logto** (via @logto/next/server-actions).
 * Source of truth de membership de tenant: **claims.organizations** +
 * **claims.organization_roles** do JWT Logto.
 *
 * Shim mantém shape de `AuthContext` (campo `sessionToken` virou
 * `claims.sub` — id estável do user no Logto). 135+ callers continuam
 * funcionando sem mudança.
 *
 * `activeTenantId` agora vem de cookie (`portal-active-tenant`), validado
 * contra `claims.organizations` toda chamada — não confiamos no cookie sem
 * conferir membership ativo no IdP.
 *
 * Mapeamento de roles Logto → MembershipRole (enum legacy do portal):
 *   - `owner`  → tenant_owner
 *   - `admin`  → tenant_admin
 *   - `member` → operator (default)
 *
 * Roles legadas do portal não cobertas pelo Logto template (department_supervisor,
 * auditor) ficam dormentes até criarmos roles correspondentes no Logto admin.
 */

/** Cookie usado pra armazenar o tenant/org selecionado pelo user. */
export const ACTIVE_TENANT_COOKIE = "portal-active-tenant";

export type AuthContext = {
  account: {
    id: string;
    email: string;
    name: string;
  };
  /**
   * Identificador estável do user no Logto (`claims.sub`). Mantido com o
   * nome `sessionToken` por compat com o shape antigo (Auth.js v5). NÃO
   * é mais um random opaco — é o `sub` do JWT.
   */
  sessionToken: string;
  activeTenantId: string | null;
};

export type AuthContextWithTenant = AuthContext & {
  activeTenantId: string;
};

export type AuthContextWithMembership = AuthContextWithTenant & {
  membership: {
    id: string;
    globalRole: MembershipRole;
  };
};

export class UnauthenticatedError extends Error {
  constructor() {
    super("unauthenticated");
    this.name = "UnauthenticatedError";
  }
}

export class TenantNotSelectedError extends Error {
  constructor() {
    super("tenant_not_selected");
    this.name = "TenantNotSelectedError";
  }
}

/**
 * Lê a sessão Logto do request atual e devolve o contexto autenticado.
 * Lança `UnauthenticatedError` se não houver sessão Logto válida.
 *
 * `activeTenantId` vem do cookie `portal-active-tenant`, validado contra
 * `claims.organizations` (user só pode ter como ativo um tenant que ele
 * efetivamente é membro no Logto).
 */
export async function assertSession(): Promise<AuthContext> {
  const ctx = await getCachedLogtoContext();
  if (!ctx.isAuthenticated || !ctx.claims?.sub) {
    throw new UnauthenticatedError();
  }
  const claims = ctx.claims;

  // Shadow Account — find-or-create Account local pelo logtoSub.
  // Garante que ctx.account.id é UUID válido pra FKs downstream
  // (chat_participants, audit_logs, etc).
  const account = await ensureAccount(
    claims.sub,
    claims.email ?? `${claims.username ?? claims.sub}@logto.local`,
    claims.name ?? claims.username ?? "Sem nome",
  );

  // Cookie armazena Tenant.id (UUID interno). Validação: o Tenant precisa
  // ter logtoOrgId apontando pra alguma org listada nas claims do user.
  const cookieStore = await cookies();
  const activeCookie = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? null;
  const orgs = claims.organizations ?? [];

  let activeTenantId: string | null = null;
  if (activeCookie && orgs.length > 0) {
    const tenant = await prismaAdmin.tenant.findUnique({
      where: { id: activeCookie },
      select: { id: true, logtoOrgId: true },
    });
    if (tenant?.logtoOrgId && orgs.includes(tenant.logtoOrgId)) {
      activeTenantId = tenant.id;
    }
  }

  return {
    account: {
      id: account.id,
      email: account.email,
      name: account.nome,
    },
    sessionToken: claims.sub,
    activeTenantId,
  };
}

/**
 * Devolve os IDs das organizations às quais o user pertence no Logto.
 * Usado por páginas pré-tenant (ex: `/tenants`, `/choose-plan`) que precisam
 * descobrir os tenants disponíveis pra escolha.
 *
 * Se user não tem sessão Logto, lança `UnauthenticatedError`.
 */
export async function getOrganizationIds(): Promise<string[]> {
  // Usa o context cached (mesmo que assertSession) — evita uma segunda
  // chamada ao logtoServer que disparou a race condition.
  const ctx = await getCachedLogtoContext();
  if (!ctx.isAuthenticated) {
    throw new UnauthenticatedError();
  }
  return ctx.claims?.organizations ?? [];
}

/**
 * Mapa `<logtoOrgId> → roles[]` extraído das claims do Logto. Útil pra
 * picker que precisa mostrar a role do user em cada tenant.
 *
 * Usa o context cached (mesmo do assertSession).
 */
export async function getOrganizationRolesByOrg(): Promise<Map<string, string[]>> {
  const ctx = await getCachedLogtoContext();
  const map = new Map<string, string[]>();
  for (const claim of ctx.claims?.organization_roles ?? []) {
    const [orgId, role] = claim.split(":");
    if (!orgId || !role) continue;
    map.set(orgId, [...(map.get(orgId) ?? []), role]);
  }
  return map;
}

/**
 * Como `assertSession`, mas exige `activeTenantId`. Lança `TenantNotSelectedError`.
 */
export async function assertSessionWithTenant(): Promise<AuthContextWithTenant> {
  const ctx = await assertSession();
  if (!ctx.activeTenantId) throw new TenantNotSelectedError();
  return { ...ctx, activeTenantId: ctx.activeTenantId };
}

/**
 * Carrega membership (role) do user no tenant ativo. Vem das claims do
 * Logto (`organization_roles`) — não toca mais a tabela TenantMembership.
 *
 * Se user não tiver role pra essa org (claim ausente), lança
 * `TenantNotSelectedError` (estado inconsistente — cookie aponta pra org
 * que user não tem role lá).
 */
export async function assertSessionAndMembership(): Promise<AuthContextWithMembership> {
  const ctx = await assertSessionWithTenant();
  // Reusa o context cached — chamar getLogtoContext direto causa race
  // condition (React 19 paraleliza layout + page; singleton muta storage).
  const logtoCtx = await getCachedLogtoContext();
  const roleClaims = logtoCtx.claims?.organization_roles ?? [];

  // Resolver Tenant.id (UUID) → logtoOrgId pra filtrar roles (claims usam
  // formato "<logtoOrgId>:<role>").
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: ctx.activeTenantId },
    select: { logtoOrgId: true },
  });
  const logtoOrgId = tenant?.logtoOrgId;
  if (!logtoOrgId) {
    throw new TenantNotSelectedError();
  }

  const rolesForActive = roleClaims
    .filter((r) => r.startsWith(`${logtoOrgId}:`))
    .map((r) => r.split(":")[1])
    .filter((r): r is string => Boolean(r));

  if (rolesForActive.length === 0) {
    console.warn("[rbac] no role claim for active tenant", {
      activeTenantId: ctx.activeTenantId,
      logtoOrgId,
      claimsOrgs: logtoCtx.claims?.organizations,
      roleClaims,
    });
    throw new TenantNotSelectedError();
  }

  const globalRole = mapLogtoRoleToMembershipRole(rolesForActive[0]);

  // Shadow TenantMembership — UUID real pra features downstream (chat,
  // audit) que esperam membershipId UUID na FK.
  const membership = await ensureTenantMembership(ctx.account.id, ctx.activeTenantId, globalRole);

  return {
    ...ctx,
    membership: {
      id: membership.id,
      globalRole: membership.globalRole,
    },
  };
}

function mapLogtoRoleToMembershipRole(roleName: string): MembershipRole {
  switch (roleName.toLowerCase()) {
    case "owner":
      return MembershipRole.tenant_owner;
    case "admin":
      return MembershipRole.tenant_admin;
    case "supervisor":
      return MembershipRole.department_supervisor;
    case "auditor":
      return MembershipRole.auditor;
    case "member":
    case "operator":
    default:
      return MembershipRole.operator;
  }
}
