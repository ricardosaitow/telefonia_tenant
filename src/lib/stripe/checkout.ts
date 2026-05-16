import { getStripe } from "./client";

/**
 * Cria Checkout Session pra um Tenant + Price. Modo `subscription`.
 * Retorna URL pra redirect (hosted page).
 *
 * Identifica o Tenant via `client_reference_id` + `metadata.tenant_id` pra
 * webhook upsertar idempotente.
 */
export async function createSubscriptionCheckoutSession(args: {
  tenantId: string;
  stripeCustomerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: args.stripeCustomerId,
    client_reference_id: args.tenantId,
    line_items: [{ price: args.priceId, quantity: 1 }],
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    allow_promotion_codes: true,
    metadata: { tenant_id: args.tenantId, app: "portal" },
    subscription_data: {
      metadata: { tenant_id: args.tenantId, app: "portal" },
    },
  });

  if (!session.url) {
    throw new Error("Stripe Checkout Session sem URL");
  }
  return { url: session.url, sessionId: session.id };
}

/**
 * Cria sessão do Customer Portal (auto-serviço de billing: cancelar,
 * trocar plano, atualizar PM, baixar invoices).
 */
export async function createBillingPortalSession(args: {
  stripeCustomerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: args.stripeCustomerId,
    return_url: args.returnUrl,
  });
  return { url: session.url };
}
