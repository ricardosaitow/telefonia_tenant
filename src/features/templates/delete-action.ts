"use server";

import { redirect } from "next/navigation";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { deleteTemplateInputSchema } from "./schemas";

export async function deleteTemplateAction(formData: FormData) {
  const parsed = deleteTemplateInputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) redirect("/templates");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "template:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    const before = await tx.messageTemplate.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, key: true, locale: true, content: true, scope: true },
    });
    if (!before || before.scope !== "tenant") return;

    await tx.messageTemplate.delete({ where: { id: before.id } });

    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "template.delete",
        entityType: "message_template",
        entityId: before.id,
        before: { key: before.key, locale: before.locale, content: before.content },
      },
    );
  });

  redirect("/templates");
}
