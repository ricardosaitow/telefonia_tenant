/**
 * Definição dos planos da plataforma.
 *
 * Planos são constantes em código (sem model no DB por enquanto). Quando
 * billing vier, migramos pra Subscription/Plan com Stripe.
 *
 * price em centavos (BRL). `null` = sob consulta.
 * limits `null` = custom (enterprise).
 */

export const PLANS = {
  demo: {
    slug: "demo",
    name: "Demo",
    price: 0,
    trialDays: 3,
    limits: {
      agents: 1,
      extensions: 1,
      sipTrunks: 1,
      members: 1,
      departments: 1,
      knowledgeMb: 10,
    },
    channels: ["voice", "whatsapp"],
    integrations: false,
    cta: "Começar grátis",
    available: true,
  },
  pro: {
    slug: "pro",
    name: "Pro",
    price: 900_00,
    trialDays: 0,
    limits: {
      agents: 3,
      extensions: 5,
      sipTrunks: 2,
      members: 5,
      departments: 3,
      knowledgeMb: 100,
    },
    channels: ["voice", "whatsapp", "email"],
    integrations: true,
    cta: "Assinar",
    available: false,
  },
  enterprise: {
    slug: "enterprise",
    name: "Enterprise",
    price: null,
    trialDays: 0,
    limits: null,
    channels: ["voice", "whatsapp", "email", "api"],
    integrations: true,
    cta: "Fale conosco",
    available: false,
  },
} as const;

export const PLAN_SLUGS = Object.keys(PLANS) as PlanSlug[];

export type PlanSlug = keyof typeof PLANS;
export type Plan = (typeof PLANS)[PlanSlug];
