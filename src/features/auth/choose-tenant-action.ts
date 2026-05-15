"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { setActiveTenant } from "@/lib/auth/active-tenant";
import { prismaAdmin } from "@/lib/db/admin-client";
import { assertSession, getOrganizationIds } from "@/lib/rbac";

const inputSchema = z.object({
  tenantId: z.string().uuid(),
});

/**
 * Fase 3 SSO: valida que o user tem membership do tenant **via claims do
 * Logto** (claims.organizations), em vez da tabela TenantMembership que
 * deixou de ser source of truth.
 *
 * Fluxo:
 *  1. assertSession() — confirma sessão Logto válida
 *  2. getOrganizationIds() — pega lista de org IDs do JWT (Logto)
 *  3. Lookup Tenant pelo UUID submetido pelo form; checa que
 *     Tenant.logtoOrgId está na lista de orgs do user
 *  4. setActiveTenant — cookie escrito com o UUID
 *
 * Server Action: pode setar cookie (Next 16 OK).
 */
export async function chooseTenantAction(formData: FormData) {
  const ctx = await assertSession();
  const userOrgIds = await getOrganizationIds();

  const parsed = inputSchema.safeParse({ tenantId: formData.get("tenantId") });
  if (!parsed.success) redirect("/tenants");

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: parsed.data.tenantId },
    select: { id: true, logtoOrgId: true, status: true },
  });
  if (!tenant?.logtoOrgId || !userOrgIds.includes(tenant.logtoOrgId)) {
    redirect("/tenants");
  }
  if (tenant.status !== "active") {
    redirect("/tenants");
  }

  await setActiveTenant(ctx.sessionToken, tenant.id);

  redirect("/dashboard");
}
