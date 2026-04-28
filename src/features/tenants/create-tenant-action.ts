"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { setActiveTenant } from "@/lib/auth/active-tenant";
import { prismaAdmin } from "@/lib/db/admin-client";
import { createTenantWithOwnerInTx } from "@/lib/onboarding/create-tenant";
import { assertSession } from "@/lib/rbac";

import { createTenantSchema } from "./schemas";

/**
 * Cria nova empresa (Tenant) e vincula o Account logado como owner. Após criar,
 * já marca como tenant ativo da sessão atual e redireciona pra /dashboard.
 *
 * Caminhos típicos:
 *   - /tenants vazio (0 memberships) → user usa o form pra criar a primeira.
 *   - /tenants com N memberships → user clica "+ Nova empresa" (futuro).
 *
 * Não há limite de tenants por Account no V1. Em V2 com billing, isso fica
 * gated por plano (revisar aqui antes de soltar billing).
 */
export async function createTenantAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: createTenantSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSession();

  const tenantId = await prismaAdmin.$transaction(async (tx) => {
    const tenant = await createTenantWithOwnerInTx(tx, {
      accountId: ctx.account.id,
      nomeTenant: submission.value.nomeTenant,
    });
    return tenant.id;
  });

  await setActiveTenant(ctx.sessionToken, tenantId);
  redirect("/dashboard");
}
