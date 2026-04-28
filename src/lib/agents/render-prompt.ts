/**
 * Renderiza o system prompt final a partir do `draftState` + dados do tenant
 * + lista de Knowledge sources.
 *
 * Pipeline:
 *   1. Parse seguro do draftState (tolera shapes antigos).
 *   2. Se vertical=custom OU systemPromptOverride preenchido → usa override
 *      literal e retorna.
 *   3. Senão: pega defaults do vertical, mistura com user-input (user
 *      sobrescreve), monta vars, renderiza EJS de _base.md.ejs.
 *
 * Render acontece SOMENTE no publish (ou preview UI). NÃO no runtime do
 * agente — a runtime lê `AgentVersion.systemPrompt` cru, já renderizado.
 *
 * Mantemos render síncrono (não toca DB nem rede) — facilita unit test.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import ejs from "ejs";

import { type DraftState, parseDraftState, validToolKeys } from "./draft-state-schema";
import { getVerticalDefaults } from "./templates/verticals";
import { type ToolKey, TOOLS_CATALOG } from "./tools-catalog";

// Carrega template UMA VEZ. EJS compila e cacheia internamente quando
// passamos o `filename`. Em dev, mudanças no .ejs precisam restart.
const TEMPLATE_PATH = join(process.cwd(), "src/lib/agents/templates/_base.md.ejs");
const TEMPLATE_SRC = readFileSync(TEMPLATE_PATH, "utf8");

export type RenderInput = {
  /** Raw draftState do banco — passa por parseDraftState aqui. */
  draftState: unknown;
  agent: {
    nome: string;
  };
  tenant: {
    nomeFantasia: string;
  };
  knowledge: ReadonlyArray<{
    nome: string;
    descricao?: string | null;
  }>;
};

const TOM_LABEL: Record<NonNullable<DraftState["persona"]>["tom"] & string, string> = {
  formal: "Formal e respeitoso",
  neutro: "Profissional, sem ser formal demais",
  casual: "Próximo, conversacional",
};
const ENERGIA_LABEL: Record<NonNullable<DraftState["persona"]>["energia"] & string, string> = {
  calma: "Calma e ponderada",
  equilibrada: "Equilibrada",
  animada: "Animada e proativa",
};
const IDIOMA_LABEL: Record<NonNullable<DraftState["persona"]>["idioma"] & string, string> = {
  "pt-BR": "português brasileiro",
  "en-US": "inglês americano",
  "es-ES": "espanhol",
};
const TRAIT_LABEL: Record<string, string> = {
  empatica: "empática",
  objetiva: "objetiva",
  paciente: "paciente",
  divertida: "leve e divertida",
  tecnica: "técnica e precisa",
  acolhedora: "acolhedora",
  confiante: "confiante",
  discreta: "discreta",
};

export function renderSystemPrompt(input: RenderInput): string {
  const draft = parseDraftState(input.draftState);

  // Custom / override: pula template, usa texto literal.
  if (draft.vertical === "custom" || draft.systemPromptOverride) {
    const override = draft.systemPromptOverride ?? draft.systemPrompt ?? "";
    if (!override.trim()) {
      throw new Error("draft_invalid_system_prompt");
    }
    return override;
  }

  const verticalDefaults = getVerticalDefaults(draft.vertical);

  // Persona com fallback pros defaults do schema.
  const persona = {
    tom: draft.persona?.tom ?? "neutro",
    energia: draft.persona?.energia ?? "equilibrada",
    traits: draft.persona?.traits ?? [],
    idioma: draft.persona?.idioma ?? "pt-BR",
  };

  // Tools: filtra pelo catálogo (defesa contra lixo no draft) E completa
  // metadados pra template renderizar criterio/exemplo.
  const enabledKeys = validToolKeys(
    draft.toolsEnabled.length
      ? draft.toolsEnabled
      : (verticalDefaults.recommendedTools as readonly ToolKey[]),
    Object.keys(TOOLS_CATALOG) as readonly ToolKey[],
  );
  const tools = enabledKeys.map((k) => TOOLS_CATALOG[k]);

  // Workflows: user-input prevalece, senão vertical defaults. Filtra
  // workflows com `enabled=false`.
  const workflowsRaw = draft.workflows.length
    ? draft.workflows
    : verticalDefaults.defaultWorkflows.map((w) => ({ ...w }));
  const workflows = workflowsRaw.filter((w) => w.enabled !== false);

  // Limites: user-input prevalece. Se vazio, usa do vertical.
  const limites = draft.limites.length
    ? draft.limites
    : (verticalDefaults.defaultLimites as readonly string[]);

  // Situações críticas: cada campo individual prevalece sobre o default
  // só se foi preenchido (não-undefined, não-string-vazia).
  const situacoes = {
    clienteIrritado:
      draft.situacoesCriticas?.clienteIrritado || verticalDefaults.defaultSituacoes.clienteIrritado,
    urgencia: draft.situacoesCriticas?.urgencia || verticalDefaults.defaultSituacoes.urgencia,
    foraEscopo: draft.situacoesCriticas?.foraEscopo || verticalDefaults.defaultSituacoes.foraEscopo,
    foraHorario:
      draft.situacoesCriticas?.foraHorario || verticalDefaults.defaultSituacoes.foraHorario,
  };
  const hasSituacoes = Object.values(situacoes).some((v) => v && v.trim().length);

  // Transferência: user-input + defaults.
  const transferenciaUser = draft.transferencia ?? {};
  const transferencia = {
    enabled: transferenciaUser.enabled ?? true,
    criterios: transferenciaUser.criterios?.length
      ? transferenciaUser.criterios
      : (verticalDefaults.defaultTransferenciaCriterios as readonly string[]),
    preTransferenciaAcoes:
      transferenciaUser.preTransferenciaAcoes || verticalDefaults.defaultPreTransferenciaAcoes,
  };

  const encerramento = draft.encerramento || verticalDefaults.defaultEncerramento;

  const vars = {
    agent: input.agent,
    tenant: input.tenant,
    identity: {
      descricaoCurta: draft.identity?.descricaoCurta ?? "",
    },
    persona: {
      idioma: persona.idioma,
      idiomaLabel: IDIOMA_LABEL[persona.idioma],
      tom: persona.tom,
      tomLabel: TOM_LABEL[persona.tom],
      energia: persona.energia,
      energiaLabel: ENERGIA_LABEL[persona.energia],
      traits: persona.traits.map((t) => TRAIT_LABEL[t] ?? t),
    },
    empresa: {
      segmento: draft.empresa?.segmento ?? "",
      publicoAlvo: draft.empresa?.publicoAlvo ?? "",
      diferenciais: draft.empresa?.diferenciais ?? "",
      horarioComercial: draft.empresa?.horarioComercial ?? "",
      endereco: draft.empresa?.endereco ?? "",
      site: draft.empresa?.site ?? "",
      outrosCanais: draft.empresa?.outrosCanais ?? "",
    },
    tools,
    knowledge: input.knowledge,
    workflows,
    limites,
    situacoes,
    hasSituacoes,
    transferencia,
    encerramento,
  };

  const rendered = ejs.render(TEMPLATE_SRC, vars, {
    filename: TEMPLATE_PATH,
    rmWhitespace: false,
  });

  // Limpa linhas em branco consecutivas (>2) que aparecem por causa das
  // condicionais EJS — não afeta semântica mas reduz tokens.
  return rendered.replace(/\n{3,}/g, "\n\n").trim();
}
