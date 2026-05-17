/**
 * Cora Webhooks — registro + verificação de assinatura.
 *
 * Cora envia POST pra `endpoint.url` quando um trigger ocorre (ex:
 * invoice.paid). Doc oficial: POST /endpoints/ {url, resource, trigger}.
 *
 * Verificação de assinatura: A doc pública não explicita HMAC; assumimos
 * header `X-Cora-Signature` ou similar — vamos confirmar com primeiro
 * webhook real. Pra MVP, valida via shared secret no path/query OR header
 * customizado.
 */
import { coraRequest } from "./client";

export type CoraWebhookTrigger = "invoice.paid" | "invoice.expired" | "invoice.canceled";

export interface RegisterWebhookInput {
  url: string;
  /** Recurso do trigger (ex: 'invoice'). */
  resource: string;
  /** Evento (ex: 'invoice.paid'). */
  trigger: CoraWebhookTrigger | string;
}

export interface CoraWebhookEndpoint {
  id: string;
  url: string;
  resource: string;
  trigger: string;
  [key: string]: unknown;
}

/** Registra um endpoint na Cora pra receber webhooks. */
export async function registerWebhookEndpoint(
  input: RegisterWebhookInput,
): Promise<CoraWebhookEndpoint> {
  return coraRequest<CoraWebhookEndpoint>("/endpoints/", {
    method: "POST",
    body: input,
  });
}

/** Lista endpoints registrados na conta Cora. */
export async function listWebhookEndpoints(): Promise<CoraWebhookEndpoint[]> {
  const r = await coraRequest<{ items?: CoraWebhookEndpoint[] } | CoraWebhookEndpoint[]>(
    "/endpoints/",
  );
  if (Array.isArray(r)) return r;
  return r.items ?? [];
}

/**
 * Estrutura ESPERADA do payload de webhook (validar com primeiro real).
 * Doc não expõe — type baseado em pattern de outros providers (Stripe-like).
 */
export interface CoraWebhookEvent {
  /** ID do evento (idempotência). */
  id?: string;
  /** Tipo do evento (invoice.paid, etc). */
  trigger?: string;
  /** Timestamp ISO. */
  occurred_at?: string;
  /** Payload do recurso afetado — invoice completa. */
  resource?: {
    id: string;
    status?: string;
    [key: string]: unknown;
  };
  /** Index aberto pro caso de campos extras. */
  [key: string]: unknown;
}
