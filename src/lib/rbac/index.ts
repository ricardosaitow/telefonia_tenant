import { auth } from "@/lib/auth/config";

export type AuthContext = {
  account: {
    id: string;
    email: string;
    name: string;
  };
  sessionToken: string;
};

export class UnauthenticatedError extends Error {
  constructor() {
    super("unauthenticated");
    this.name = "UnauthenticatedError";
  }
}

/**
 * Lê a sessão do request atual (NextAuth `auth()`) e devolve o contexto
 * autenticado. Lança `UnauthenticatedError` se não houver sessão válida.
 *
 * Uso no início de Server Actions / Route Handlers:
 *   const ctx = await assertSession();
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
  };
}
