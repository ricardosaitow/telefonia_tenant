import type { MembershipRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth/config";
import { prismaAdmin } from "@/lib/db/admin-client";

export type AuthContext = {
  account: {
    id: string;
    email: string;
    name: string;
  };
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
 * Lê a sessão do request atual (NextAuth `auth()`) e devolve o contexto
 * autenticado. Lança `UnauthenticatedError` se não houver sessão válida.
 */
export async function assertSession(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.sessionToken || !session.user?.id) {
    throw new UnauthenticatedError();
  }
  return {
    account: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    sessionToken: session.sessionToken,
    activeTenantId: session.activeTenantId,
  };
}

/**
 * Como `assertSession`, mas exige que `activeTenantId` esteja setado. Usar
 * em layouts/pages do (portal). Lança `TenantNotSelectedError` se faltar.
 */
export async function assertSessionWithTenant(): Promise<AuthContextWithTenant> {
  const ctx = await assertSession();
  if (!ctx.activeTenantId) throw new TenantNotSelectedError();
  return { ...ctx, activeTenantId: ctx.activeTenantId };
}

/**
 * Igual a `assertSessionWithTenant` + carrega o `Membership` do user no
 * tenant ativo (com globalRole). Usar em Server Actions que precisam
 * checar permissão via `assertCan(ctx.membership.globalRole, ...)`.
 *
 * Lookup via prismaAdmin (account+tenant scoped — fronteira no `where`):
 * é query "pré-tenant context" do ponto de vista do RLS, então prismaAdmin
 * é o cliente correto (rules/architecture-portal.md "Queries com RLS").
 */
export async function assertSessionAndMembership(): Promise<AuthContextWithMembership> {
  const ctx = await assertSessionWithTenant();
  const membership = await prismaAdmin.tenantMembership.findFirst({
    where: {
      accountId: ctx.account.id,
      tenantId: ctx.activeTenantId,
      status: "active",
    },
    select: { id: true, globalRole: true },
  });
  if (!membership) throw new TenantNotSelectedError();
  return { ...ctx, membership };
}
