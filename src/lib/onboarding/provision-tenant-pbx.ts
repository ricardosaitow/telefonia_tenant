/**
 * Provisiona o lado FusionPBX de um Tenant que já existe no portal.
 *
 * Idempotente:
 *   - Se Tenant.pbxDomainUuid já preenchido, no-op.
 *   - createDomain é idempotente (lookup por domain_name).
 *
 * Usado por:
 *   - signup-form-action: após criar Account+Tenant+Membership na TX, chama
 *     este helper pra ligar PBX (sem bloquear redirect — falha não rollback
 *     o signup, só loga).
 *   - createTenantWithPbx: parte do fluxo de criar tenant via /tenants.
 *   - Script de provisionamento retroativo (tenants antigos sem pbx).
 *
 * Não fica dentro de TX do portal pq é cross-DB e ESL é I/O síncrono.
 */
import { prismaAdmin } from "@/lib/db/admin-client";
import { createDomain } from "@/lib/fusionpbx";

export type ProvisionTenantPbxResult = {
  pbxDomainUuid: string;
  domainName: string;
  alreadyProvisioned: boolean;
};

export async function provisionTenantPbx(tenantId: string): Promise<ProvisionTenantPbxResult> {
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, slug: true, nomeFantasia: true, pbxDomainUuid: true },
  });
  if (!tenant) {
    throw new Error(`Tenant ${tenantId} não encontrado`);
  }

  const domainName = `${tenant.slug}.local`;

  if (tenant.pbxDomainUuid) {
    return {
      pbxDomainUuid: tenant.pbxDomainUuid,
      domainName,
      alreadyProvisioned: true,
    };
  }

  const { domainUuid } = await createDomain({
    domainName,
    description: tenant.nomeFantasia,
  });

  await prismaAdmin.tenant.update({
    where: { id: tenant.id },
    data: { pbxDomainUuid: domainUuid },
  });

  return {
    pbxDomainUuid: domainUuid,
    domainName,
    alreadyProvisioned: false,
  };
}
