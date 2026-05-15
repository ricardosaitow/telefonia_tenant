/**
 * Rota dev-only — provisiona o FusionPBX domain pro Tenant Pekiart.
 *
 * Usada uma vez após a migração SSO pra ligar o tenant ao PBX. Idempotente
 * (helper já checa se está provisionado).
 *
 * Acesso restrito ao admin do portal (logado + role tenant_owner ou admin
 * na org Pekiart). Em prod, remover este arquivo.
 */
import { NextResponse } from "next/server";

import { prismaAdmin } from "@/lib/db/admin-client";
import { provisionTenantPbx } from "@/lib/onboarding/provision-tenant-pbx";
import { assertSession } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  // Auth: precisa estar autenticado. Não exige tenant ativo (pode estar em /tenants).
  const ctx = await assertSession();

  // Lookup do Pekiart Tenant.
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { slug: "pekiart" },
    select: { id: true, slug: true, pbxDomainUuid: true, logtoOrgId: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant Pekiart não encontrado" }, { status: 404 });
  }

  try {
    const result = await provisionTenantPbx(tenant.id);
    return NextResponse.json({
      ok: true,
      tenantId: tenant.id,
      slug: tenant.slug,
      logtoOrgId: tenant.logtoOrgId,
      provisioned: result,
      triggeredBy: ctx.account.email,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Provisioning failed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
