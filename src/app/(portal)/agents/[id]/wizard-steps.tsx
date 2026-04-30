"use client";

import { AlertCircle, CheckCircle2, Loader2, Phone } from "lucide-react";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { previewAgentPromptAction } from "@/features/agents/preview-prompt-action";
import type { DraftState } from "@/lib/agents/draft-state-schema";
import { getVerticalDefaults, VERTICAL_OPTIONS } from "@/lib/agents/templates/verticals";
import { type ToolKey, type ToolMetadata, TOOLS_CATALOG } from "@/lib/agents/tools-catalog";

import { ChipToggleGroup, Field, ListEditor, RadioCards, SwitchField } from "./wizard-fields";

// ---------------------------------------------------------------------------
// Tipos compartilhados
// ---------------------------------------------------------------------------

export type SaveSection = <K extends keyof DraftState>(
  section: K,
  value: DraftState[K],
) => Promise<void>;

export type StepProps = {
  draft: DraftState;
  saveSection: SaveSection;
};

export type KnowledgeRef = {
  id: string;
  nome: string;
  descricao: string | null;
  scope: "tenant" | "department" | "agent";
  status: "uploading" | "indexing" | "ready" | "error";
};

// ---------------------------------------------------------------------------
// StepHeader — título + subtítulo padrão de cada step
// ---------------------------------------------------------------------------

export function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="font-display text-foreground text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

// ===========================================================================
// 1. Personalidade
// ===========================================================================

export function StepPersonalidade({ draft, saveSection }: StepProps) {
  const verticalChoices = VERTICAL_OPTIONS.filter((v) => v.value !== "custom");
  const p = draft.persona ?? {};
  function update(patch: Partial<NonNullable<DraftState["persona"]>>) {
    saveSection("persona", {
      nomePersonagem: p.nomePersonagem,
      tom: p.tom ?? "neutro",
      energia: p.energia ?? "equilibrada",
      traits: p.traits ?? [],
      idioma: p.idioma ?? "pt-BR",
      tratamento: p.tratamento ?? "voce",
      autoIdentificacao: p.autoIdentificacao ?? "explica_se_perguntado",
      saudacaoPorHorario: p.saudacaoPorHorario ?? true,
      ...patch,
    });
  }
  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        title="Personalidade do agente"
        description="Como o agente deve soar pro seu cliente. Comece definindo o nome com que ele se apresenta e o modelo do seu segmento."
      />
      <Field
        label="Como o agente se apresenta?"
        helper="Nome humano que o cliente vai ouvir na ligação. Ex: Helena, Ana, Sofia, Lucas."
        value={p.nomePersonagem ?? ""}
        placeholder="Ex: Helena"
        onCommit={(v) => update({ nomePersonagem: v.trim() || undefined })}
      />
      <RadioCards
        label="Tipo de atendimento"
        helper="Define um ponto de partida com workflows, limites e situações típicas do segmento. Você pode customizar tudo depois."
        options={verticalChoices.map((v) => ({
          value: v.value,
          label: v.label,
          description: v.description,
        }))}
        value={draft.vertical}
        onChange={(v) => saveSection("vertical", v as DraftState["vertical"])}
        cols={2}
      />
      <RadioCards
        label="Tom de voz"
        options={[
          { value: "formal", label: "Formal", description: "Usa linguagem séria, evita gírias" },
          { value: "neutro", label: "Neutro", description: "Profissional, sem ser distante" },
          { value: "casual", label: "Casual", description: "Próximo, conversa do dia-a-dia" },
        ]}
        value={p.tom ?? "neutro"}
        onChange={(v) => update({ tom: v })}
        cols={3}
      />
      <RadioCards
        label="Ritmo / Energia"
        options={[
          { value: "calma", label: "Calma", description: "Fala devagar, paciente" },
          { value: "equilibrada", label: "Equilibrada", description: "Ritmo natural" },
          { value: "animada", label: "Animada", description: "Mais ágil, proativa" },
        ]}
        value={p.energia ?? "equilibrada"}
        onChange={(v) => update({ energia: v })}
        cols={3}
      />
      <RadioCards
        label="Como tratar o cliente"
        options={[
          { value: "voce", label: '"você"', description: "Informal, mais próximo" },
          { value: "senhor_senhora", label: '"senhor/senhora"', description: "Formal, respeitoso" },
          { value: "voces_informal", label: '"vocês"', description: "Plural, B2B coletivo" },
        ]}
        value={p.tratamento ?? "voce"}
        onChange={(v) => update({ tratamento: v })}
        cols={3}
      />
      <ChipToggleGroup
        label="Características marcantes"
        helper="Marque as 2-4 mais relevantes. Ajustam sutilmente o jeito de falar."
        options={[
          { value: "empatica", label: "Empática" },
          { value: "objetiva", label: "Objetiva" },
          { value: "paciente", label: "Paciente" },
          { value: "divertida", label: "Divertida" },
          { value: "tecnica", label: "Técnica" },
          { value: "acolhedora", label: "Acolhedora" },
          { value: "confiante", label: "Confiante" },
          { value: "discreta", label: "Discreta" },
        ]}
        values={p.traits ?? []}
        onChange={(v) => update({ traits: v })}
      />
      <RadioCards
        label="Idioma"
        options={[
          { value: "pt-BR", label: "Português (BR)" },
          { value: "en-US", label: "English (US)" },
          { value: "es-ES", label: "Español" },
        ]}
        value={p.idioma ?? "pt-BR"}
        onChange={(v) => update({ idioma: v })}
        cols={3}
      />
      <RadioCards
        label="Quando perguntarem se o agente é robô / IA"
        helper="Define como o agente responde quando o cliente pergunta sobre sua natureza."
        options={[
          {
            value: "assume_ia",
            label: "Assume com naturalidade",
            description:
              'Confirma ao ser perguntado com tom natural: "sim, sou uma assistente virtual da empresa".',
          },
          {
            value: "explica_se_perguntado",
            label: "Confirma só se perguntado diretamente",
            description:
              "Não levanta o tema. Quando perguntado de forma clara, confirma sem rodeios.",
          },
          {
            value: "nega",
            label: "Desvia da pergunta",
            description:
              "Não confirma nem nega. Redireciona cordialmente pra continuar o atendimento.",
          },
        ]}
        value={p.autoIdentificacao ?? "explica_se_perguntado"}
        onChange={(v) => update({ autoIdentificacao: v })}
        cols={1}
      />
    </div>
  );
}

