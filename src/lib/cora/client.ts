/**
 * Cliente HTTP Cora API — Integração Direta (mTLS).
 *
 * Auth flow:
 * 1. POST /token com mTLS (cert + key no TLS handshake)
 *    body: grant_type=client_credentials&client_id=<CID>
 *    → recebe access_token JWT (Keycloak) + expires_in 3600s
 * 2. Subsequent requests: Authorization: Bearer <access_token> + mTLS
 *
 * Token cached em memória; renova quando faltam <120s pra expirar.
 *
 * Env vars:
 *   CORA_BASE_URL    (default https://matls-clients.api.stage.cora.com.br)
 *   CORA_CLIENT_ID   (ex int-57Wle6...)
 *   CORA_CERT_PATH   (caminho do certificate.pem)
 *   CORA_KEY_PATH    (caminho do private-key.key)
 *
 * Ver https://developers.cora.com.br/docs/client-credentials-int-direta
 */
import { readFileSync } from "node:fs";

import { Agent, fetch as undiciFetch } from "undici";

type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

let _tokenCache: TokenCache | null = null;
let _mtlsAgent: Agent | null = null;

function baseUrl(): string {
  return (process.env.CORA_BASE_URL ?? "https://matls-clients.api.stage.cora.com.br").replace(
    /\/$/,
    "",
  );
}

function clientId(): string {
  const v = process.env.CORA_CLIENT_ID;
  if (!v) throw new Error("CORA_CLIENT_ID não configurado");
  return v;
}

function loadMtlsAgent(): Agent {
  if (_mtlsAgent) return _mtlsAgent;
  const certPath = process.env.CORA_CERT_PATH;
  const keyPath = process.env.CORA_KEY_PATH;
  if (!certPath || !keyPath) {
    throw new Error("CORA_CERT_PATH e CORA_KEY_PATH são obrigatórios pra mTLS");
  }
  const cert = readFileSync(certPath);
  const key = readFileSync(keyPath);
  _mtlsAgent = new Agent({
    connect: { cert, key },
  });
  return _mtlsAgent;
}

export function isCoraConfigured(): boolean {
  return (
    !!process.env.CORA_CLIENT_ID && !!process.env.CORA_CERT_PATH && !!process.env.CORA_KEY_PATH
  );
}

async function fetchAccessToken(): Promise<TokenCache> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId(),
  });
  const res = await undiciFetch(`${baseUrl()}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    dispatcher: loadMtlsAgent(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cora /token falhou: ${res.status} ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  };
  if (!data.access_token || !data.expires_in) {
    throw new Error("Cora /token resposta inválida");
  }
  return {
    accessToken: data.access_token,
    expiresAtMs: Date.now() + data.expires_in * 1000,
  };
}

async function getAccessToken(): Promise<string> {
  if (_tokenCache && _tokenCache.expiresAtMs - Date.now() > 120_000) {
    return _tokenCache.accessToken;
  }
  _tokenCache = await fetchAccessToken();
  return _tokenCache.accessToken;
}

export type CoraRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  idempotencyKey?: string;
  timeoutMs?: number;
};

/**
 * Wrapper genérico Cora — usa mTLS + Bearer token. Lança Error com status
 * e body em falhas.
 */
export async function coraRequest<T = unknown>(
  path: string,
  opts: CoraRequestOptions = {},
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  const res = await undiciFetch(`${baseUrl()}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    dispatcher: loadMtlsAgent(),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Cora ${opts.method ?? "GET"} ${path} falhou: ${res.status} ${text.slice(0, 500)}`,
    );
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}
