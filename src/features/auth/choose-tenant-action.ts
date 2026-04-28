"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { setActiveTenant } from "@/lib/auth/active-tenant";
import { prismaAdmin } from "@/lib/db/admin-client";
import { assertSession } from "@/lib/rbac";

const inputSchema = z.object({
  tenantId: z.string().uuid(),
});

/**
 * Atomic: valida que o user tem membership ATIVO no tenant solicitado, então
 * seta `activeTenantId` na sessão. Redireciona pra /dashboard no fim.
 *
 * !!! Lookup via prismaAdmin (BYPASS RLS) !!!
 *
 * Mesma razão de listAccountMemberships: query pré-tenant. Sem
 * `app.current_tenant`, RLS de tenant_memberships filtra fora todos os rows.
 * Fronteira de segurança: `where: { accountId, tenantId }` — accountId vem
 * de assertSession() (sessão validada).
 *
 * Se membership não existir / estiver inativo: silently redirect /tenants.
 */
export async function chooseTenantAction(formData: FormData) {
  const ctx = await assertSession();

  const parsed = inputSchema.safeParse({ tenantId: formData.get("tenantId") });
  if (!parsed.success) redirect("/tenants");

  const membership = await prismaAdmin.tenantMembership.findFirst({
    where: {
      accountId: ctx.account.id,
      tenantId: parsed.data.tenantId,
      status: "active",
    },
    select: { id: true },
  });
  if (!membership) redirect("/tenants");

  await setActiveTenant(ctx.sessionToken, parsed.data.tenantId);
  await prismaAdmin.tenantMembership.update({
    where: { id: membership.id },
    data: { lastActiveAt: new Date() },
  });

  redirect("/dashboard");
}
