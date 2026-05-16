/**
 * Idempotently provisions Stripe Products + Prices pros 3 apps Pekiart.
 *
 * Usa Stripe Lookup Keys (string única estável) pra deduplicar:
 *   - Existe Price com aquele lookup_key? Reusa.
 *   - Não existe? Cria Product (se não tiver mesmo nome) + Price.
 *
 * Outputs os env vars que devem ser populados em `.env.production`:
 *   STRIPE_PORTAL_DEMO_PRICE_ID=price_xxx
 *   STRIPE_PORTAL_PRO_PRICE_ID=price_xxx
 *   STRIPE_MEET_PRO_PRICE_ID=price_xxx
 *   STRIPE_FINANCIA_PRO_PRICE_ID=price_xxx
 *
 * Run:
 *   STRIPE_SECRET_KEY=sk_test_... pnpm tsx scripts/stripe-bootstrap.ts
 *
 * Re-run é seguro — não cria duplicatas.
 */
import Stripe from "stripe";

const CURRENCY = "brl";

type PlanSpec = {
  /** Lookup key estável (não muda nunca). */
  lookupKey: string;
  /** Nome do Product Stripe. */
  productName: string;
  /** Slug do app pra agrupar metadata. */
  app: "portal" | "meet" | "financia";
  /** Slug do plano dentro do app. */
  planSlug: "demo" | "free" | "pro" | "enterprise";
  /** Preço mensal em centavos. 0 = grátis (Stripe aceita 0 pra recurring). */
  amountCents: number;
  /** Trial em dias. Default 0. */
  trialDays?: number;
  /** Env var name pra cuspir no final. */
  envVar: string;
};

const PLANS: PlanSpec[] = [
  {
    lookupKey: "portal_demo_v1",
    productName: "Telefonia.IA — Demo",
    app: "portal",
    planSlug: "demo",
    amountCents: 0,
    trialDays: 3,
    envVar: "STRIPE_PORTAL_DEMO_PRICE_ID",
  },
  // PORTAL_PRO_AMOUNT: definir antes de rodar (em centavos, ex: 29900 = R$ 299,00)
  {
    lookupKey: "portal_pro_v1",
    productName: "Telefonia.IA — Pro",
    app: "portal",
    planSlug: "pro",
    amountCents: parseInt(process.env.PORTAL_PRO_AMOUNT ?? "0", 10),
    envVar: "STRIPE_PORTAL_PRO_PRICE_ID",
  },
  {
    lookupKey: "meet_free_v1",
    productName: "Meet.IA — Free",
    app: "meet",
    planSlug: "free",
    amountCents: 0,
    envVar: "STRIPE_MEET_FREE_PRICE_ID",
  },
  {
    lookupKey: "meet_pro_v1",
    productName: "Meet.IA — Pro",
    app: "meet",
    planSlug: "pro",
    amountCents: parseInt(process.env.MEET_PRO_AMOUNT ?? "0", 10),
    envVar: "STRIPE_MEET_PRO_PRICE_ID",
  },
  {
    lookupKey: "financia_pro_v1",
    productName: "Financ.IA — Pro",
    app: "financia",
    planSlug: "pro",
    amountCents: parseInt(process.env.FINANCIA_PRO_AMOUNT ?? "0", 10),
    envVar: "STRIPE_FINANCIA_PRO_PRICE_ID",
  },
];

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY não definido");
  }
  const stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });

  const outputs: { envVar: string; priceId: string }[] = [];

  for (const plan of PLANS) {
    if (plan.amountCents === 0 && plan.planSlug !== "demo" && plan.planSlug !== "free") {
      console.log(`SKIP ${plan.lookupKey}: amount=0 (defina o env *_AMOUNT)`);
      continue;
    }

    // 1. Existe Price com esse lookup_key?
    const existingPrices = await stripe.prices.list({
      lookup_keys: [plan.lookupKey],
      active: true,
      limit: 1,
    });

    if (existingPrices.data.length > 0) {
      const price = existingPrices.data[0]!;
      console.log(`REUSE ${plan.lookupKey} = ${price.id}`);
      outputs.push({ envVar: plan.envVar, priceId: price.id });
      continue;
    }

    // 2. Cria/reusa Product (busca por metadata.app + metadata.plan_slug).
    const existingProducts = await stripe.products.search({
      query: `metadata['app']:'${plan.app}' AND metadata['plan_slug']:'${plan.planSlug}'`,
      limit: 1,
    });

    let product = existingProducts.data[0];
    if (!product) {
      product = await stripe.products.create({
        name: plan.productName,
        metadata: { app: plan.app, plan_slug: plan.planSlug },
      });
      console.log(`CREATED product ${product.id} (${plan.productName})`);
    }

    // 3. Cria Price.
    const price = await stripe.prices.create({
      product: product.id,
      currency: CURRENCY,
      unit_amount: plan.amountCents,
      recurring: {
        interval: "month",
        ...(plan.trialDays ? { trial_period_days: plan.trialDays } : {}),
      },
      lookup_key: plan.lookupKey,
      metadata: { app: plan.app, plan_slug: plan.planSlug },
    });
    console.log(`CREATED price ${price.id} (${plan.lookupKey} = R$ ${plan.amountCents / 100})`);
    outputs.push({ envVar: plan.envVar, priceId: price.id });
  }

  console.log("\n=== Adicione em .env.production: ===");
  for (const { envVar, priceId } of outputs) {
    console.log(`${envVar}=${priceId}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
