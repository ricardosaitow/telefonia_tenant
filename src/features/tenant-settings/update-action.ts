"use server";

import { parseWithZod } from "@conform-to/zod";
import { revalidatePath } from "next/cache";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { tenantSettingsInputSchema } from "./schemas";

/**
 * Atualiza dados editáveis do tenant ativo. RBAC: `tenant:settings`
 * (owner ou admin). Audit antes/depois pra rastreabilidade.
 *
 * Não mexe em slug (immutable) nem status (Pekiart).
 */
export async function updateTenantSettingsAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: tenantSettingsInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "tenant:settings");

  const result = await withTenantContext(ctx.activeTenantId, async (tx) => {
    const before = await tx.tenant.findUnique({
      where: { id: ctx.activeTenantId },
      select: {
        nomeFantasia: true,
        razaoSocial: true,
        cnpj: true,
        dominioEmailPrincipal: true,
        defaultLocale: true,
      },
    });
    if (!before) return { ok: false as const, code: "not_found" as const };

    try {
      const after = await tx.tenant.update({
        where: { id: ctx.activeTenantId },
        data: {
          nomeFantasia: submission.value.nomeFantasia,
          razaoSocial: submission.value.razaoSocial ?? null,
          cnpj: submission.value.cnpj ?? null,
          dominioEmailPrincipal: submission.value.dominioEmailPrincipal ?? null,
          defaultLocale: submission.value.defaultLocale,
        },
        select: {
          nomeFantasia: true,
          razaoSocial: true,
          cnpj: true,
          dominioEmailPrincipal: true,
          defaultLocale: true,
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
          action: "tenant.update",
          entityType: "tenant",
          entityId: ctx.activeTenantId,
          before,
          after,
        },
      );

      return { ok: true as const };
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return { ok: false as const, code: "cnpj_taken" as const };
      }
      throw err;
    }
  });

  if (!result.ok) {
    return submission.reply({
      formErrors: [
        result.code === "cnpj_taken"
          ? "Esse CNPJ já está em uso por outro tenant."
          : "Tenant não encontrado.",
      ],
    });
  }

  revalidatePath("/settings");
  return submission.reply({ resetForm: false });
}
