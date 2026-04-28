import { auth } from "@/lib/auth/config";

export type AuthContext = {
  account: {
    id: string;
    email: string;
    name: string;
  };
  sessionToken: string;
  activeTenantId: string | null;
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
export async function assertSessionWithTenant(): Promise<AuthContext & { activeTenantId: string }> {
  const ctx = await assertSession();
  if (!ctx.activeTenantId) throw new TenantNotSelectedError();
  return { ...ctx, activeTenantId: ctx.activeTenantId };
}
