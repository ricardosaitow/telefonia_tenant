import { z } from "zod";

/**
 * Agent: nome + descricao opcional + Department (FK obrigatória) +
 * systemPrompt do draft.
 *
 * draftState completo é JSON com {systemPrompt, params, toolsConfig};
 * V1 expõe só systemPrompt na UI. Outros campos aparecem em C2b/C3
 * conforme features (tools, knowledge) chegarem.
 *
 * status fica fixo em "draft" no create — virar production exige
 * publish (cria AgentVersion), pendente C2b.
 */
export const agentInputSchema = z.object({
  nome: z.string().min(2).max(120).trim(),
  descricao: z
    .string()
    .max(500)
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  departmentId: z.string().uuid(),
  systemPrompt: z.string().min(1).max(50000).trim(),
});

export const updateAgentInputSchema = agentInputSchema.extend({
  id: z.string().uuid(),
});

export type AgentInput = z.infer<typeof agentInputSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentInputSchema>;

export function slugifyAgentName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "agente";
}
