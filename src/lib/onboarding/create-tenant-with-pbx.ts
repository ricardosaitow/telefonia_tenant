/**
 * Wrapper de alto nível pro fluxo Tenant + PBX Domain.
 *
 * Orquestra:
 *   1. Cria Tenant + Membership owner no portal (TX prismaAdmin).
 *   2. Provisiona Domain no FusionPBX via `provisionTenantPbx` (idempotente).
 *
 * Falhas:
 *   - FusionPBX falha em (2): tenta apagar o Tenant criado em (1)
 *     (best-effort) e propaga o erro. Isso evita órfão no portal.
 *
 * Por que não dentro da TX do portal:
 *   - createDomain é cross-DB (escreve no Postgres do FusionPBX), TX do
 *     portal não cobre.
 *   - createDomain dispara `reloadxml` via TCP — operação síncrona com
 *     FreeSWITCH, latência alta. Não queremos isso bloqueando lock no
 *     portal_dev.
 */
import { prismaAdmin } from "@/lib/db/admin-client";

import { type CreateTenantWithOwnerInput, createTenantWithOwnerInTx } from "./create-tenant";
import { provisionTenantPbx } from "./provision-tenant-pbx";

export type CreateTenantWithPbxResult = {
  tenantId: string;
  pbxDomainUuid: string;
  domainName: string;
};

export async function createTenantWithPbx(
  input: CreateTenantWithOwnerInput,
): Promise<CreateTenantWithPbxResult> {
  // 1. Tenant + Membership no portal
  const tenant = await prismaAdmin.$transaction(async (tx) => {
    return createTenantWithOwnerInTx(tx, input);
  });

  // 2. Provisiona PBX (cria Domain + linka Tenant.pbxDomainUuid).
  // Cleanup do Tenant se PBX falhar — evita órfão.
  try {
    const result = await provisionTenantPbx(tenant.id);
    return {
      tenantId: tenant.id,
      pbxDomainUuid: result.pbxDomainUuid,
      domainName: result.domainName,
    };
  } catch (err) {
    try {
      await prismaAdmin.tenant.delete({ where: { id: tenant.id } });
    } catch (cleanupErr) {
      console.error(
        "[createTenantWithPbx] cleanup do Tenant falhou após erro do FusionPBX:",
        cleanupErr,
      );
    }
    throw err;
  }
}
