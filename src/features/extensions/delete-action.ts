"use server";

import { z } from "zod";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { deleteExtension as deletePbxExtension } from "@/lib/fusionpbx";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({ id: z.string().uuid() });

export async function deleteExtensionAction(formData: FormData) {
  const parsed = inputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "extension:manage");

  // Lookup do registro pra pegar pbxExtensionUuid antes do delete.
  const before = await withTenantContext(ctx.activeTenantId, async (tx) => {
    const ext = await tx.extension.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        extension: true,
        displayName: true,
        pbxExtensionUuid: true,
      },
    });
    if (!ext) return null;

    await tx.extension.delete({ where: { id: ext.id } });
    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "extension.delete",
        entityType: "extension",
        entityId: ext.id,
        before: ext,
      },
    );
    return ext;
  });

  // PBX cleanup fora da TX. Se falhar, ramal fica órfão no PBX (zumbi),
  // mas portal está limpo. Job de reconcile (futuro) pode varrer.
  if (before?.pbxExtensionUuid) {
    try {
      await deletePbxExtension(before.pbxExtensionUuid);
    } catch (err) {
      console.error(
        "[extensions.delete] cleanup PBX falhou — extension_uuid=%s",
        before.pbxExtensionUuid,
        err,
      );
    }
  }
}
