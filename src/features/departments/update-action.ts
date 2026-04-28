"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { updateDepartmentInputSchema } from "./schemas";

export async function updateDepartmentAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: updateDepartmentInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "department:manage");

  const result = await withTenantContext(ctx.activeTenantId, async (tx) => {
    const before = await tx.department.findUnique({
      where: { id: submission.value.id },
      select: { id: true, nome: true, descricao: true, slug: true },
    });
    if (!before) return { count: 0 };

    const after = await tx.department.update({
      where: { id: submission.value.id },
      data: {
        nome: submission.value.nome,
        descricao: submission.value.descricao ?? null,
      },
      select: { id: true, nome: true, descricao: true, slug: true },
    });

    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "department.update",
        entityType: "department",
        entityId: after.id,
        before,
        after,
      },
    );

    return { count: 1 };
  });

  if (result.count === 0) {
    return submission.reply({
      formErrors: ["Departamento não encontrado."],
    });
  }

  redirect("/departments");
}
