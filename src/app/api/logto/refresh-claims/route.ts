import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { logtoClient } from "@/lib/logto-client";

export const dynamic = "force-dynamic";

/**
 * Renova o ID token Logto sem deslogar o usuário no IdP.
 *
 * Cenário: depois de criar uma Organization no Logto (via Management API)
 * o `claims.organizations` do JWT atual NÃO inclui ela — claim só atualiza
 * em sign-in/refresh.
 *
 * Estratégia:
 *  1. Limpa cookie de sessão local (`logto*`) — força novo OIDC flow.
 *  2. Redireciona pra `/api/logto/sign-in?redirectTo=...`.
 *
 * A sessão Logto upstream continua válida (cookie no domínio
 * `logto.pekiart.com.br`), então o flow é silent: o usuário não vê tela de
 * login — só uma micro-redirecionada. Volta autenticado com claims novas.
 */
export async function GET(req: NextRequest) {
  const redirectTo = req.nextUrl.searchParams.get("redirectTo") ?? "/";

  // Lista cookies, derruba qualquer um que comece com "logto" — o SDK usa
  // múltiplos cookies (sessão, nonce, etc) e o nome exato muda por versão.
  const store = await cookies();
  const all = store.getAll();
  // Usa LOGTO_BASE_URL pra evitar pegar Host interno do container (0.0.0.0:5000)
  // quando nginx não passa X-Forwarded-Host.
  const baseUrl = process.env.LOGTO_BASE_URL ?? new URL(req.url).origin;
  const res = NextResponse.redirect(
    new URL(`/api/logto/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`, baseUrl),
  );

  for (const cookie of all) {
    if (cookie.name.startsWith("logto")) {
      res.cookies.delete(cookie.name);
    }
  }

  // Suprime "unused import" warning — logtoClient pode ser necessário em
  // versões futuras pro signOut server-side. Mantido pra docking.
  void logtoClient;

  return res;
}
