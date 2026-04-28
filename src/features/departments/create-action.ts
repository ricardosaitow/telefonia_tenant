"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { departmentInputSchema, slugifyDepartmentName } from "./schemas";

export async function createDepartmentAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: departmentInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "department:manage");

  try {
    await withTenantContext(ctx.activeTenantId, async (tx) => {
      const dept = await tx.department.create({
        data: {
          tenantId: ctx.activeTenantId,
          slug: slugifyDepartmentName(submission.value.nome),
          nome: submission.value.nome,
          descricao: submission.value.descricao ?? null,
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
          action: "department.create",
          entityType: "department",
          entityId: dept.id,
          after: dept,
        },
      );
    });
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
