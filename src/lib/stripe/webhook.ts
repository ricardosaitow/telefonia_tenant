import type Stripe from "stripe";

import { TenantStatus } from "@/generated/prisma/client";
import { prismaAdmin } from "@/lib/db/admin-client";

import { getStripe } from "./client";

/**
 * Verifica assinatura HMAC do payload Stripe. Lança se inválido.
 * Body precisa ser o RAW (sem JSON.parse), por isso o caller (route
 * handler) precisa ler `req.text()`.
 */
export function verifyStripeSignature(rawBody: string, sigHeader: string | null): Stripe.Event {
  if (!sigHeader) throw new Error("Falta header stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET não configurado");
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(rawBody, sigHeader, secret);
}

/**
 * Map status do Stripe → TenantStatus do portal. Stripe é mais granular
 * (incomplete, trialing, active, past_due, canceled, unpaid, paused).
 * Convertemos pra 4 estados: trial | active | suspended | canceled.
 */
function mapStripeStatusToTenantStatus(stripeStatus: string): TenantStatus | null {
  switch (stripeStatus) {
    case "trialing":
      return TenantStatus.trial;
    case "active":
      return TenantStatus.active;
    case "past_due":
    case "unpaid":
      return TenantStatus.suspended;
    case "canceled":
      return TenantStatus.canceled;
    case "incomplete":
      // Aguardando 1º pagamento (24h grace) — não muda status local.
      return null;
    case "incomplete_expired":
      // Passou 24h sem pagar — checkout não vai mais ativar. Vira canceled.
      return TenantStatus.canceled;
    case "paused":
      return TenantStatus.suspended;
    default:
      return null;
  }
}

async function applySubscriptionToTenant(subscription: Stripe.Subscription): Promise<void> {
  const tenantId = subscription.metadata.tenant_id;
  if (!tenantId) {
    console.warn("[stripe-webhook] subscription sem metadata.tenant_id:", subscription.id);
    return;
  }
  const newStatus = mapStripeStatusToTenantStatus(subscription.status);
  // current_period_end agora vive em SubscriptionItem (Stripe API 2026-04-22).
  // Como nossas subscriptions têm 1 só price, pega do primeiro item.
  const firstItem = subscription.items.data[0];
  const periodEndSec = firstItem?.current_period_end;
  const cpe = typeof periodEndSec === "number" ? new Date(periodEndSec * 1000) : null;

  await prismaAdmin.tenant.update({
    where: { id: tenantId },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: cpe,
      ...(newStatus ? { status: newStatus } : {}),
    },
  });
}

/**
 * Despacha evento. Idempotência garantida via tabela stripe_webhook_events:
 * inserimos o event.id primeiro com onConflict-doNothing — se já existia,
 * é retry do Stripe e a gente pula.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  // Dedup. Prisma 7 não tem ON CONFLICT direto; emulamos via tentar criar
  // e tratar P2002 (unique violation) como "já processado".
  try {
    await prismaAdmin.stripeWebhookEvent.create({
      data: { eventId: event.id, eventType: event.type },
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      console.log("[stripe-webhook] event %s já processado, skipping", event.id);
      return;
    }
    throw err;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      // Quando subscription mode, o subscription ID vem em session.subscription
      if (session.mode !== "subscription" || !session.subscription) return;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      await applySubscriptionToTenant(subscription);
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.trial_will_end": {
      const subscription = event.data.object;
      await applySubscriptionToTenant(subscription);
      return;
    }

    case "invoice.payment_failed":
    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      // Stripe API 2026-04-22 (dahlia) moveu invoice.subscription pra
      // invoice.parent.subscription_details.subscription.
      const parentSub = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof parentSub === "string" ? parentSub : (parentSub?.id ?? null);
      if (!subscriptionId) return;
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      await applySubscriptionToTenant(subscription);
      return;
    }

    default:
      // Ignora os outros eventos (charge.*, payment_intent.*, etc).
      return;
  }
}
