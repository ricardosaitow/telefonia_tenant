/**
 * Schema do `Agent.draftState` (autosave do wizard).
 *
 * Princípio de design: o draftState carrega APENAS configuração de
 * comportamento do agente. Dados institucionais da empresa (segmento,
 * horário, glossário, política de troca, etc) NÃO entram aqui — vão pra
 * KnowledgeSource (RAG) com scope=tenant. Isso evita duplicação cross-agent
 * e mantém o prompt enxuto.
 *
 * Estrutura típica:
 *   - vertical: template de partida (defaults de workflow/limite/situação)
 *   - persona: tom, energia, traits, idioma, tratamento, auto-identificação
 *   - comportamento: saudação, encerramento, identificação cliente, LGPD,
 *     restrições de linguagem
 *   - toolsEnabled / workflows / limites / situacoesCriticas / transferencia
 *
 * Backwards-compat: agents antigos com `{systemPrompt: "..."}` cru OU com
 * campos legados (empresa, glossario, identity) continuam carregáveis —
 * `parseDraftState` aceita shape antigo, mas renderer ignora os campos
 * institucionais (knowledge é a fonte canônica agora).
 */
import { z } from "zod";

import type { ToolKey } from "./tools-catalog";

// ---------------------------------------------------------------------------
// Persona — tom + energia + traits + idioma. Cada combinação muda
// significativamente o tom do prompt renderizado.
// ---------------------------------------------------------------------------
export const personaTraitSchema = z.enum([
  "empatica",
  "objetiva",
  "paciente",
  "divertida",
  "tecnica",
  "acolhedora",
  "confiante",
  "discreta",
]);

