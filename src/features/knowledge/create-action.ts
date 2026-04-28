"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { knowledgeSourceInputSchema } from "./schemas";

export async function createKnowledgeSourceAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: knowledgeSourceInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "knowledge:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    const ks = await tx.knowledgeSource.create({
      data: {
        tenantId: ctx.activeTenantId,
        scope: submission.value.scope,
        // scopeRefId fica null no V1 (UI ainda não pede pra dept/agent).
        scopeRefId: null,
        tipo: submission.value.tipo,
        nome: submission.value.nome,
        descricao: submission.value.descricao ?? null,
        language: submission.value.language ?? null,
        // V1 sem upload real — marca "ready" direto. Data plane vai
        // sobrescrever pra "indexing" → "ready" quando integrar storage.
        status: "ready",
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
        action: "knowledge_source.create",
        entityType: "knowledge_source",
        entityId: ks.id,
        after: ks,
      },
    );
  });

  redirect("/knowledge");
}
