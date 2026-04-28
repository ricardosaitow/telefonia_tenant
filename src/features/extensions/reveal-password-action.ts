"use server";

import { z } from "zod";

import { withTenantContext } from "@/lib/db/tenant-context";
import { readExtensionPassword } from "@/lib/fusionpbx";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({ id: z.string().uuid() });

export type RevealPasswordResult = { ok: true; password: string } | { ok: false; error: string };

/**
 * Revela senha SIP de um ramal. Lê da v_extensions.password do FusionPBX
 * (FusionPBX precisa de plaintext pra digest auth — sem hash possível).
 *
 * Por enquanto sem audit log dedicado — é leitura, não modificação. Quando
 * integrar SecurityEvent (V1.x), gravar `secret_access` aqui.
 */
export async function revealExtensionPasswordAction(
  formData: FormData,
): Promise<RevealPasswordResult> {
  const parsed = inputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "extension:manage");

  // Lookup pbxExtensionUuid (RLS garante tenant scope).
  const ext = await withTenantContext(ctx.activeTenantId, async (tx) => {
    return tx.extension.findUnique({
      where: { id: parsed.data.id },
      select: { pbxExtensionUuid: true },
    });
  });

  if (!ext?.pbxExtensionUuid) {
    return { ok: false, error: "not_found" };
  }

  const password = await readExtensionPassword(ext.pbxExtensionUuid);
  if (!password) return { ok: false, error: "no_password_stored" };

  return { ok: true, password };
}