// ===========================================================================
// 3. Como conversar
// ===========================================================================

export function StepConversa({
  draft,
  saveSection,
  tenantNomeFantasia,
}: StepProps & { tenantNomeFantasia: string }) {
  const verticalDefaults = getVerticalDefaults(draft.vertical);
  const c = draft.comportamento ?? {};
  const p = draft.persona ?? {};
  function update(patch: Partial<NonNullable<DraftState["comportamento"]>>) {
    saveSection("comportamento", { ...c, ...patch });
  }
  // saudacaoPorHorario vive no schema persona (afeta saudação), mas a UI fica
  // aqui em Conversa pra ficar perto do campo de saudação que ele controla.
  function updatePersona(patch: Partial<NonNullable<DraftState["persona"]>>) {
    saveSection("persona", {
      tom: p.tom ?? "neutro",
      energia: p.energia ?? "equilibrada",
      traits: p.traits ?? [],
      idioma: p.idioma ?? "pt-BR",
      tratamento: p.tratamento ?? "voce",
      autoIdentificacao: p.autoIdentificacao ?? "explica_se_perguntado",
      saudacaoPorHorario: p.saudacaoPorHorario ?? true,
      nomePersonagem: p.nomePersonagem,
      ...patch,
    });
  }

  // Placeholder dinâmico com o nome real da empresa — sem variáveis cripticas.
  const saudacaoPorHorario = p.saudacaoPorHorario ?? true;
  const placeholderSaudacao = `${tenantNomeFantasia}, bom dia! Em que posso te ajudar?`;
  const helperSaudacao = saudacaoPorHorario
    ? `Como o agente abre a ligação. Se deixar em branco, ele cumprimenta automaticamente com "bom dia / boa tarde / boa noite" conforme o horário da chamada.`
    : "Como o agente abre a ligação. Se deixar em branco, ele usa um cumprimento neutro padrão.";

  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        title="Como ele conversa"
        description="Abertura, encerramento e regras de linguagem. Marque 'usar sugestão' pra começar a partir do padrão do tipo de atendimento e adaptar."
      />
      <Field
        label="Saudação inicial"
        helper={helperSaudacao}
        value={c.saudacaoInicial ?? ""}
        placeholder={placeholderSaudacao}
        onCommit={(v) => update({ saudacaoInicial: v || undefined })}
        textarea
        rows={2}
        maxLength={500}
        remountKey={`saudacao-${draft.vertical}`}
      />
      <SwitchField
        label="Adaptar saudação ao horário"
        helper={'Atende com "bom dia / boa tarde / boa noite" automaticamente.'}
        checked={saudacaoPorHorario}
        onChange={(v) => updatePersona({ saudacaoPorHorario: v })}
      />
      <Field
        label="Encerramento"
        helper="Como o agente despede no fim da ligação."
        value={draft.encerramento ?? ""}
        placeholder={verticalDefaults.defaultEncerramento}
        defaultText={verticalDefaults.defaultEncerramento}
        onCommit={(v) => saveSection("encerramento", v || undefined)}
        textarea
        rows={2}
        maxLength={500}
        remountKey={`encerramento-${draft.vertical}`}
      />
      <RadioCards
        label="Identificação do cliente"
        helper="Que informações o agente deve confirmar antes de fornecer dados (pedidos, boletos, contas)."
        options={[
          {
            value: "none",
            label: "Não pedir nada",
            description: "Conversa aberta sem confirmar identidade",
          },
          {
            value: "phone",
            label: "Confirmar telefone",
            description: "Confirma o número da ligação",
          },
          {
            value: "cpf_cnpj",
            label: "Pedir CPF/CNPJ",
            description: "Solicita CPF (ou CNPJ se empresa)",
          },
          {
            value: "full",
            label: "Pedir nome + CPF/CNPJ + email/telefone",
            description: "Validação completa antes de qualquer informação",
          },
        ]}
        value={c.identificacaoCliente ?? "none"}
        onChange={(v) => update({ identificacaoCliente: v })}
        cols={1}
      />
      <ListEditor
        label="Restrições de linguagem (específicas da empresa)"
        helper="Termos ou expressões particulares da sua operação que o agente não deve usar."
        values={c.restricoesLinguagem ?? []}
        defaults={[]}
        placeholder="ex: não chamar de 'plano' (é 'assinatura'); não citar concorrente X"
        onChange={(v) => update({ restricoesLinguagem: v })}
      />
    </div>
  );
}

