"use server";

import { z } from "zod";

import { renderSystemPrompt } from "@/lib/agents/render-prompt";
import { prismaAdmin } from "@/lib/db/admin-client";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

/**
 * Renderiza o prompt do agente sem publicar. Usado pelo botão "Ver prompt
 * gerado" do wizard. Permite preview imediato após edição de qualquer
 * seção.
 */
const inputSchema = z.object({ agentId: z.string().uuid() });

export type PreviewPromptResult =
  | { ok: true; prompt: string; chars: number; tokens: number }
  | { ok: false; error: string };

export async function previewAgentPromptAction(formData: FormData): Promise<PreviewPromptResult> {
  const parsed = inputSchema.safeParse({ agentId: formData.get("agentId") });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "agent:manage");

  const data = await withTenantContext(ctx.activeTenantId, async (tx) => {
    const agent = await tx.agent.findUnique({
      where: { id: parsed.data.agentId },
      select: { id: true, nome: true, draftState: true, tenantId: true },
    });
    if (!agent) return null;

    const knowledge = await tx.knowledgeSource.findMany({
      where: { tenantId: agent.tenantId, status: "ready" },
      select: { nome: true, descricao: true },
    });

    return { agent, knowledge };
  });

  if (!data) return { ok: false, error: "not_found" };

  // Tenant.nomeFantasia precisa do prismaAdmin (RLS de Tenant é por id, e
  // já validamos via assertSessionAndMembership). Lookup direto:
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: ctx.activeTenantId },
    select: { nomeFantasia: true },
  });
  if (!tenant) return { ok: false, error: "tenant_not_found" };

  try {
    const prompt = renderSystemPrompt({
      agent: { nome: data.agent.nome },
      tenant: { nomeFantasia: tenant.nomeFantasia },
      knowledge: data.knowledge.map((k) => ({
        nome: k.nome,
        descricao: k.descricao ?? null,
      })),
      draftState: data.agent.draftState,
    });
    return {
      ok: true,
      prompt,
      chars: prompt.length,
      tokens: Math.round(prompt.length / 4),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "render_error",
    };
  }
}
