"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { saveAgentWizardSection } from "@/features/agents/save-wizard-action";
import { type DraftState, parseDraftState } from "@/lib/agents/draft-state-schema";

import { type StepInfo, WizardStepper } from "./wizard-stepper";
import {
  type KnowledgeRef,
  StepAcoes,
  StepConversa,
  StepLimites,
  StepPersonalidade,
  StepRevisao,
} from "./wizard-steps";

// ---------------------------------------------------------------------------
// Tipos / config dos passos.
// Configuração da EMPRESA não mora aqui — é responsabilidade do tenant
// (cadastro + base de conhecimento). Wizard só configura agente.
// ---------------------------------------------------------------------------

const STEPS = [
  { key: "personalidade", label: "Personalidade" },
  { key: "conversa", label: "Como conversa" },
  { key: "acoes", label: "O que faz" },
  { key: "limites", label: "Limites" },
  { key: "revisao", label: "Revisar" },
] as const;

type Props = {
  agentId: string;
  initialDraft: unknown;
  knowledge: KnowledgeRef[];
  /** Nome fantasia do tenant — usado em placeholders/exemplos do wizard. */
  tenantNomeFantasia: string;
};

// ---------------------------------------------------------------------------

export function AgentWizardForm({ agentId, initialDraft, knowledge, tenantNomeFantasia }: Props) {
  const [draft, setDraft] = useState<DraftState>(() => parseDraftState(initialDraft));
  const [stepIndex, setStepIndex] = useState(0);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Save otimista. Atualiza estado local imediatamente, server roda em
  // background — rollback se falhar. Mantém UI fluida.
  async function saveSection<K extends keyof DraftState>(section: K, value: DraftState[K]) {
    const previous = draft[section];
    setDraft((prev) => ({ ...prev, [section]: value }));
    setSavingSection(section as string);
    setSaveError(null);
    try {
      const fd = new FormData();
      fd.set("agentId", agentId);
      fd.set("section", section as string);
      fd.set("payload", JSON.stringify(value));
      const result = await saveAgentWizardSection(fd);
      if (!result.ok) {
        setDraft((prev) => ({ ...prev, [section]: previous }));
        setSaveError(result.error);
      }
    } catch (err) {
      setDraft((prev) => ({ ...prev, [section]: previous }));
      setSaveError(err instanceof Error ? err.message : "save_failed");
    } finally {
      setSavingSection(null);
    }
  }

  // Navegação — força blur antes pra disparar onCommit pendente.
  function goTo(index: number) {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, index)));
  }

  const completion = computeCompletion(draft);
  // ✓ só aparece em steps que o user JÁ PASSOU (i < stepIndex). Steps
  // futuros ficam neutros mesmo que tecnicamente tenham dado preenchido
  // — evita a confusão de "ainda não cheguei lá mas mostra completo".
  const stepInfos: StepInfo[] = STEPS.map((s, i) => ({
    key: s.key,
    label: s.label,
    status:
      i === stepIndex
        ? "current"
        : i < stepIndex && completion[s.key as keyof typeof completion] === "complete"
          ? "complete"
          : "pending",
  }));

  const current = STEPS[stepIndex]!;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <div className="flex flex-col gap-8">
      {/* Stepper topo */}
      <WizardStepper steps={stepInfos} onJump={goTo} />

      {saveError ? (
        <Alert variant="destructive">
          <AlertDescription>Não consegui salvar: {saveError}</AlertDescription>
        </Alert>
      ) : null}

      {/* Conteúdo do step atual */}
      <div className="min-h-[400px]">
        {current.key === "personalidade" ? (
          <StepPersonalidade draft={draft} saveSection={saveSection} />
        ) : null}
        {current.key === "conversa" ? (
          <StepConversa
            draft={draft}
            saveSection={saveSection}
            tenantNomeFantasia={tenantNomeFantasia}
          />
        ) : null}
        {current.key === "acoes" ? <StepAcoes draft={draft} saveSection={saveSection} /> : null}
        {current.key === "limites" ? <StepLimites draft={draft} saveSection={saveSection} /> : null}
        {current.key === "revisao" ? (
          <StepRevisao agentId={agentId} draft={draft} knowledge={knowledge} onJumpToStep={goTo} />
        ) : null}
      </div>

      {/* Footer fixo: voltar / próximo */}
      <div className="border-divider-strong flex items-center justify-between gap-4 border-t pt-6">
        <Button
          type="button"
          variant="ghost"
          disabled={isFirst}
          onClick={() => goTo(stepIndex - 1)}
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Button>

        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          {savingSection ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              salvando…
            </>
          ) : (
            <>
              <CheckCircle2 className="text-accent-light size-3" />
              salvo
            </>
          )}
        </div>

        {!isLast ? (
          <Button type="button" onClick={() => goTo(stepIndex + 1)}>
            Próximo
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <span className="text-muted-foreground text-xs">
            Use o botão &ldquo;Publicar&rdquo; no topo da página.
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Completion por step — usado no Stepper pra mostrar checks
// ---------------------------------------------------------------------------

type StepStatus = "complete" | "pending";

function computeCompletion(draft: DraftState): Record<(typeof STEPS)[number]["key"], StepStatus> {
  // Cada step só conta como "complete" se o user EXPLICITAMENTE preencheu
  // algo — não basta o schema ter defaults sensatos. Senão tudo aparece
  // verde sem o user ter tocado.

  // Personalidade: persona objeto presente = user salvou (mesmo se aceitou
  // os defaults). Persona ausente = nunca tocou.
  const personalidade: StepStatus = draft.persona ? "complete" : "pending";

  // Conversa: precisa pelo menos 1 campo de comportamento/encerramento
  // diferente do default zerado.
  const conversa: StepStatus =
    !!draft.comportamento?.saudacaoInicial ||
    !!draft.encerramento ||
    (!!draft.comportamento?.identificacaoCliente &&
      draft.comportamento.identificacaoCliente !== "none") ||
    (draft.comportamento?.restricoesLinguagem?.length ?? 0) > 0
      ? "complete"
      : "pending";

  // Ações: pelo menos 1 tool habilitada explicitamente (lista vazia conta
  // como "usando recommended" — não é confirmação do user).
  const acoes: StepStatus = draft.toolsEnabled.length > 0 ? "complete" : "pending";

  // Limites: limites custom OR LGPD custom OR critérios de transferência
  // custom. transferencia.enabled (boolean) não conta — defaulta true.
  const limites: StepStatus =
    draft.limites.length > 0 ||
    !!draft.comportamento?.lgpdPolicy ||
    (draft.transferencia?.criterios?.length ?? 0) > 0
      ? "complete"
      : "pending";

  // Revisão: derivada — completa quando os críticos estão OK.
  const revisao: StepStatus = [personalidade, acoes].every((s) => s === "complete")
    ? "complete"
    : "pending";

  return { personalidade, conversa, acoes, limites, revisao };
}
