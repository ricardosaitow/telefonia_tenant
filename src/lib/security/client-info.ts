import "server-only";

import { headers } from "next/headers";

/**
 * Extrai IP do cliente — pra rate limit + audit + security event.
 *
 * Ordem de confiança:
 *  1. `x-forwarded-for` (Cloudflare/proxy padrão; pega o primeiro = client real)
 *  2. `x-real-ip` (nginx convention)
 *  3. fallback "unknown" — não conseguimos identificar
 *
 * **Atenção**: confiar em `x-forwarded-for` SÓ se houver proxy real na frente
 * (Cloudflare em prod). Localmente o header pode ser falsificado pelo client.
 * Pra V1 dev, OK; em prod o Cloudflare sobreescreve com o real.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();

  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const xri = h.get("x-real-ip");
  if (xri) return xri.trim();

  return "unknown";
}

export async function getUserAgent(): Promise<string | undefined> {
  const h = await headers();
  return h.get("user-agent") ?? undefined;
}
