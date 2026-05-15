/**
 * Cliente Logto pro portal (telefon.ia).
 *
 * Sprint 2 — Logto plug em paralelo com Auth.js existente. Fase 1 só adiciona
 * rotas /api/logto/* sem mexer em Auth.js. Fase 2 redireciona /login pra cá.
 * Fase 3 (próxima sprint): remove Auth.js + migra Tenant → Logto Organization.
 *
 * Padrão idêntico ao meet.ia — ver memória [[logto-next-sdk-app-router]].
 *  - `@logto/next/edge` → route handlers em /api/logto/*
 *  - `@logto/next/server-actions` → Server Components / Server Actions
 */

import type { LogtoNextConfig } from "@logto/next";
import LogtoEdgeClient from "@logto/next/edge";
import LogtoServerActionsClient from "@logto/next/server-actions";

if (!process.env.LOGTO_APP_ID || !process.env.LOGTO_APP_SECRET) {
  throw new Error(
    "Logto config missing — verifique .env (LOGTO_APP_ID e LOGTO_APP_SECRET obrigatórios)",
  );
}

const config: LogtoNextConfig = {
  endpoint: process.env.LOGTO_ENDPOINT ?? "http://localhost:56200/",
  appId: process.env.LOGTO_APP_ID,
  appSecret: process.env.LOGTO_APP_SECRET,
  baseUrl: process.env.LOGTO_BASE_URL ?? "http://localhost:5000",
  cookieSecret: process.env.LOGTO_COOKIE_SECRET ?? "fallback-not-secure-do-not-use",
  cookieSecure: process.env.NODE_ENV === "production",
  scopes: [
    "openid",
    "profile",
    "email",
    "offline_access",
    "urn:logto:scope:organizations",
    "urn:logto:scope:organization_roles",
  ],
};

/** Use em /api/logto/* route handlers. */
export const logtoClient = new LogtoEdgeClient(config);

/** Use em Server Components / Server Actions. */
export const logtoServer = new LogtoServerActionsClient(config);

export default logtoClient;
