"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({ id: z.string().uuid() });

export async function deleteKnowledgeSourceAction(formData: FormData) {
  const parsed = inputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) redirect("/knowledge");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "knowledge:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    const before = await tx.knowledgeSource.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, nome: true, scope: true, tipo: true },
    });
    if (!before) return;

    // Cascade remove agent_knowledge relations.
    await tx.knowledgeSource.delete({ where: { id: parsed.data.id } });
    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "knowledge_source.delete",
        entityType: "knowledge_source",
        entityId: before.id,
        before,
      },
    );
  });

  redirect("/knowledge");
}