// ===========================================================================
// 4. O que ela pode fazer
// ===========================================================================

export function StepAcoes({ draft, saveSection }: StepProps) {
  const verticalDefaults = getVerticalDefaults(draft.vertical);
  const usingDefaults = draft.toolsEnabled.length === 0;
  const effective: string[] = usingDefaults
    ? Array.from(verticalDefaults.recommendedTools)
    : draft.toolsEnabled;

  function toggle(key: string) {
    const current = usingDefaults
      ? Array.from(verticalDefaults.recommendedTools)
      : draft.toolsEnabled;
    saveSection(
      "toolsEnabled",
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  }

  const grouped: Record<ToolMetadata["category"], ToolMetadata[]> = {
    informacao: [],
    acao: [],
    escalacao: [],
  };
  for (const t of Object.values(TOOLS_CATALOG)) grouped[t.category].push(t);

  const CATEGORY_TITLE: Record<ToolMetadata["category"], string> = {
    informacao: "Consultas",
    acao: "Ações que ela pode executar",
    escalacao: "Quando precisar passar pra alguém",
  };

  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        title="O que o agente pode fazer"
        description="Marque as ações disponíveis. As recomendadas pro seu modelo já vêm sugeridas."
      />
      {usingDefaults ? (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            Usando recomendações padrão do modelo escolhido. Marque/desmarque pra customizar.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-6">
        {(Object.keys(grouped) as Array<ToolMetadata["category"]>).map((cat) => (
          <div key={cat} className="flex flex-col gap-3">
            <h3 className="text-foreground text-sm font-semibold">{CATEGORY_TITLE[cat]}</h3>
            <div className="grid grid-cols-1 gap-2">
              {grouped[cat].map((t) => {
                const isOn = effective.includes(t.key);
                const isRec = verticalDefaults.recommendedTools.includes(t.key);
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => toggle(t.key)}
                    className={[
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      isOn
                        ? "border-accent-light bg-accent/15"
                        : "border-divider-strong hover:border-foreground/30 bg-background",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      readOnly
                      checked={isOn}
                      tabIndex={-1}
                      className="pointer-events-none mt-1 size-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-medium">{t.label}</span>
                        {isRec ? (
                          <span className="text-accent-light text-xs">recomendada</span>
                        ) : null}
                        {t.requiresIntegration ? (
                          <span className="text-muted-foreground text-xs">
                            requer integração com {t.requiresIntegration}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground text-xs">{t.descricaoCurta}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===========================================================================
// 5. Limites e privacidade
// ===========================================================================

export function StepLimites({ draft, saveSection }: StepProps) {
  const verticalDefaults = getVerticalDefaults(draft.vertical);
  const c = draft.comportamento ?? {};
  const t = draft.transferencia ?? {};
  const sit = draft.situacoesCriticas ?? {};

  function updateComportamento(patch: Partial<NonNullable<DraftState["comportamento"]>>) {
    saveSection("comportamento", { ...c, ...patch });
  }
  function updateTransferencia(patch: Partial<NonNullable<DraftState["transferencia"]>>) {
    saveSection("transferencia", { ...t, ...patch });
  }
  function updateSituacoes(patch: Partial<NonNullable<DraftState["situacoesCriticas"]>>) {
    saveSection("situacoesCriticas", { ...sit, ...patch });
  }

  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        title="Limites e privacidade"
        description="Regras absolutas que o agente nunca quebra, e como agir em momentos delicados. Marque 'usar sugestão' pra carregar o padrão do tipo de atendimento e ajustar."
      />

      <ListEditor
        label="O que ela NUNCA deve fazer"
        helper="Cada item é uma regra absoluta. Os defaults do modelo ficam ativos enquanto a lista estiver vazia."
        values={draft.limites}
        defaults={verticalDefaults.defaultLimites}
        placeholder="ex: prometer prazo de entrega sem consultar"
        onChange={(v) => saveSection("limites", v)}
      />

      <Field
        label="Política de privacidade"
        value={c.lgpdPolicy ?? ""}
        placeholder={verticalDefaults.defaultLgpdPolicy}
        defaultText={verticalDefaults.defaultLgpdPolicy}
        onCommit={(v) => updateComportamento({ lgpdPolicy: v || undefined })}
        textarea
        rows={4}
        maxLength={1000}
        remountKey={`lgpd-${draft.vertical}`}
      />

      <div className="flex flex-col gap-4">
        <h3 className="text-foreground text-sm font-semibold">Situações delicadas — como reagir</h3>
        <Field
          label="Cliente irritado"
          value={sit.clienteIrritado ?? ""}
          placeholder={verticalDefaults.defaultSituacoes.clienteIrritado}
          defaultText={verticalDefaults.defaultSituacoes.clienteIrritado}
          onCommit={(v) => updateSituacoes({ clienteIrritado: v || undefined })}
          textarea
          rows={2}
          maxLength={800}
          remountKey={`irritado-${draft.vertical}`}
        />
        <Field
          label="Cliente disse que é urgente"
          value={sit.urgencia ?? ""}
          placeholder={verticalDefaults.defaultSituacoes.urgencia}
          defaultText={verticalDefaults.defaultSituacoes.urgencia}
          onCommit={(v) => updateSituacoes({ urgencia: v || undefined })}
          textarea
          rows={2}
          maxLength={800}
          remountKey={`urgencia-${draft.vertical}`}
        />
        <Field
          label="Pergunta fora do escopo"
          value={sit.foraEscopo ?? ""}
          placeholder={verticalDefaults.defaultSituacoes.foraEscopo}
          defaultText={verticalDefaults.defaultSituacoes.foraEscopo}
          onCommit={(v) => updateSituacoes({ foraEscopo: v || undefined })}
          textarea
          rows={2}
          maxLength={800}
          remountKey={`escopo-${draft.vertical}`}
        />
        <Field
          label="Liga fora do horário comercial"
          value={sit.foraHorario ?? ""}
          placeholder={verticalDefaults.defaultSituacoes.foraHorario}
          defaultText={verticalDefaults.defaultSituacoes.foraHorario}
          onCommit={(v) => updateSituacoes({ foraHorario: v || undefined })}
          textarea
          rows={2}
          maxLength={800}
          remountKey={`horario-${draft.vertical}`}
        />
      </div>

      <div className="flex flex-col gap-3">
        <SwitchField
          label="Permitir transferência pra atendente humano"
          helper="Quando a situação fugir do que o agente consegue resolver."
          checked={t.enabled !== false}
          onChange={(v) => updateTransferencia({ enabled: v })}
        />
        {t.enabled !== false ? (
          <div className="border-divider-strong border-l pl-4">
            <ListEditor
              label="Critérios pra transferir"
              helper="Quando exatamente o agente deve passar pra alguém."
              values={t.criterios ?? []}
              defaults={verticalDefaults.defaultTransferenciaCriterios}
              placeholder="ex: cliente alterado após 2 trocas"
              onChange={(v) => updateTransferencia({ criterios: v })}
            />
            <div className="mt-4">
              <Field
                label="Antes de transferir, sempre fazer:"
                value={t.preTransferenciaAcoes ?? ""}
                placeholder={verticalDefaults.defaultPreTransferenciaAcoes}
                defaultText={verticalDefaults.defaultPreTransferenciaAcoes}
                onCommit={(v) => updateTransferencia({ preTransferenciaAcoes: v || undefined })}
                textarea
                rows={2}
                maxLength={800}
                remountKey={`pre-transfer-${draft.vertical}`}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ===========================================================================
// 6. Revisar e publicar
// ===========================================================================

type RevisaoChecklistItem = {
  label: string;
  ok: boolean;
  goToStep: number;
  goToLabel: string;
  advice: string;
};

export function StepRevisao({
  agentId,
  draft,
  knowledge,
  onJumpToStep,
}: {
  agentId: string;
  draft: DraftState;
  knowledge: KnowledgeRef[];
  onJumpToStep: (i: number) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<{ prompt: string; chars: number; tokens: number } | null>(
    null,
  );
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function loadPreview() {
    setPreviewError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("agentId", agentId);
      const result = await previewAgentPromptAction(fd);
      if (result.ok) {
        setPreview({ prompt: result.prompt, chars: result.chars, tokens: result.tokens });
        setPreviewOpen(true);
      } else {
        setPreviewError(result.error);
      }
    });
  }

  // Indices do step (a página tem 5 steps).
  // 0=Personalidade · 1=Conversa · 2=Ações · 3=Limites · 4=Revisar
  const checks: RevisaoChecklistItem[] = [
    {
      label: "Personalidade definida",
      ok: !!(draft.persona?.tom && draft.persona?.tratamento),
      goToStep: 0,
      goToLabel: "Personalidade",
      advice: "Tom e tratamento são a base do jeito de falar do agente.",
    },
    {
      label: "Pelo menos 1 ação habilitada",
      ok: draft.toolsEnabled.length > 0,
      goToStep: 2,
      goToLabel: "O que ela faz",
      advice: "Sem ações, o agente vira só FAQ — não consulta nem transfere.",
    },
    {
      label: "Transferência humana habilitada",
      ok: draft.transferencia?.enabled !== false,
      goToStep: 3,
      goToLabel: "Limites",
      advice: "Sem transferência, cliente irritado fica preso na IA.",
    },
  ];

  const allOk = checks.every((c) => c.ok);
  const verticalDefaults = getVerticalDefaults(draft.vertical);

  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        title="Revisar antes de publicar"
        description="Confira o que está pronto. Itens em laranja não bloqueiam, mas reduzem a qualidade do atendimento."
      />

      {/* Resumo amigável (não markdown cru) */}
      <div className="flex flex-col gap-3">
        <h3 className="text-foreground text-sm font-semibold">Resumo</h3>
        <ul className="border-divider-strong divide-divider-strong divide-y rounded-md border">
          <SummaryRow
            label="Modelo"
            value={
              VERTICAL_OPTIONS.find((v) => v.value === draft.vertical)?.label ?? draft.vertical
            }
          />
          <SummaryRow
            label="Tom"
            value={`${draft.persona?.tom ?? "neutro"} · ${draft.persona?.tratamento === "senhor_senhora" ? "senhor/senhora" : (draft.persona?.tratamento ?? "você")}`}
          />
          <SummaryRow
            label="Ações habilitadas"
            value={
              draft.toolsEnabled.length
                ? draft.toolsEnabled.map((k) => TOOLS_CATALOG[k as ToolKey]?.label ?? k).join(", ")
                : `${verticalDefaults.recommendedTools.length} (padrão do modelo)`
            }
          />
          <SummaryRow
            label="Documentos"
            value={`${knowledge.filter((k) => k.status === "ready").length} disponíveis`}
          />
        </ul>
      </div>

      {/* Checklist */}
      <div className="flex flex-col gap-3">
        <h3 className="text-foreground text-sm font-semibold">Itens críticos</h3>
        <ul className="flex flex-col gap-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-3 text-sm">
              {c.ok ? (
                <CheckCircle2 className="text-accent-light mt-0.5 size-4 shrink-0" />
              ) : (
                <AlertCircle className="text-foreground/60 mt-0.5 size-4 shrink-0" />
              )}
              <div className="flex-1">
                <div className={c.ok ? "text-foreground" : "text-foreground font-medium"}>
                  {c.label}
                </div>
                {!c.ok ? (
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="text-muted-foreground text-xs">{c.advice}</p>
                    <button
                      type="button"
                      onClick={() => onJumpToStep(c.goToStep)}
                      className="text-accent-light text-xs hover:underline"
                    >
                      ir pra {c.goToLabel}
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        {!allOk ? (
          <p className="text-muted-foreground text-xs">
            Você ainda pode publicar com itens pendentes — só vai ter qualidade limitada.
          </p>
        ) : null}
      </div>

      {/* Preview avançado (collapsible) */}
      <details className="group">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm">
          Ver instruções técnicas geradas (avançado)
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadPreview}
            disabled={pending}
            className="self-start"
          >
            {pending ? <Loader2 className="animate-spin" /> : <Phone />}
            Ver instruções
          </Button>
          {previewError ? (
            <Alert variant="destructive">
              <AlertDescription>Erro: {previewError}</AlertDescription>
            </Alert>
          ) : null}
          {previewOpen && preview ? (
            <div className="flex flex-col gap-1">
              <p className="text-muted-foreground text-xs">
                {preview.chars} caracteres · ~{preview.tokens} tokens
              </p>
              <Textarea value={preview.prompt} readOnly rows={20} className="font-mono text-xs" />
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline gap-3 p-3">
      <span className="text-muted-foreground w-32 shrink-0 text-xs tracking-wide uppercase">
        {label}
      </span>
      <span className="text-foreground flex-1 text-sm">{value}</span>
    </li>
  );
}
