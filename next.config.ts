import type { NextConfig } from "next";

import { HSTS_HEADER, STATIC_SECURITY_HEADERS } from "@/lib/security/headers";

const isProd = process.env.NODE_ENV === "production";

/**
 * Headers estáticos aplicados a TODA rota. CSP fica em `proxy.ts` porque
 * gera nonce per-request. HSTS só em produção (HTTPS).
 *
 * `headers()` retorna lista de matchers — usamos `/(.*)` pra cobrir tudo.
 */
const securityHeaders = [
  ...Object.entries(STATIC_SECURITY_HEADERS).map(([key, value]) => ({ key, value })),
  ...(isProd ? [HSTS_HEADER] : []),
];

/**
 * Server Actions — `serverActions.allowedOrigins` (CSRF defense).
 *
 * Default do Next 16: aceita só same-origin (Origin === Host, com fallback
 * pra X-Forwarded-Host). Cobre dev + prod single-domain.
 *
 * Em produção atrás de Cloudflare/proxy, precisa listar o domínio público.
 * Lê de env (`ALLOWED_ORIGINS`, comma-separated). Se vazio, usa default
 * (same-origin only).
 *
 * `bodySizeLimit`: 256kb. Reduzido do default 1MB porque V1 não tem upload
 * de arquivo (knowledge é manual_text). Quando upload entrar, bumpar pra
 * o tamanho necessário OU mover upload pra rota dedicada (route handler).
 */
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean)
  : undefined;

const nextConfig: NextConfig = {
  // Esconde o widget de dev do Next 16 (overlay do canto da tela). Erros
  // de build/runtime continuam aparecendo — só some o badge.
  devIndicators: false,
  experimental: {
    serverActions: {
      ...(allowedOrigins && allowedOrigins.length > 0 ? { allowedOrigins } : {}),
      bodySizeLimit: "256kb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
