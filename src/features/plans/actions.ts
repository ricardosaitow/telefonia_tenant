"use server";

import { parseWithZod } from "@conform-to/zod";
import { addDays } from "date-fns";
import { redirect } from "next/navigation";

import { listAccountMemberships, setActiveTenant } from "@/lib/auth/active-tenant";
import { prismaAdmin } from "@/lib/db/admin-client";
import { createOrganizationWithOwner } from "@/lib/logto/management-api";
import { createTenantWithOwnerInTx } from "@/lib/onboarding/create-tenant";
import { provisionTenantPbx } from "@/lib/onboarding/provision-tenant-pbx";
import { assertSession, getOrganizationIds } from "@/lib/rbac";
import { createSubscriptionCheckoutSession } from "@/lib/stripe/checkout";
import { isStripeConfigured } from "@/lib/stripe/client";
import { ensureStripeCustomer } from "@/lib/stripe/customer";
import { getPortalPlanConfig } from "@/lib/stripe/plans";

import { PLANS } from "./constants";
import { choosePlanSchema } from "./schemas";

/**
 * Cria Tenant com plano escolhido. Demo é trial 3 dias sem cartão (sem
 * Stripe). Pro vai pro Stripe Checkout — Tenant é criado em status='trial'
 * sem trialEndsAt; webhook flipa pra 'active' quando pagamento completa.
 *
 * PBX provisioning é fire-and-forget: FusionPBX fora do ar não bloqueia
 * a criação do tenant.
 */
export async function choosePlanAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: choosePlanSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSession();

  const orgIds = await getOrganizationIds();
  const memberships = await listAccountMemberships(orgIds);
  if (memberships.length > 0) {
    redirect("/tenants");
  }

  // 0. Salvar o nome do user admin no Account local. Logto só coletou email
  //    no signup; nome é informado aqui no choose-plan e fica owned pelo portal.
  await prismaAdmin.account.update({
    where: { id: ctx.account.id },
    data: { nome: submission.value.accountName },
  });

  const plan = PLANS[submission.value.planSlug];
  const trialEndsAt = plan.trialDays > 0 ? addDays(new Date(), plan.trialDays) : undefined;

  // 1. Criar Organization no Logto (e adicionar user como owner) ANTES do Tenant local.
  //    O claim `organizations` no JWT só vai aparecer no PRÓXIMO sign-in/refresh.
  const logtoOrg = await createOrganizationWithOwner({
    name: submission.value.nomeTenant,
    logtoUserId: ctx.sessionToken,
    roleName: "owner",
  });

  // 2. Criar Tenant local apontando pra Org Logto via logtoOrgId.
  const tenant = await prismaAdmin.$transaction(async (tx) => {
    return createTenantWithOwnerInTx(tx, {
      accountId: ctx.account.id,
      nomeTenant: submission.value.nomeTenant,
      planSlug: submission.value.planSlug,
      trialEndsAt,
      logtoOrgId: logtoOrg.id,
    });
  });

  // PBX provisioning — fire-and-forget.
  void provisionTenantPbx(tenant.id).catch((err) => {
    console.error(
      "[choose-plan] provision PBX falhou pra tenant %s — pbxDomainUuid fica null:",
      tenant.id,
      err,
    );
  });

  await setActiveTenant(ctx.sessionToken, tenant.id);

  // 3a. Pro → Stripe Checkout
  if (submission.value.planSlug === "pro") {
    if (!isStripeConfigured()) {
      return submission.reply({
        formErrors: ["Stripe não configurado. Contate o suporte."],
      });
    }
    const planConfig = getPortalPlanConfig("pro");
    if (!planConfig.priceId) {
      return submission.reply({
        formErrors: ["Plano Pro ainda não disponível pra assinatura."],
      });
    }

    const { stripeCustomerId } = await ensureStripeCustomer({
      tenantId: tenant.id,
      email: ctx.account.email,
      name: submission.value.accountName,
    });

    const baseUrl = process.env.PORTAL_BASE_URL ?? "http://localhost:5000";
    const checkout = await createSubscriptionCheckoutSession({
      tenantId: tenant.id,
      stripeCustomerId,
      priceId: planConfig.priceId,
      successUrl: `${baseUrl}/api/stripe/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/api/stripe/checkout/return?canceled=1`,
    });

    redirect(checkout.url);
  }

  // 3b. Demo → entra direto via refresh-claims (sem Stripe).
  redirect("/api/logto/refresh-claims?redirectTo=/dashboard");
}
