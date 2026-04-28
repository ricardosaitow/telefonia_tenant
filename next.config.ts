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

const nextConfig: NextConfig = {
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
