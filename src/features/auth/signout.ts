"use server";

import { signOut } from "@/lib/auth/config";
import { revokeSession } from "@/lib/auth/session";
import { assertSession } from "@/lib/rbac";
import { actionClient } from "@/lib/safe-action";

/**
 * Logout — revoga sessão no DB E limpa cookie via NextAuth. Revogação
 * imediata: a sessão fica invalidada em qualquer device com o mesmo token
 * (D008 / docs/seguranca.md §6.2). Importa NextAuth, então só roda em
 * runtime Next.js.
 */
export const signoutAction = actionClient.action(async () => {
  const ctx = await assertSession();
  await revokeSession(ctx.sessionToken);
  await signOut({ redirect: false });
  return { ok: true as const };
});
