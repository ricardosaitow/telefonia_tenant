"use server";

import { z } from "zod";

import { parseDraftState } from "@/lib/agents/draft-state-schema";
import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

/**
 * Salva uma seção do wizard no `Agent.draftState`.
 *
 * Cada seção (vertical / persona / comportamento / toolsEnabled / workflows /
 * limites / situacoesCriticas / transferencia / encerramento / override)
 * envia um JSON serializado no campo `payload` + `section` indicando qual
 * chave do draftState atualizar.
 *
 * Merge: lê draftState atual, sobrescreve a seção, escreve de volta.
 * Toda seção aqui listada é uma chave "raiz" do draftState — substituída
 * por inteiro (sem deep-merge).
 *
 * NÃO publica — só atualiza rascunho. Publish é ação separada que
 * renderiza prompt e cria AgentVersion.
 */

const sectionSchema = z.enum([
  "vertical",
  "persona",
  "comportamento",
  "toolsEnabled",
  "workflows",
  "limites",
  "situacoesCriticas",
  "transferencia",
  "encerramento",
  "systemPromptOverride",
]);

const inputSchema = z.object({
  agentId: z.string().uuid(),
  section: sectionSchema,
  /** JSON serializado da seção. Validado por seção dentro da action. */
  payload: z.string().max(50_000),
});

export type SaveWizardSectionResult = { ok: true } | { ok: false; error: string };

export async function saveAgentWizardSection(formData: FormData): Promise<SaveWizardSectionResult> {
  const parsed = inputSchema.safeParse({
    agentId: formData.get("agentId"),
    section: formData.get("section"),
    payload: formData.get("payload"),
  });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  let payload: unknown;
  try {
    payload = JSON.parse(parsed.data.payload);
  } catch {
    return { ok: false, error: "invalid_json" };
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "agent:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    const before = await tx.agent.findUnique({
      where: { id: parsed.data.agentId },
      select: { id: true, draftState: true },
    });
    if (!before) return;

    const current = parseDraftState(before.draftState);

    // Merge — section vai pra raiz do draftState. Sem deep-merge: caller
    // sempre manda seção INTEIRA (vide WizardForm).
    const next = {
      ...current,
      [parsed.data.section]: payload,
    };

    await tx.agent.update({
      where: { id: parsed.data.agentId },
      data: { draftState: next as unknown as object },
    });

    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "agent.draft_update",
        entityType: "agent",
        entityId: parsed.data.agentId,
        after: { section: parsed.data.section },
      },
    );
  });

  return { ok: true };
}
