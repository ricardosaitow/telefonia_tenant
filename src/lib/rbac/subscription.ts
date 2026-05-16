import { redirect } from "next/navigation";

import { prismaAdmin } from "@/lib/db/admin-client";

import { assertSessionAndMembership } from "./index";

export type SubscriptionGuard = {
  tenantId: string;
  status: "trial" | "active" | "suspended" | "canceled";
  expiresAt: Date | null;
  trialEndsAt: Date | null;
};

/**
 * Gate per-tenant: permite entrar se Tenant.status ∈ {active, trial}.
 * Se trial expirou, força volta pra /billing pra escolher plano.
 *
 * Usar em layouts pós-login que protegem features que custam grana
 * (criar canal, fazer chamada, etc). Páginas tipo /billing, /settings,
 * /account NÃO devem chamar — pra cliente bloqueado conseguir resgatar.
 */
export async function requireActiveSubscription(): Promise<SubscriptionGuard> {
  const ctx = await assertSessionAndMembership();
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: ctx.activeTenantId },
    select: {
      id: true,
      status: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
    },
  });
  if (!tenant) {
    redirect("/tenants");
  }

  const now = new Date();

  if (tenant.status === "active") {
    return {
      tenantId: tenant.id,
      status: "active",
      expiresAt: tenant.currentPeriodEnd,
      trialEndsAt: tenant.trialEndsAt,
    };
  }

  if (tenant.status === "trial") {
    if (tenant.trialEndsAt && tenant.trialEndsAt < now) {
      // Trial expirou — mandar pra /billing pra assinar
      redirect("/billing?expired=trial");
    }
    return {
      tenantId: tenant.id,
      status: "trial",
      expiresAt: tenant.trialEndsAt,
      trialEndsAt: tenant.trialEndsAt,
    };
  }

  // suspended ou canceled
  redirect("/billing?status=" + tenant.status);
}
