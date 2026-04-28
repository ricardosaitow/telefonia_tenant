import NextAuth from "next-auth";

import { authConfigEdge } from "@/lib/auth/config.edge";
import { buildCsp, generateNonce, STATIC_SECURITY_HEADERS } from "@/lib/security/headers";

/**
 * Proxy (ex-middleware) Next.js 16 — Edge runtime.
 *
 * 1. **Auth check** via callback `authorized` em `authConfigEdge` — apenas
 *    decide se o request continua ou redireciona pra /login. Lookup DB e
 *    tenant context vivem em layouts/pages do Server Component (Node).
 * 2. **CSP per-request** com nonce gerado aqui — propagado via header
 *    `x-nonce` pro RSC (Next 16 lê esse header automaticamente e injeta o
 *    nonce em scripts inline framework + bundles).
 * 3. **Outros security headers** estão em `next.config.ts` `headers()`.
 *
 * Por que `proxy` é uma function literal (não `export default auth`):
 *   - O detector estático do Turbopack/Next 16 exige `export function proxy`
 *     ASCII-visível; const re-export não é reconhecida.
 *   - As assinaturas de `NextRequest` (Next) e `NextAuthRequest` (Auth.js)
 *     não batem direito no TypeScript — `any` aqui é a interface entre 2
 *     frameworks que o TS não consegue conciliar (justificado, comentado).
 */
const { auth: authMiddleware } = NextAuth(authConfigEdge);

const isDev = process.env.NODE_ENV !== "production";

/* eslint-disable @typescript-eslint/no-explicit-any -- ver doc do arquivo */
export default async function proxy(req: any, ctx: any): Promise<any> {
  const nonce = generateNonce();
  const csp = buildCsp(nonce, isDev);

  // Injeta x-nonce no Headers do REQUEST. Next 16 NextRequest.headers é um
  // objeto Headers mutável em Edge runtime — `set` propaga pro RSC, que
  // lê via `headers()` em layouts/pages.
  req.headers.set("x-nonce", nonce);

  // Auth check: decide continuar ou redirect (NextAuth v5 callback `authorized`).
  const response = await authMiddleware(req, ctx);

  // Aplica CSP + headers estáticos. Em redirect, browser ainda recebe os
  // headers (defesa em profundidade caso o destino seja mal-comportado).
  // `response` aqui é Response (Edge-compatible), mas o tipo do NextAuth é
  // genérico; cast mínimo pra `Headers` da resposta.
  const headers = (response as { headers?: Headers } | null)?.headers;
  if (headers instanceof Headers) {
    headers.set("Content-Security-Policy", csp);
    for (const [key, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
      headers.set(key, value);
    }
  }

  return response;
}

export const config = {
  // Roda em todas exceto: /api, _next, favicon, /brand, qualquer arquivo com extensão.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand|.*\\..*).*)"],
};
