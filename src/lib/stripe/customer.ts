import { prismaAdmin } from "@/lib/db/admin-client";

import { getStripe } from "./client";

/**
 * Find-or-create Stripe Customer pra um Tenant. Idempotente via
 * `metadata.tenant_id`. Persiste `stripe_customer_id` no Tenant.
 */
export async function ensureStripeCustomer(args: {
  tenantId: string;
  email: string;
  name: string;
}): Promise<{ stripeCustomerId: string }> {
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: args.tenantId },
    select: { stripeCustomerId: true, nomeFantasia: true },
  });
  if (!tenant) throw new Error(`Tenant ${args.tenantId} não encontrado`);
  if (tenant.stripeCustomerId) {
    return { stripeCustomerId: tenant.stripeCustomerId };
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: args.email,
    name: args.name,
    description: tenant.nomeFantasia,
    metadata: {
      tenant_id: args.tenantId,
      app: "portal",
    },
  });

  await prismaAdmin.tenant.update({
    where: { id: args.tenantId },
    data: { stripeCustomerId: customer.id },
  });

  return { stripeCustomerId: customer.id };
}
