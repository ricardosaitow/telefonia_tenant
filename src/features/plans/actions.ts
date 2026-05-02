"use server";

import { parseWithZod } from "@conform-to/zod";
import { addDays } from "date-fns";
import { redirect } from "next/navigation";

import { listAccountMemberships, setActiveTenant } from "@/lib/auth/active-tenant";
import { prismaAdmin } from "@/lib/db/admin-client";
import { createTenantWithOwnerInTx } from "@/lib/onboarding/create-tenant";
import { provisionTenantPbx } from "@/lib/onboarding/provision-tenant-pbx";
import { assertSession } from "@/lib/rbac";

import { PLANS } from "./constants";
import { choosePlanSchema } from "./schemas";

/**
 * Cria Tenant com plano escolhido. Atualmente só "demo" (trial 3 dias)
 * funciona. Pro e Enterprise são mock (schema rejeita outros slugs).
 *
 * PBX provisioning é fire-and-forget: FusionPBX fora do ar não bloqueia
 * a criação do tenant. Falha deixa Tenant.pbxDomainUuid=null; UI de
 * /extensions mostra empty state. provisionTenantPbx é idempotente.
 */
export async function choosePlanAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: choosePlanSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSession();

  const memberships = await listAccountMemberships(ctx.account.id);
  if (memberships.length > 0) {
    redirect("/tenants");
  }

  const plan = PLANS[submission.value.planSlug];
  const trialEndsAt = plan.trialDays > 0 ? addDays(new Date(), plan.trialDays) : undefined;

  const tenant = await prismaAdmin.$transaction(async (tx) => {
    return createTenantWithOwnerInTx(tx, {
      accountId: ctx.account.id,
      nomeTenant: submission.value.nomeTenant,
      planSlug: submission.value.planSlug,
      trialEndsAt,
    });
  });

  // PBX provisioning — fire-and-forget (mesmo padrão do signup).
  void provisionTenantPbx(tenant.id).catch((err) => {
    console.error(
      "[choose-plan] provision PBX falhou pra tenant %s — pbxDomainUuid fica null:",
      tenant.id,
      err,
    );
  });

  await setActiveTenant(ctx.sessionToken, tenant.id);
  redirect("/dashboard");
}
