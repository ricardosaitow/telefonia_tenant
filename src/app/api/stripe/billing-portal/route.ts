import { type NextRequest, NextResponse } from "next/server";

import { prismaAdmin } from "@/lib/db/admin-client";
import { assertSessionAndMembership } from "@/lib/rbac";
import { createBillingPortalSession } from "@/lib/stripe/checkout";

/**
 * Redirect pro Stripe Billing Portal (auto-atendimento). Cliente pode:
 *   - Trocar PM, baixar invoices, cancelar, ver histórico.
 * Stripe cuida da UI inteira; retorna pra `returnUrl` (settings).
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = await assertSessionAndMembership();
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: ctx.activeTenantId },
    select: { stripeCustomerId: true },
  });
  const baseUrl = process.env.PORTAL_BASE_URL ?? new URL(req.url).origin;
  if (!tenant?.stripeCustomerId) {
    return NextResponse.redirect(`${baseUrl}/settings?error=no_billing`);
  }

  const { url } = await createBillingPortalSession({
    stripeCustomerId: tenant.stripeCustomerId,
    returnUrl: `${baseUrl}/settings`,
  });
  return NextResponse.redirect(url);
}
