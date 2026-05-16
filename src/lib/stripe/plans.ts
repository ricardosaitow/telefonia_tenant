/**
 * Mapping entre `Tenant.planSlug` (interno) e Stripe Price IDs (env-driven).
 *
 * Por que env e não DB: os Price IDs vivem na conta Stripe (test mode ≠ live
 * mode), são imutáveis no Stripe (alterar preço = criar novo Price), e
 * raramente mudam. Fica mais explícito no deploy do que numa migration.
 *
 * Os scripts em `scripts/stripe-bootstrap.ts` populam esses IDs após criar
 * os Products no Stripe (idempotente — re-roda sem dar erro).
 */
export type PlanSlug = "demo" | "pro" | "enterprise";

export type StripePlanConfig = {
  /** Price ID no Stripe (ex: "price_1QabcDe..."). null = sem checkout (demo/enterprise). */
  priceId: string | null;
  /** Dias de trial. 0 = sem trial. */
  trialDays: number;
  /** Se true, Checkout não pede cartão (trial sem PM). Stripe: `trial_period_days` + `payment_method_collection: 'if_required'`. */
  trialWithoutCard: boolean;
};

export function getPortalPlanConfig(slug: PlanSlug): StripePlanConfig {
  switch (slug) {
    case "demo":
      return {
        priceId: process.env.STRIPE_PORTAL_DEMO_PRICE_ID ?? null,
        trialDays: 3,
        trialWithoutCard: true,
      };
    case "pro":
      return {
        priceId: process.env.STRIPE_PORTAL_PRO_PRICE_ID ?? null,
        trialDays: 0,
        trialWithoutCard: false,
      };
    case "enterprise":
      // Enterprise = "fale conosco". Sem checkout self-service.
      return { priceId: null, trialDays: 0, trialWithoutCard: false };
  }
}
