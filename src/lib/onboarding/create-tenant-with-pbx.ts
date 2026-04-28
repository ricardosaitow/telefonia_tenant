/**
 * Wrapper de alto nível pro fluxo Tenant + PBX Domain.
 *
 * Orquestra:
 *   1. Cria Tenant + Membership owner no portal (TX prismaAdmin).
 *   2. Cria Domain no FusionPBX (cross-DB, fora da TX).
 *   3. Atualiza Tenant.pbxDomainUuid.
 *
 * Falhas:
 *   - FusionPBX falha em (2): tenta apagar o Tenant criado em (1)
 *     (best-effort) e propaga o erro. Isso evita órfão no portal.
 *   - Update em (3) falha: portal fica com tenant sem pbxDomainUuid.
 *     `createDomain` é idempotente (lookup por name) então retentativa
 *     resolve. Tenant pode reconciliar depois (admin tool ou cron).
 *
 * Por que não dentro da TX do portal:
 *   - createDomain é cross-DB (escreve no Postgres do FusionPBX), TX do
 *     portal não cobre.
 *   - createDomain dispara `reloadxml` via TCP — operação síncrona com
 *     FreeSWITCH, latência alta. Não queremos isso bloqueando lock no
 *     portal_dev.
 */
import { prismaAdmin } from "@/lib/db/admin-client";
import { createDomain, deleteDomain } from "@/lib/fusionpbx";

import { type CreateTenantWithOwnerInput, createTenantWithOwnerInTx } from "./create-tenant";

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

  // 2. Domain no FusionPBX. Se falhar, cleanup do Tenant criado.
  // Domain name = slug do tenant + ".local" (config interna; cliente nunca
  // usa esse nome diretamente — Linphone vê "tenant-x.local" como domain SIP).
  const domainName = `${tenant.slug}.local`;
  let pbxDomainUuid: string;
  try {
    const result = await createDomain({
      domainName,
      description: tenant.nomeFantasia,
    });
    pbxDomainUuid = result.domainUuid;
  } catch (err) {
    // Best-effort cleanup. Falha aqui é log + soldier on com erro original.
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

  // 3. Linka Tenant ao Domain. Se falhar, o portal fica órfão lógico — admin
  // pode rodar reconcile depois (Tenant.slug + Domain.domain_name dão pra
  // re-vincular). NÃO apagamos o Domain pq o user pode tentar de novo.
  try {
    await prismaAdmin.tenant.update({
      where: { id: tenant.id },
      data: { pbxDomainUuid },
    });
  } catch (err) {
    console.error(
      "[createTenantWithPbx] linkagem pbxDomainUuid falhou — Tenant %s ↔ Domain %s órfão",
      tenant.id,
      pbxDomainUuid,
    );
    // Tenta cleanup do Domain (best-effort) pra não deixar lixo no PBX.
    try {
      await deleteDomain(pbxDomainUuid);
    } catch (cleanupErr) {
      console.error("[createTenantWithPbx] cleanup do Domain falhou:", cleanupErr);
    }
    throw err;
  }

  return { tenantId: tenant.id, pbxDomainUuid, domainName };
}
