/**
 * Security headers — `seguranca.md` §5.5.
 *
 * Dois grupos:
 *   1. **Estáticos** (no `next.config.ts` via `headers()`): HSTS, X-Frame,
 *      X-Content-Type, Referrer-Policy, Permissions-Policy, COOP/CORP.
 *      HSTS só em produção (TLS).
 *   2. **CSP** (no `proxy.ts` por-request): Content-Security-Policy com
 *      nonce gerado por request, propagado via header `x-nonce` pra RSC
 *      ler em layouts/pages.
 *
 * Nonce-based CSP exige rendering dinâmico — todas as páginas do portal
 * já são dinâmicas (auth + RLS), então OK.
 *
 * Edge runtime: `crypto.randomUUID` está disponível globalmente.
 */

export function generateNonce(): string {
  // base64 do UUID — 22 chars, suficiente pra unicidade não-adivinhável.
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * CSP estrita com nonce. Em dev libera `unsafe-eval` (React DOM precisa
 * pra source maps de erro) e `unsafe-inline` em styles (HMR injeta CSS
 * inline). Em produção: nonce-only.
 *
 * `connect-src` libera ws/wss em dev pra HMR socket do Next.
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // style-src: em dev usa unsafe-inline (sem nonce, senão browser ignora
    // unsafe-inline). Em prod usa nonce-only.
    isDev ? `style-src 'self' 'unsafe-inline'` : `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    // Equivalente moderno a X-Frame-Options DENY (mas mais expressivo).
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ];
  return directives.join("; ");
}

/**
 * Headers que valem pra TODA resposta, sem dep de request. Aplicados
 * via `next.config.ts` `headers()`.
 *
 * HSTS NÃO está aqui — adicionado condicionalmente em produção (sem
 * sentido em dev `http://localhost`).
 */
export const STATIC_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "X-Content-Type-Options": "nosniff",
  // X-Frame-Options redundante com `frame-ancestors 'none'` no CSP, mas
  // mantido pra browsers antigos que não suportam frame-ancestors.
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Bloqueia features sensíveis. Adicionar conforme precisar (microphone
  // pra voz humana → habilita só quando intervenção em voz V1.5).
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  // Isolamento cross-origin (alvo: spectre/meltdown mitigation + secure ctx).
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

/**
 * HSTS — 2 anos, includeSubDomains, preload. Só em produção.
 */
export const HSTS_HEADER = {
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains; preload",
};
