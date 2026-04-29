"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { updateAgentInputSchema } from "./schemas";

export async function updateAgentAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: updateAgentInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "agent:manage");

  const result = await withTenantContext(ctx.activeTenantId, async (tx) => {
    const before = await tx.agent.findUnique({
      where: { id: submission.value.id },
      select: {
        id: true,
        nome: true,
        descricao: true,
        departmentId: true,
        draftState: true,
      },
    });
    if (!before) return { count: 0 };

    // updateAction só atualiza identidade do agent (nome/descricao/department).
    // Configuração do prompt (vertical/persona/etc) flui pelo wizard via
    // saveAgentWizardSection — não toca em draftState aqui.
    const after = await tx.agent.update({
      where: { id: submission.value.id },
      data: {
        nome: submission.value.nome,
        descricao: submission.value.descricao ?? null,
        departmentId: submission.value.departmentId,
      },
      select: {
        id: true,
        nome: true,
        descricao: true,
        departmentId: true,
        draftState: true,
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
        action: "agent.update",
        entityType: "agent",
        entityId: after.id,
        before,
        after,
      },
    );

    return { count: 1 };
  });

  if (result.count === 0) {
    return submission.reply({
      formErrors: ["Agente não encontrado."],
    });
  }

  redirect("/agents");
}
