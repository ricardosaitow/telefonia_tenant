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

  const orgIds = await getOrganizationIds();
  const memberships = await listAccountMemberships(orgIds);
  if (memberships.length > 0) {
    redirect("/tenants");
  }

  const plan = PLANS[submission.value.planSlug];
  const trialEndsAt = plan.trialDays > 0 ? addDays(new Date(), plan.trialDays) : undefined;

  // 1. Criar Organization no Logto (e adicionar user como owner) ANTES do Tenant local.
  //    O claim `organizations` no JWT só vai aparecer no PRÓXIMO sign-in/refresh.
  const logtoOrg = await createOrganizationWithOwner({
    name: submission.value.nomeTenant,
    logtoUserId: ctx.sessionToken, // sessionToken é o claims.sub do Logto
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

  // PBX provisioning — fire-and-forget (mesmo padrão do signup).
  void provisionTenantPbx(tenant.id).catch((err) => {
    console.error(
      "[choose-plan] provision PBX falhou pra tenant %s — pbxDomainUuid fica null:",
      tenant.id,
      err,
    );
  });

  await setActiveTenant(ctx.sessionToken, tenant.id);

  // 3. Força re-sign-in pra renovar o ID token com o claim `organizations` atualizado.
  //    Sem isso, o user fica preso porque `claims.organizations` ainda vem vazio
  //    (claim foi adicionada no Logto APÓS o login atual). O endpoint
  //    `/api/logto/refresh-claims` limpa o cookie local e dispara um novo OIDC
  //    flow — como a sessão Logto upstream ainda é válida, o flow é silent.
  redirect("/api/logto/refresh-claims?redirectTo=/dashboard");
}
