"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({ id: z.string().uuid() });

export async function deleteDepartmentAction(formData: FormData) {
  const parsed = inputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) redirect("/departments");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "department:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    const before = await tx.department.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, nome: true, descricao: true, slug: true },
    });
    if (!before) return;

    await tx.department.delete({ where: { id: parsed.data.id } });
    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "department.delete",
        entityType: "department",
        entityId: before.id,
        before,
      },
    );
  });

  redirect("/departments");
}
