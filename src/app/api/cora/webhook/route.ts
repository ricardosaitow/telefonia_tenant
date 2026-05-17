/**
 * Webhook handler Cora. Idempotência via cora_webhook_events.
 *
 * Payload da Cora (estrutura inferida do pattern, validar com primeiro
 * webhook real):
 *   { id, trigger, occurred_at, resource: { id, status, ... } }
 *
 * Trigger esperados: invoice.paid, invoice.expired, invoice.canceled.
 *
 * Auth: por enquanto sem signature verification (Cora docs públicas não
 * detalham HMAC). Pra MVP, valida via shared secret no path/query:
 *   /api/cora/webhook?secret=<CORA_WEBHOOK_SECRET>
 * Quando Cora documentar HMAC, refatorar.
 */
import { type NextRequest, NextResponse } from "next/server";

import { applyCoraInvoiceToLocal } from "@/lib/cora/billing";
import { getInvoice } from "@/lib/cora/invoices";
import { prismaAdmin } from "@/lib/db/admin-client";

export const dynamic = "force-dynamic";

type CoraWebhookPayload = {
  id?: string;
  trigger?: string;
  occurred_at?: string;
  resource?: {
    id?: string;
    status?: string;
  };
  [key: string]: unknown;
};

function checkSecret(req: NextRequest): boolean {
  const expected = process.env.CORA_WEBHOOK_SECRET;
  if (!expected) {
    // Sem secret configurado, aceita (modo dev). Em prod, configurar é obrigatório.
    return process.env.NODE_ENV !== "production";
  }
  const got = req.nextUrl.searchParams.get("secret");
  return got === expected;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: CoraWebhookPayload;
  try {
    payload = (await req.json()) as CoraWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Idempotência: usa event.id se vier; senão hash do (trigger, resource.id, occurred_at)
  const eventId =
    payload.id ??
    `${payload.trigger ?? "?"}:${payload.resource?.id ?? "?"}:${payload.occurred_at ?? "?"}`;
  const trigger = payload.trigger ?? "unknown";

  try {
    await prismaAdmin.coraWebhookEvent.create({
      data: { eventId, trigger },
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      console.log("[cora-webhook] event %s já processado, skipping", eventId);
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[cora-webhook] dedup falhou:", err);
    return NextResponse.json({ error: "dedup_failed" }, { status: 500 });
  }

  // Processa evento. Pra robustez, sempre re-fetch da invoice via API (single source of truth)
  // em vez de confiar no payload do webhook (que pode estar parcial).
  const coraInvoiceId = payload.resource?.id;
  if (!coraInvoiceId) {
    console.warn("[cora-webhook] payload sem resource.id, evento ignorado:", payload);
    return NextResponse.json({ received: true, ignored: "no_resource_id" });
  }

  try {
    const fresh = await getInvoice(coraInvoiceId);
    await applyCoraInvoiceToLocal(fresh);
    return NextResponse.json({ received: true, processed: trigger });
  } catch (err) {
    console.error("[cora-webhook] erro processando %s:", trigger, err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
