"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { assertScopeRefValid } from "./queries";
import { updateKnowledgeSourceInputSchema } from "./schemas";

export async function updateKnowledgeSourceAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: updateKnowledgeSourceInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "knowledge:manage");

  const refValid = await assertScopeRefValid(
    ctx.activeTenantId,
    submission.value.scope,
    submission.value.scopeRefId,
  );
  if (!refValid) {
    return submission.reply({
      fieldErrors: { scopeRefId: ["Item selecionado não existe ou não pertence a este tenant."] },
    });
  }

  const result = await withTenantContext(ctx.activeTenantId, async (tx) => {
    const before = await tx.knowledgeSource.findUnique({
      where: { id: submission.value.id },
      select: {
        id: true,
        nome: true,
        descricao: true,
        scope: true,
        scopeRefId: true,
        tipo: true,
        language: true,
      },
    });
    if (!before) return { count: 0 };

    const after = await tx.knowledgeSource.update({
      where: { id: submission.value.id },
      data: {
        nome: submission.value.nome,
        descricao: submission.value.descricao ?? null,
        scope: submission.value.scope,
        scopeRefId: submission.value.scopeRefId ?? null,
        tipo: submission.value.tipo,
        language: submission.value.language ?? null,
      },
      select: {
        id: true,
        nome: true,
        descricao: true,
        scope: true,
        scopeRefId: true,
        tipo: true,
        language: true,
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
        action: "knowledge_source.update",
        entityType: "knowledge_source",
        entityId: after.id,
        before,
        after,
      },
    );

    return { count: 1 };
  });

  if (result.count === 0) {
    return submission.reply({ formErrors: ["Fonte de conhecimento não encontrada."] });
  }

  redirect("/knowledge");
}