export const personaSchema = z.object({
  /**
   * Nome da personagem — como ela se apresenta ao CLIENTE final ("Helena",
   * "Ana", "Sofia"). Diferente de `Agent.nome`, que é o label
   * ADMINISTRATIVO usado nas listas/dashboards do portal ("Comercial N1",
   * "Suporte Pós-venda"). Vai pro prompt na linha "Você é X, atendente da Y".
   */
  nomePersonagem: z.string().trim().min(1).max(50).optional(),
  tom: z.enum(["formal", "neutro", "casual"]).default("neutro"),
  energia: z.enum(["calma", "equilibrada", "animada"]).default("equilibrada"),
  traits: z.array(personaTraitSchema).default([]),
  idioma: z.enum(["pt-BR", "en-US", "es-ES"]).default("pt-BR"),
  /** Forma de tratamento ao cliente. */
  tratamento: z.enum(["voce", "senhor_senhora", "voces_informal"]).default("voce"),
  /**
   * Quando perguntado "você é robô/IA?" o agente:
   *   - assume_ia: confirma ("sim, sou uma assistente virtual")
   *   - explica_se_perguntado: confirma só se perguntado direto, senão age natural
   *   - nega: NUNCA confirma (assume persona humana — risco LGPD; usar com cuidado)
   */
  autoIdentificacao: z
    .enum(["assume_ia", "explica_se_perguntado", "nega"])
    .default("explica_se_perguntado"),
  /** Adapta saudação ao horário (Bom dia/tarde/noite automático). */
  saudacaoPorHorario: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// Comportamento — regras de como o agente age e fala.
// ---------------------------------------------------------------------------
export const comportamentoSchema = z.object({
  /** Saudação inicial. Vazio = template padrão por horário. */
  saudacaoInicial: z.string().trim().max(500).optional(),
  /**
   * Como pedir/confirmar identidade do cliente:
   *   - none: agente não pede dados de identificação
   *   - phone: confirma número/contato apenas
   *   - cpf_cnpj: solicita CPF ou CNPJ
   *   - full: pede nome + CPF/CNPJ + email/telefone
   */
  identificacaoCliente: z.enum(["none", "phone", "cpf_cnpj", "full"]).default("none"),
  /** Restrições de linguagem (lista). Ex: "nunca usar 'querida'", "evitar gírias". */
  restricoesLinguagem: z.array(z.string().trim().min(1).max(200)).default([]),
  /**
   * LGPD/privacidade: textarea livre. Padrão usado pra orientar agente sobre o
   * que pode/não pode confirmar de outro cliente (vazio = vai default genérico).
   */
  lgpdPolicy: z.string().trim().max(1000).optional(),
});

// ---------------------------------------------------------------------------
// Workflows — cenários comuns. Vertical traz uma lista default; cliente pode
// editar (texto livre) ou desabilitar (checkbox). Adicionar custom é texto
// livre + título.
// ---------------------------------------------------------------------------
export const workflowSchema = z.object({
  titulo: z.string().trim().min(1).max(120),
  gatilho: z.string().trim().min(1).max(300),
  passos: z.string().trim().min(1).max(2000),
  enabled: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// Situações críticas — 4 textareas com placeholder do vertical. Cliente
// edita ou aceita.
// ---------------------------------------------------------------------------
export const situacoesCriticasSchema = z.object({
  clienteIrritado: z.string().trim().max(800).optional(),
  urgencia: z.string().trim().max(800).optional(),
  foraEscopo: z.string().trim().max(800).optional(),
  foraHorario: z.string().trim().max(800).optional(),
});

// ---------------------------------------------------------------------------
// Transferência humana — checkboxes de critérios + ações pré-transferência.
// ---------------------------------------------------------------------------
export const transferenciaSchema = z.object({
  enabled: z.boolean().default(true),
  criterios: z.array(z.string().trim().min(1).max(300)).default([]),
  preTransferenciaAcoes: z.string().trim().max(800).optional(),
});

// ---------------------------------------------------------------------------
// Verticais — templates pré-fabricados.
// `custom` permanece no enum pra backwards-compat com agents legados que
// foram migrados pra esse vertical durante o autosave do parseDraftState.
// UI atual NÃO mostra "custom" como opção (escape hatch removido).
// ---------------------------------------------------------------------------
export const verticalSchema = z.enum([
  "comercial-b2b",
  "suporte-pos-venda",
  "recepcao",
  "varejo-b2c",
  "cobranca",
  "educacao",
  "custom",
]);

export type Vertical = z.infer<typeof verticalSchema>;

// ---------------------------------------------------------------------------
// Schema principal do draftState. TODOS os campos opcionais — autosave por
// seção pode salvar parcialmente.
// ---------------------------------------------------------------------------
export const draftStateSchema = z.object({
  /** Versão do schema — bump quando shape mudar (futuro: migration). */
  schemaVersion: z.literal(1).default(1),

  vertical: verticalSchema.default("comercial-b2b"),

  persona: personaSchema.partial().optional(),

  /** Lista de tool keys habilitadas. Validamos contra catálogo no renderer. */
  toolsEnabled: z.array(z.string()).default([]),

  workflows: z.array(workflowSchema).default([]),

  /** Lista de "nunca faça X" — strings livres. */
  limites: z.array(z.string().trim().min(1).max(300)).default([]),

  situacoesCriticas: situacoesCriticasSchema.partial().optional(),
  transferencia: transferenciaSchema.partial().optional(),

  /** Bloco de comportamento (saudação, identificação, restrições, LGPD). */
  comportamento: comportamentoSchema.partial().optional(),

  encerramento: z.string().trim().max(500).optional(),

  /**
   * Override completo do prompt — usado quando vertical=custom OU como
   * "expert mode" (cliente avançado quer prompt cru). Renderer pula
   * template inteiro e usa este texto.
   */
  systemPromptOverride: z.string().trim().max(80_000).optional(),

  /**
   * Params do modelo (temperature, max_turn_seconds, etc). Snapshot vai
   * pra AgentVersion.params no publish. V1 não expõe na UI — defaults
   * por vertical.
   */
  params: z.record(z.string(), z.unknown()).default({}),

  /**
   * Legacy: agents antigos tinham `systemPrompt` direto. Migramos pra
   * `systemPromptOverride` no primeiro publish; aqui apenas pra leitura
   * tolerante.
   */
  systemPrompt: z.string().optional(),
});

export type DraftState = z.infer<typeof draftStateSchema>;

/**
 * Lê draftState do banco de forma tolerante. Agents antigos podem ter
 * shapes diferentes — `safeParse` retorna defaults seguros.
 *
 * Detecção de LEGACY: input tem `systemPrompt` mas NÃO tem nenhum campo do
 * wizard novo (vertical / persona / etc) → migra pra `vertical=custom` +
 * `systemPromptOverride` automaticamente. Sem isso, o default do schema
 * (`vertical=comercial-b2b`) faria o renderer ignorar o systemPrompt legado.
 *
 * Campos institucionais antigos (empresa, glossario, identity) que possam
 * existir em drafts antigos são SILENCIOSAMENTE IGNORADOS no parse — Zod
 * descarta keys não declaradas no schema.
 */
export function parseDraftState(raw: unknown): DraftState {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const isLegacy =
    typeof obj["systemPrompt"] === "string" &&
    obj["vertical"] === undefined &&
    obj["systemPromptOverride"] === undefined &&
    obj["persona"] === undefined &&
    obj["toolsEnabled"] === undefined;

  if (isLegacy) {
    const legacyPrompt = obj["systemPrompt"] as string;
    return draftStateSchema.parse({
      vertical: "custom",
      systemPromptOverride: legacyPrompt,
      systemPrompt: legacyPrompt,
    });
  }

  const result = draftStateSchema.safeParse(obj);
  if (result.success) return result.data;
  // Tolerância em último recurso: schema falhou de outro jeito. Preserva
  // systemPrompt como override pra não derrubar runtime.
  return draftStateSchema.parse({
    vertical: "custom",
    systemPromptOverride: typeof obj["systemPrompt"] === "string" ? obj["systemPrompt"] : undefined,
    systemPrompt: typeof obj["systemPrompt"] === "string" ? obj["systemPrompt"] : undefined,
  });
}

/**
 * Lista de keys de tool válidas no draft (filtra contra catálogo).
 * Renderer usa pra evitar tool fantasma se draft tiver lixo.
 */
export function validToolKeys(
  draftKeys: readonly string[],
  catalogKeys: readonly ToolKey[],
): ToolKey[] {
  const set = new Set<string>(catalogKeys);
  return draftKeys.filter((k): k is ToolKey => set.has(k));
}
