import { type NextRequest, NextResponse } from "next/server";

import { logtoClient } from "@/lib/logto-client";
import { buildCsp, generateNonce, STATIC_SECURITY_HEADERS } from "@/lib/security/headers";

/**
 * Proxy (ex-middleware) Next.js 16 — Edge runtime.
 *
 * **Fase 3 do plano [[sso-pekiart-logto]]**: NextAuth removido. Auth check
 * agora consulta a sessão Logto via `@logto/next/edge` (cookie `logto_*`).
 *
 * Comportamento:
 *  1. Gera nonce CSP per-request (header `x-nonce` propagado pro RSC).
 *  2. Public paths (`/`, `/login`, `/signup`, `/sso-status`, `/forgot-password`,
 *     `/reset-password`) → passa direto, sem checagem.
 *  3. Outras paths sem sessão Logto → redirect 302 pra `/login` (que por
 *     sua vez redireciona pro Logto OIDC). `/login`+`/signup` autenticado
 *     → redirect pra `/`.
 *  4. Aplica CSP + security headers à response final.
 *
 * Por que `proxy` é uma function literal (não `export default auth`):
 *   - O detector estático do Turbopack/Next 16 exige `export function proxy`
 *     ASCII-visível.
 */

const isDev = process.env.NODE_ENV !== "production";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/sso-status",
  "/forgot-password",
  "/reset-password",
]);

function isPublicPath(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true;
  // /reset-password/<token>
  if (path.startsWith("/reset-password/")) return true;
  return false;
}

export default async function proxy(req: NextRequest): Promise<Response> {
  const { pathname } = req.nextUrl;
  const nonce = generateNonce();
  const csp = buildCsp(nonce, isDev);

  // Injeta x-nonce no Headers do REQUEST pra RSC ler via `headers()`.
  req.headers.set("x-nonce", nonce);

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const publicPath = isPublicPath(pathname);

  // Para Logto edge client, consultamos o context via getLogtoContext que
  // exige o request. Só checamos quando necessário (evita custo em paths
  // públicos que não dependem do estado de auth).
  let isAuthenticated = false;
  if (!publicPath || isAuthPage) {
    try {
      const ctx = await logtoClient.getLogtoContext(req, {
        fetchUserInfo: false,
      });
      isAuthenticated = ctx.isAuthenticated;
    } catch {
      isAuthenticated = false;
    }
  }

  let response: Response;

  if (!publicPath && !isAuthenticated) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    response = NextResponse.redirect(url);
  } else if (isAuthPage && isAuthenticated) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    response = NextResponse.redirect(url);
  } else {
    response = NextResponse.next();
  }

  // Aplica CSP + security headers (defesa em profundidade — válido também
  // em redirect).
  response.headers.set("Content-Security-Policy", csp);
  for (const [key, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  // Roda em todas exceto: /api, _next, favicon, /brand, arquivos com extensão.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand|.*\\..*).*)"],
};
