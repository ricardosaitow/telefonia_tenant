"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { setActiveTenant } from "@/lib/auth/active-tenant";
import { createTenantWithPbx } from "@/lib/onboarding/create-tenant-with-pbx";
import { assertSession } from "@/lib/rbac";

import { createTenantSchema } from "./schemas";

/**
 * Cria nova empresa (Tenant) e vincula o Account logado como owner. Após criar,
 * já marca como tenant ativo da sessão atual e redireciona pra /dashboard.
 *
 * Lado PBX: também cria o Domain correspondente no FusionPBX
 * (`<slug>.local`) com dialplan default da Helena (9999). Ver
 * `src/lib/onboarding/create-tenant-with-pbx.ts` pra o tradeoff de
 * consistência cross-DB.
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

  const { tenantId } = await createTenantWithPbx({
    accountId: ctx.account.id,
    nomeTenant: submission.value.nomeTenant,
  });

  await setActiveTenant(ctx.sessionToken, tenantId);
  redirect("/dashboard");
}
