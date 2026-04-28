import NextAuth from "next-auth";

import { authConfigEdge } from "@/lib/auth/config.edge";

/**
 * Proxy (ex-middleware) Next.js 16 — Edge runtime.
 *
 * Só checa autenticação via callback `authorized` em `authConfigEdge`. Lookup
 * DB e tenant context vivem em layouts/pages do Server Component (Node).
 *
 * Por que `proxy` é uma function literal (não `export default auth`):
 *   - O detector estático do Turbopack/Next 16 exige `export function proxy`
 *     ASCII-visível; const re-export não é reconhecida.
 *   - As assinaturas de `NextRequest` (Next) e `NextAuthRequest` (Auth.js) não
 *     batem direito no TypeScript — `any` aqui é a interface entre 2 frameworks
 *     que o TS não consegue conciliar (justificado, comentado abaixo).
 */
const { auth: authMiddleware } = NextAuth(authConfigEdge);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ver doc do arquivo
export default function proxy(req: any, ctx: any): any {
  return authMiddleware(req, ctx);
}

export const config = {
  // Roda em todas exceto: /api, _next, favicon, /brand, qualquer arquivo com extensão.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand|.*\\..*).*)"],
};
