import { type NextRequest } from "next/server";

/**
 * Auth simples pra rotas /api/internal/*. Compara header `X-Internal-Auth`
 * com env `INTERNAL_API_KEY`. Usado pelo bridge-ia (data plane) pra invocar
 * ações que precisam de credenciais decriptadas (SMTP de canal email, etc).
 *
 * Não usar pra requisições externas — bridge-ia é confiável e fala via rede
 * Docker interna `telefonia-ia_defaultnet`.
 */
export function isInternalRequestAuthorized(req: NextRequest): boolean {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) return false;
  const got = req.headers.get("x-internal-auth");
  return !!got && got === expected;
}
