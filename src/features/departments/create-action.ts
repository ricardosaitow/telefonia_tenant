"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { departmentInputSchema, slugifyDepartmentName } from "./schemas";

/**
 * Cria Department no tenant ativo. Owner/admin only.
 *
 * P2002 (slug duplicado por @@unique [tenantId, slug]) → erro de form.
 * Não revela "já existe departamento X" pra preservar consistência com
 * outras Server Actions; mensagem genérica suficiente.
 */
export async function createDepartmentAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: departmentInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "department:manage");

  try {
    await withTenantContext(ctx.activeTenantId, (tx) =>
      tx.department.create({
        data: {
          tenantId: ctx.activeTenantId,
          slug: slugifyDepartmentName(submission.value.nome),
          nome: submission.value.nome,
          descricao: submission.value.descricao ?? null,
        },
      }),
    );
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return submission.reply({
        formErrors: ["Já existe um departamento com esse nome."],
      });
    }
    throw err;
  }

  redirect("/departments");
}
