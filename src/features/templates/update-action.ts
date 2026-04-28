"use server";

import { parseWithZod } from "@conform-to/zod";
import { revalidatePath } from "next/cache";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { updateTemplateInputSchema } from "./schemas";

export async function updateTemplateAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: updateTemplateInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "template:manage");

  const result = await withTenantContext(ctx.activeTenantId, async (tx) => {
    const before = await tx.messageTemplate.findUnique({
      where: { id: submission.value.id },
      select: { id: true, key: true, locale: true, content: true, scope: true },
    });
    if (!before || before.scope !== "tenant") {
      return { ok: false as const, code: "not_found" as const };
    }

    // Se key/locale mudou, valida duplicata.
    if (before.key !== submission.value.key || before.locale !== submission.value.locale) {
      const conflict = await tx.messageTemplate.findFirst({
        where: {
          scope: "tenant",
          scopeRefId: null,
          key: submission.value.key,
          locale: submission.value.locale,
          id: { not: submission.value.id },
        },
        select: { id: true },
      });
      if (conflict) return { ok: false as const, code: "duplicate" as const };
    }

    const after = await tx.messageTemplate.update({
      where: { id: submission.value.id },
      data: {
        key: submission.value.key,
        locale: submission.value.locale,
        content: submission.value.content,
      },
      select: { id: true, key: true, locale: true, content: true },
    });

    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "template.update",
        entityType: "message_template",
        entityId: after.id,
        before: {
          key: before.key,
          locale: before.locale,
          content: before.content,
        },
        after,
      },
    );

    return { ok: true as const };
  });

  if (!result.ok) {
    return submission.reply({
      formErrors: [
        result.code === "duplicate"
          ? "Já existe um template com essa chave e idioma."
          : "Template não encontrado.",
      ],
    });
  }

  revalidatePath("/templates");
  return submission.reply({ resetForm: false });
}
