"use server";

import { redirect } from "next/navigation";

import { signOut } from "@/lib/auth/config";
import { revokeSession } from "@/lib/auth/session";
import { assertSession, UnauthenticatedError } from "@/lib/rbac";

/**
 * Versão pra forms HTML5: revoga session no DB + limpa cookie + redireciona
 * pra /login. Convive com `signoutAction` (next-safe-action) pra chamadas
 * programáticas.
 */
export async function signoutFormAction() {
  try {
    const ctx = await assertSession();
    await revokeSession(ctx.sessionToken);
  } catch (err) {
    if (!(err instanceof UnauthenticatedError)) throw err;
  }
  await signOut({ redirect: false });
  redirect("/login");
}
