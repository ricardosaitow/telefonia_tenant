"use server";

import { parseWithZod } from "@conform-to/zod";

import { recordAuditInTx } from "@/lib/audit/record";
import { prismaAdmin } from "@/lib/db/admin-client";
import { withTenantContext } from "@/lib/db/tenant-context";
import {
  createExtension as createPbxExtension,
  deleteExtension as deletePbxExtension,
} from "@/lib/fusionpbx";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { createExtensionSchema } from "./schemas";

/**
 * Cria um ramal SIP. Two-step (cross-DB):
 *   1. Cria no FusionPBX (v_extensions) — gera senha SIP.
 *   2. Cria registro no portal (extensions) com pbxExtensionUuid + passwordRef.
 *
 * Falhas:
 *   - (1) falha → action propaga, nada criado.
 *   - (2) falha → cleanup do FusionPBX (deletePbxExtension), depois propaga.
 *
 * `passwordRef`: path Infisical-style. Como Infisical ainda não está
 * configurado, usamos `pbx:v_extensions/<uuid>/password` — UI lê via
 * `revealPasswordAction` que consulta v_extensions diretamente.
 */
export async function createExtensionAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: createExtensionSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "extension:manage");

  // Lookup pbxDomainUuid + slug do tenant (precisa do PBX domain).
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: ctx.activeTenantId },
    select: { pbxDomainUuid: true, slug: true },
  });
  if (!tenant?.pbxDomainUuid) {
    return submission.reply({
      formErrors: [
        "Tenant ainda não tem Domain provisionado no FusionPBX. " +
          "Recriar o tenant ou contatar suporte.",
      ],
    });
  }

  // 1. FusionPBX
  const pbx = await createPbxExtension({
    domainUuid: tenant.pbxDomainUuid,
    domainName: `${tenant.slug}.local`,
    extension: submission.value.extension,
    description: submission.value.displayName || undefined,
  });

  // 2. Portal (com cleanup PBX em caso de falha)
  try {
    await withTenantContext(ctx.activeTenantId, async (tx) => {
      const created = await tx.extension.create({
        data: {
          tenantId: ctx.activeTenantId,
          extension: submission.value.extension,
          displayName: submission.value.displayName || null,
          passwordRef: `pbx:v_extensions/${pbx.extensionUuid}/password`,
          pbxExtensionUuid: pbx.extensionUuid,
          enabled: true,
        },
      });
      await recordAuditInTx(
        tx,
        {
          tenantId: ctx.activeTenantId,
          accountId: ctx.account.id,
          membershipId: ctx.membership.id,
        },
        {
          action: "extension.create",
          entityType: "extension",
          entityId: created.id,
          after: {
            id: created.id,
            extension: created.extension,
            displayName: created.displayName,
            pbxExtensionUuid: created.pbxExtensionUuid,
          },
        },
      );
    });
  } catch (err) {
    // Cleanup best-effort no PBX
    try {
      await deletePbxExtension(pbx.extensionUuid);
    } catch (cleanupErr) {
      console.error(
        "[extensions.create] cleanup PBX falhou — extension_uuid=%s",
        pbx.extensionUuid,
        cleanupErr,
      );
    }
    throw err;
  }

  return submission.reply({ resetForm: true });
}
