"use server";

import { parseWithZod } from "@conform-to/zod";
import { revalidatePath } from "next/cache";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { templateInputSchema } from "./schemas";

export async function createTemplateAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: templateInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "template:manage");

  const result = await withTenantContext(ctx.activeTenantId, async (tx) => {
    // Pre-check pra duplicidade dentro do mesmo tenant/scope/key/locale.
    // O @@unique([tenantId, scope, scopeRefId, key, locale]) só pega quando
    // scopeRefId não é NULL (Postgres trata NULL como distinto), então
    // pra scope=tenant (scopeRefId NULL) precisamos checar aqui no app.
    const exists = await tx.messageTemplate.findFirst({
      where: {
        scope: "tenant",
        scopeRefId: null,
        key: submission.value.key,
        locale: submission.value.locale,
      },
      select: { id: true },
    });
    if (exists) return { ok: false as const, code: "duplicate" as const };

    const created = await tx.messageTemplate.create({
      data: {
        tenantId: ctx.activeTenantId,
        scope: "tenant",
        scopeRefId: null,
        key: submission.value.key,
        locale: submission.value.locale,
        content: submission.value.content,
      },
      select: { id: true, key: true, locale: true },
    });

    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "template.create",
        entityType: "message_template",
        entityId: created.id,
        after: { ...created, scope: "tenant" },
      },
    );

    return { ok: true as const };
  });

  if (!result.ok) {
    return submission.reply({
      formErrors: ["Já existe um template com essa chave e idioma."],
    });
  }

  revalidatePath("/templates");
  return submission.reply({ resetForm: true });
}
