import { z } from "zod";

/**
 * Agent: nome + descricao opcional + Department (FK obrigatória).
 *
 * `systemPrompt` é OPCIONAL no create — novos agents nascem com
 * `vertical=comercial-b2b` e os defaults do template já cobrem prompt
 * funcional. User refina depois via wizard em /agents/[id]. Quando
 * preenchido aqui, vai pra `draftState.systemPromptOverride` (modo expert).
 *
 * status fica fixo em "draft" no create — virar production exige publish
 * (cria AgentVersion).
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
  systemPrompt: z
    .string()
    .max(50000)
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
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
