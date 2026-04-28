"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { updateDepartmentInputSchema } from "./schemas";

/**
 * Update Department. Owner/admin only. Slug NÃO é editado (auto-gerado
 * no create; trocar slug exige migração consciente — V1.x).
 */
export async function updateDepartmentAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: updateDepartmentInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "department:manage");

  const result = await withTenantContext(ctx.activeTenantId, (tx) =>
    tx.department.updateMany({
      where: { id: submission.value.id },
      data: {
        nome: submission.value.nome,
        descricao: submission.value.descricao ?? null,
      },
    }),
  );

  if (result.count === 0) {
    // Não achou (RLS ou id inexistente) — não revela qual.
    return submission.reply({
      formErrors: ["Departamento não encontrado."],
    });
  }

  redirect("/departments");
}
