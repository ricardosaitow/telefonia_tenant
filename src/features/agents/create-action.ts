"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { agentInputSchema, slugifyAgentName } from "./schemas";

export async function createAgentAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: agentInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "agent:manage");

  try {
    await withTenantContext(ctx.activeTenantId, async (tx) => {
      const agent = await tx.agent.create({
        data: {
          tenantId: ctx.activeTenantId,
          departmentId: submission.value.departmentId,
          slug: slugifyAgentName(submission.value.nome),
          nome: submission.value.nome,
          descricao: submission.value.descricao ?? null,
          // Novo agent nasce com vertical default — wizard configura tudo.
          // Override / systemPrompt cru não são mais aceitos pela UI.
          draftState: {
            schemaVersion: 1,
            vertical: "comercial-b2b",
            toolsEnabled: [],
            workflows: [],
            limites: [],
            glossario: [],
            params: {},
          },
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
          action: "agent.create",
          entityType: "agent",
          entityId: agent.id,
          after: agent,
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
        formErrors: ["Já existe um agente com esse nome."],
      });
    }
    throw err;
  }

  redirect("/agents");
}
