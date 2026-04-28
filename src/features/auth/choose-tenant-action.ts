"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { setActiveTenant } from "@/lib/auth/active-tenant";
import { prisma } from "@/lib/db/client";
import { assertSession } from "@/lib/rbac";

const inputSchema = z.object({
  tenantId: z.string().uuid(),
});

/**
 * Atomic: valida que o user tem membership ATIVO no tenant solicitado, então
 * seta `activeTenantId` na sessão. Redireciona pra /dashboard no fim.
 *
 * Não usa next-safe-action aqui pra simplificar (form HTML5 → POST direto).
 * Validação Zod manual.
 *
 * Se membership não existir / estiver inativo: silently redirect pra /tenants
 * (o user vê a lista vazia / sem aquele tenant — fail-closed).
 */
export async function chooseTenantAction(formData: FormData) {
  const ctx = await assertSession();

  const parsed = inputSchema.safeParse({ tenantId: formData.get("tenantId") });
  if (!parsed.success) redirect("/tenants");

  const membership = await prisma.tenantMembership.findFirst({
    where: {
      accountId: ctx.account.id,
      tenantId: parsed.data.tenantId,
      status: "active",
    },
    select: { id: true },
  });
  if (!membership) redirect("/tenants");

  await setActiveTenant(ctx.sessionToken, parsed.data.tenantId);
  await prisma.tenantMembership.update({
    where: { id: membership.id },
    data: { lastActiveAt: new Date() },
  });

  redirect("/dashboard");
}
