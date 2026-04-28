"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

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

  // Lê draft atual pra preservar params/toolsConfig (só sobrescreve systemPrompt).
  const result = await withTenantContext(ctx.activeTenantId, async (tx) => {
    const current = await tx.agent.findUnique({
      where: { id: submission.value.id },
      select: { draftState: true },
    });
    if (!current) return { count: 0 };

    const draft = (current.draftState ?? {}) as Record<string, unknown>;

    return tx.agent.updateMany({
      where: { id: submission.value.id },
      data: {
        nome: submission.value.nome,
        descricao: submission.value.descricao ?? null,
        departmentId: submission.value.departmentId,
        draftState: {
          ...draft,
          systemPrompt: submission.value.systemPrompt,
        },
      },
    });
  });

  if (result.count === 0) {
    return submission.reply({
      formErrors: ["Agente não encontrado."],
    });
  }

  redirect("/agents");
}
