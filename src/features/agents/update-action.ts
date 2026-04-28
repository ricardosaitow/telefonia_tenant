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

    const draft = (before.draftState ?? {}) as Record<string, unknown>;
    // O AgentForm legado escreve em `systemPrompt` cru. Pra manter compat
    // com o renderer novo (que lê `systemPromptOverride`), espelha o valor
    // nas DUAS chaves. Se user limpar o prompt no form, NÃO limpa o
    // override — usar o wizard pra editar override de verdade.
    const draftPatch: Record<string, unknown> = { ...draft };
    if (submission.value.systemPrompt) {
      draftPatch["systemPrompt"] = submission.value.systemPrompt;
      draftPatch["systemPromptOverride"] = submission.value.systemPrompt;
    }
    const after = await tx.agent.update({
      where: { id: submission.value.id },
      data: {
        nome: submission.value.nome,
        descricao: submission.value.descricao ?? null,
        departmentId: submission.value.departmentId,
        draftState: draftPatch as object,
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
