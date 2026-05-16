import Stripe from "stripe";

/**
 * Stripe singleton com versão pinada da API. Use sempre via `getStripe()`
 * — env `STRIPE_SECRET_KEY` é lido lazy (não crashea o build se ausente).
 *
 * Em test mode: chave `sk_test_...`. Em live: `sk_live_...`. Webhook secret
 * é separado (`STRIPE_WEBHOOK_SECRET`).
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY não configurado. Defina em .env.production (sk_test_... em test mode).",
    );
  }
  cached = new Stripe(key, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
    appInfo: {
      name: "telefonia.ia portal",
      version: "0.1.0",
    },
  });
  return cached;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
