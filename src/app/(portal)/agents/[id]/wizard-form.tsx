"use client";

import {
  AlertCircle,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Eye,
  Loader2,
  MessageSquare,
  Settings2,
  Sparkles,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { previewAgentPromptAction } from "@/features/agents/preview-prompt-action";
import { saveAgentWizardSection } from "@/features/agents/save-wizard-action";
import { type DraftState, parseDraftState } from "@/lib/agents/draft-state-schema";
import { getVerticalDefaults, VERTICAL_OPTIONS } from "@/lib/agents/templates/verticals";
import {
  TOOL_CATEGORY_LABEL,
  type ToolKey,
  type ToolMetadata,
  TOOLS_CATALOG,
} from "@/lib/agents/tools-catalog";

export type KnowledgeRef = {
  id: string;
  nome: string;
  descricao: string | null;
  scope: "tenant" | "department" | "agent";
  status: "uploading" | "indexing" | "ready" | "error";
};

type Props = {
  agentId: string;
  initialDraft: unknown;
  /** Knowledge sources do tenant — passadas pra tab Conhecimento. */
  knowledge: KnowledgeRef[];
};

type SaveStatus = { section: string | null; error: string | null };

export function AgentWizardForm({ agentId, initialDraft, knowledge }: Props) {
  const [draft, setDraft] = useState<DraftState>(() => parseDraftState(initialDraft));
  const [save, setSave] = useState<SaveStatus>({ section: null, error: null });
  const [activeTab, setActiveTab] = useState("persona");

  // Verticais que NÃO devem aparecer no select (custom = legacy escape hatch).
  const verticalChoices = VERTICAL_OPTIONS.filter((v) => v.value !== "custom");

  async function saveSection<K extends keyof DraftState>(section: K, value: DraftState[K]) {
    setSave({ section: section as string, error: null });
    try {
      const fd = new FormData();
      fd.set("agentId", agentId);
      fd.set("section", section as string);
      fd.set("payload", JSON.stringify(value));
      const result = await saveAgentWizardSection(fd);
      if (!result.ok) {
        setSave({ section: null, error: result.error });
      } else {
        setDraft((prev) => ({ ...prev, [section]: value }));
        setSave({ section: null, error: null });
      }
    } catch (err) {
      setSave({ section: null, error: err instanceof Error ? err.message : "save_failed" });
    }
  }

  const completion = computeCompletion(draft, knowledge);

  return (
    <div className="flex flex-col gap-4">
      {save.error ? (
        <Alert variant="destructive">
          <AlertDescription>Erro ao salvar: {save.error}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabTriggerWithStatus value="persona" status={completion.persona}>
            <Sparkles className="size-4" />
            Persona
          </TabTriggerWithStatus>
          <TabTriggerWithStatus value="empresa" status={completion.empresa}>
            <Briefcase className="size-4" />
            Empresa
          </TabTriggerWithStatus>
          <TabTriggerWithStatus value="comportamento" status={completion.comportamento}>
            <MessageSquare className="size-4" />
            Comportamento
          </TabTriggerWithStatus>
          <TabTriggerWithStatus value="capacidades" status={completion.capacidades}>
            <Wrench className="size-4" />
            Capacidades
          </TabTriggerWithStatus>
          <TabTriggerWithStatus value="conhecimento" status={completion.conhecimento}>
            <BookOpen className="size-4" />
            Conhecimento
          </TabTriggerWithStatus>
          <TabTriggerWithStatus value="revisao" status={completion.revisao}>
            <Settings2 className="size-4" />
            Revisão
          </TabTriggerWithStatus>
        </TabsList>

        <TabsContent value="persona">
          <PersonaTab
            draft={draft}
            verticalChoices={verticalChoices}
            saveSection={saveSection}
            saveSectionName={save.section}
          />
        </TabsContent>

        <TabsContent value="empresa">
          <EmpresaTab draft={draft} saveSection={saveSection} saveSectionName={save.section} />
        </TabsContent>

        <TabsContent value="comportamento">
          <ComportamentoTab
            draft={draft}
            saveSection={saveSection}
            saveSectionName={save.section}
          />
        </TabsContent>

        <TabsContent value="capacidades">
          <CapacidadesTab draft={draft} saveSection={saveSection} saveSectionName={save.section} />
        </TabsContent>

        <TabsContent value="conhecimento">
          <ConhecimentoTab knowledge={knowledge} />
        </TabsContent>

        <TabsContent value="revisao">
          <RevisaoTab agentId={agentId} draft={draft} knowledge={knowledge} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===========================================================================
// Completion / status badges
// ===========================================================================

type TabStatus = "complete" | "partial" | "empty";
type Completion = Record<
  "persona" | "empresa" | "comportamento" | "capacidades" | "conhecimento" | "revisao",
  TabStatus
>;

function computeCompletion(draft: DraftState, knowledge: KnowledgeRef[]): Completion {
  // Persona: descricaoCurta + persona configurada (algum campo preenchido)
  const personaFilled = !!draft.identity?.descricaoCurta?.trim();
  const personaPartial = !!(draft.persona?.tom || draft.persona?.tratamento);
  const persona: TabStatus = personaFilled ? "complete" : personaPartial ? "partial" : "empty";

  // Empresa: segmento + horario são essenciais
  const empresaCore =
    !!draft.empresa?.segmento?.trim() && !!draft.empresa?.horarioComercial?.trim();
  const empresaSomething =
    !!draft.empresa?.segmento ||
    !!draft.empresa?.publicoAlvo ||
    !!draft.empresa?.diferenciais ||
    !!draft.empresa?.horarioComercial;
  const empresa: TabStatus = empresaCore ? "complete" : empresaSomething ? "partial" : "empty";

  // Comportamento: pelo menos 1 dos campos do bloco preenchido
  const c = draft.comportamento ?? {};
  const sit = draft.situacoesCriticas ?? {};
  const comportamentoSomething =
    !!c.saudacaoInicial ||
    !!c.identificacaoCliente ||
    (c.restricoesLinguagem?.length ?? 0) > 0 ||
    !!c.lgpdPolicy ||
    !!sit.clienteIrritado ||
    !!sit.urgencia ||
    !!sit.foraEscopo ||
    !!sit.foraHorario ||
    !!draft.encerramento;
  const comportamento: TabStatus = comportamentoSomething ? "complete" : "empty";

  // Capacidades: pelo menos 1 tool habilitada
  const capacidades: TabStatus = draft.toolsEnabled.length
    ? "complete"
    : draft.workflows.length || draft.limites.length
      ? "partial"
      : "empty";

  // Conhecimento: status puramente informativo
  const conhecimento: TabStatus = knowledge.some((k) => k.status === "ready")
    ? "complete"
    : knowledge.length
      ? "partial"
      : "empty";

  // Revisao: aggregate — todas as tabs core (persona/empresa/comportamento/capacidades) >= partial
  const allCore = [persona, empresa, comportamento, capacidades];
  const revisao: TabStatus = allCore.every((s) => s === "complete")
    ? "complete"
    : allCore.some((s) => s !== "empty")
      ? "partial"
      : "empty";

  return { persona, empresa, comportamento, capacidades, conhecimento, revisao };
}

function TabTriggerWithStatus({
  value,
  status,
  children,
}: {
  value: string;
  status: TabStatus;
  children: React.ReactNode;
}) {
  return (
    <TabsTrigger value={value} className="gap-2">
      {children}
      {status === "complete" ? (
        <CheckCircle2 className="text-accent-light size-3" aria-label="completo" />
      ) : status === "partial" ? (
        <span className="bg-accent-light/40 size-1.5 rounded-sm" aria-label="parcial" />
      ) : null}
    </TabsTrigger>
  );
}

// ===========================================================================
// Tabs
// ===========================================================================

type TabProps = {
  draft: DraftState;
  saveSection: <T extends keyof DraftState>(section: T, value: DraftState[T]) => Promise<void>;
  saveSectionName: string | null;
};

// --- Persona ---------------------------------------------------------------

function PersonaTab({
  draft,
  verticalChoices,
  saveSection,
  saveSectionName,
}: TabProps & { verticalChoices: typeof VERTICAL_OPTIONS }) {
  const verticalDefaults = getVerticalDefaults(draft.vertical);
  return (
    <div className="flex flex-col gap-4">
      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Modelo de agente (vertical)"
          description="Define defaults de workflows, limites e situações típicas."
          saving={saveSectionName === "vertical"}
        />
        <Select
          value={draft.vertical}
          onValueChange={(v) => saveSection("vertical", v as DraftState["vertical"])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {verticalChoices.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} disabled={opt.soon}>
                {opt.label}
                {opt.soon ? " (em breve)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Identidade"
          description="Descrição curta da empresa (1-3 linhas que abrem o prompt)."
          saving={saveSectionName === "identity"}
        />
        <Textarea
          rows={3}
          maxLength={500}
          defaultValue={draft.identity?.descricaoCurta ?? ""}
          placeholder={verticalDefaults.defaultIdentityHint}
          onBlur={(e) => saveSection("identity", { descricaoCurta: e.currentTarget.value })}
        />
      </Card>

      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Persona"
          description="Tom, energia, características, idioma e tratamento."
          saving={saveSectionName === "persona"}
        />
        <PersonaFields value={draft.persona} onChange={(v) => saveSection("persona", v)} />
      </Card>
    </div>
  );
}

// --- Empresa ---------------------------------------------------------------

function EmpresaTab({ draft, saveSection, saveSectionName }: TabProps) {
  const verticalDefaults = getVerticalDefaults(draft.vertical);
  return (
    <div className="flex flex-col gap-4">
      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="A empresa"
          description="Fatos que o cliente conhece de cor sobre o próprio negócio."
          saving={saveSectionName === "empresa"}
        />
        <EmpresaFields
          value={draft.empresa}
          placeholders={verticalDefaults.placeholders}
          onChange={(v) => saveSection("empresa", v)}
        />
      </Card>

      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Glossário interno"
          description="Termos próprios da empresa que o agente deve reconhecer."
          saving={saveSectionName === "glossario"}
        />
        <GlossarioEditor values={draft.glossario} onChange={(v) => saveSection("glossario", v)} />
      </Card>
    </div>
  );
}

// --- Comportamento ---------------------------------------------------------

function ComportamentoTab({ draft, saveSection, saveSectionName }: TabProps) {
  const verticalDefaults = getVerticalDefaults(draft.vertical);
  const c = draft.comportamento ?? {};
  function updateComportamento(patch: Partial<NonNullable<DraftState["comportamento"]>>) {
    saveSection("comportamento", { ...c, ...patch });
  }
  return (
    <div className="flex flex-col gap-4">
      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Saudação inicial"
          description="Como o agente abre a ligação. Vazio = template usa horário automático."
          saving={saveSectionName === "comportamento"}
        />
        <Textarea
          rows={2}
          maxLength={500}
          defaultValue={c.saudacaoInicial ?? ""}
          placeholder={verticalDefaults.defaultSaudacaoInicial}
          onBlur={(e) =>
            updateComportamento({ saudacaoInicial: e.currentTarget.value || undefined })
          }
        />
      </Card>

      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Identificação do cliente"
          description="O agente deve confirmar identidade antes de fornecer dados?"
          saving={saveSectionName === "comportamento"}
        />
        <Select
          value={c.identificacaoCliente ?? "none"}
          onValueChange={(v) =>
            updateComportamento({
              identificacaoCliente: v as NonNullable<typeof c.identificacaoCliente>,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Não pede</SelectItem>
            <SelectItem value="phone">Confirma telefone</SelectItem>
            <SelectItem value="cpf_cnpj">Pede CPF/CNPJ</SelectItem>
            <SelectItem value="full">Pede nome + CPF/CNPJ + email/telefone</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Encerramento"
          description="Frase final da ligação."
          saving={saveSectionName === "encerramento"}
        />
        <Textarea
          rows={2}
          maxLength={500}
          defaultValue={draft.encerramento ?? ""}
          placeholder={verticalDefaults.defaultEncerramento}
          onBlur={(e) => saveSection("encerramento", e.currentTarget.value || undefined)}
        />
      </Card>

      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Restrições de linguagem"
          description="Palavras/expressões que o agente NÃO deve usar."
          saving={saveSectionName === "comportamento"}
        />
        <ListEditor
          values={c.restricoesLinguagem ?? []}
          defaults={[]}
          placeholder='ex: nunca usar "querida"'
          onChange={(v) => updateComportamento({ restricoesLinguagem: v })}
        />
      </Card>

      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Privacidade / LGPD"
          description="Como tratar dados de outros clientes. Vazio = usa default do vertical."
          saving={saveSectionName === "comportamento"}
        />
        <Textarea
          rows={4}
          maxLength={1000}
          defaultValue={c.lgpdPolicy ?? ""}
          placeholder={verticalDefaults.defaultLgpdPolicy}
          onBlur={(e) => updateComportamento({ lgpdPolicy: e.currentTarget.value || undefined })}
        />
      </Card>

      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Situações críticas"
          description="Como agir em momentos delicados. Vazio = usa default do vertical."
          saving={saveSectionName === "situacoesCriticas"}
        />
        <SituacoesFields
          value={draft.situacoesCriticas}
          defaults={verticalDefaults.defaultSituacoes}
          onChange={(v) => saveSection("situacoesCriticas", v)}
        />
      </Card>
    </div>
  );
}

// --- Capacidades -----------------------------------------------------------

function CapacidadesTab({ draft, saveSection, saveSectionName }: TabProps) {
  const verticalDefaults = getVerticalDefaults(draft.vertical);
  const t = draft.transferencia ?? {};
  function updateTransferencia(patch: Partial<NonNullable<DraftState["transferencia"]>>) {
    saveSection("transferencia", { ...t, ...patch });
  }
  return (
    <div className="flex flex-col gap-4">
      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Ações disponíveis (tools)"
          description="Marque as ações que o agente pode executar."
          saving={saveSectionName === "toolsEnabled"}
        />
        <ToolsCheckboxes
          enabled={draft.toolsEnabled}
          recommended={verticalDefaults.recommendedTools}
          onChange={(v) => saveSection("toolsEnabled", v)}
        />
      </Card>

      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Workflows (cenários comuns)"
          description="Roteiros que o agente segue. Sem nada = usa defaults do vertical."
          saving={saveSectionName === "workflows"}
        />
        <WorkflowsEditor
          values={draft.workflows}
          defaults={verticalDefaults.defaultWorkflows}
          onChange={(v) => saveSection("workflows", v)}
        />
      </Card>

      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Transferência humana"
          description="Quando o agente deve passar pra atendente humano."
          saving={saveSectionName === "transferencia"}
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="transfer-enabled"
            checked={t.enabled !== false}
            onChange={(e) => updateTransferencia({ enabled: e.currentTarget.checked })}
          />
          <Label htmlFor="transfer-enabled">Habilitar transferência</Label>
        </div>
        {t.enabled !== false ? (
          <>
            <div>
              <Label className="text-xs">Critérios pra transferir</Label>
              <ListEditor
                values={t.criterios ?? []}
                defaults={verticalDefaults.defaultTransferenciaCriterios}
                placeholder="ex: cliente alterado após 2 trocas"
                onChange={(v) => updateTransferencia({ criterios: v })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs">Antes de transferir, sempre fazer:</Label>
              <Textarea
                rows={2}
                maxLength={800}
                defaultValue={t.preTransferenciaAcoes ?? ""}
                placeholder={verticalDefaults.defaultPreTransferenciaAcoes}
                onBlur={(e) =>
                  updateTransferencia({
                    preTransferenciaAcoes: e.currentTarget.value || undefined,
                  })
                }
              />
            </div>
          </>
        ) : null}
      </Card>

      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Limites (NUNCA faça)"
          description="Regras absolutas. Vazio = usa defaults do vertical."
          saving={saveSectionName === "limites"}
        />
        <ListEditor
          values={draft.limites}
          defaults={verticalDefaults.defaultLimites}
          placeholder="ex: prometer prazo sem consultar"
          onChange={(v) => saveSection("limites", v)}
        />
      </Card>
    </div>
  );
}

// --- Conhecimento ----------------------------------------------------------

function ConhecimentoTab({ knowledge }: { knowledge: KnowledgeRef[] }) {
  const ready = knowledge.filter((k) => k.status === "ready");
  const pending = knowledge.filter((k) => k.status !== "ready");

  return (
    <div className="flex flex-col gap-4">
      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader title="Base de conhecimento" />
        <p className="text-muted-foreground text-sm">
          O agente consulta automaticamente os documentos que estão prontos. Anexar/remover
          documentos é feito em{" "}
          <Link href="/knowledge" className="text-accent-light underline">
            Conhecimento
          </Link>
          .
        </p>

        {knowledge.length === 0 ? (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertDescription>
              Nenhum documento na base. O agente vai responder só com o que está no prompt — sem
              catálogo, política, FAQs. Recomendado adicionar pelo menos 1 documento por tópico
              (catálogo, troca, FAQ).
            </AlertDescription>
          </Alert>
        ) : null}

        {ready.length > 0 ? (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Prontos pra consulta ({ready.length})
            </p>
            <ul className="flex flex-col gap-2">
              {ready.map((k) => (
                <li key={k.id} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="text-accent-light mt-0.5 size-4" />
                  <div className="flex-1">
                    <div className="font-medium">{k.nome}</div>
                    {k.descricao ? (
                      <p className="text-muted-foreground text-xs">{k.descricao}</p>
                    ) : null}
                    <p className="text-muted-foreground text-xs">Escopo: {k.scope}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {pending.length > 0 ? (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Em processamento ({pending.length})
            </p>
            <ul className="flex flex-col gap-2">
              {pending.map((k) => (
                <li key={k.id} className="text-muted-foreground flex items-start gap-2 text-sm">
                  <Loader2 className="mt-0.5 size-4 animate-spin" />
                  <div className="flex-1">
                    <div>{k.nome}</div>
                    <p className="text-xs">Status: {k.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

// --- Revisao ---------------------------------------------------------------

function RevisaoTab({
  agentId,
  draft,
  knowledge,
}: {
  agentId: string;
  draft: DraftState;
  knowledge: KnowledgeRef[];
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

  const checks = computeChecklistItems(draft, knowledge);
  const allOk = checks.every((c) => c.ok);

  return (
    <div className="flex flex-col gap-4">
      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader title="Checklist antes de publicar" />
        <ul className="flex flex-col gap-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2 text-sm">
              {c.ok ? (
                <CheckCircle2 className="text-accent-light mt-0.5 size-4" />
              ) : (
                <AlertCircle className="text-foreground/60 mt-0.5 size-4" />
              )}
              <div className="flex-1">
                <div className={c.ok ? "" : "font-medium"}>{c.label}</div>
                {c.ok ? null : <p className="text-muted-foreground text-xs">{c.advice}</p>}
              </div>
            </li>
          ))}
        </ul>
        {!allOk ? (
          <p className="text-muted-foreground text-xs">
            Itens em laranja não bloqueiam publicação, mas reduzem qualidade do agente. Volte às
            tabs anteriores pra preencher.
          </p>
        ) : null}
      </Card>

      <Card variant="solid" padding="default" className="flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Prompt gerado</h3>
            <p className="text-muted-foreground text-sm">
              Renderiza o prompt final que vai pro Gemini Live.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={loadPreview} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Eye />}
            Ver prompt
          </Button>
        </div>
        {previewError ? (
          <Alert variant="destructive">
            <AlertDescription>Erro: {previewError}</AlertDescription>
          </Alert>
        ) : null}
        {previewOpen && preview ? (
          <details open className="mt-2">
            <summary className="text-muted-foreground cursor-pointer text-xs">
              {preview.chars} chars · ~{preview.tokens} tokens
            </summary>
            <pre className="bg-muted mt-2 max-h-[500px] overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">
              {preview.prompt}
            </pre>
          </details>
        ) : null}
      </Card>

      <p className="text-muted-foreground text-center text-xs">
        Usar o botão &ldquo;Publicar&rdquo; no topo da página pra criar nova versão.
      </p>
    </div>
  );
}

function computeChecklistItems(draft: DraftState, knowledge: KnowledgeRef[]) {
  return [
    {
      label: "Identidade da empresa preenchida",
      ok: !!draft.identity?.descricaoCurta?.trim(),
      advice: "Tab Persona → Identidade. Cliente sem descrição soa genérico.",
    },
    {
      label: "Persona configurada (tom + tratamento)",
      ok: !!(draft.persona?.tom && draft.persona?.tratamento),
      advice: "Tab Persona → Persona. Define como o agente fala.",
    },
    {
      label: "Empresa: segmento + horário comercial",
      ok: !!(draft.empresa?.segmento?.trim() && draft.empresa?.horarioComercial?.trim()),
      advice: "Tab Empresa. Sem isso, agente não sabe contextualizar.",
    },
    {
      label: "Pelo menos 1 ação habilitada",
      ok: draft.toolsEnabled.length > 0,
      advice:
        "Tab Capacidades → Tools. Sem ações, agente vira só FAQ — não consulta nem transfere.",
    },
    {
      label: "Transferência humana habilitada",
      ok: draft.transferencia?.enabled !== false,
      advice: "Tab Capacidades → Transferência. Sem isso, cliente irritado fica preso no bot.",
    },
    {
      label: "Pelo menos 1 documento na base de conhecimento",
      ok: knowledge.some((k) => k.status === "ready"),
      advice:
        "Tab Conhecimento → Adicione catálogo, FAQ ou política. Sem isso, agente não sabe responder factual.",
    },
  ];
}

// ===========================================================================
// Sub-components compartilhados
// ===========================================================================

function SectionHeader({
  title,
  description,
  saving,
}: {
  title: string;
  description?: string;
  saving?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <h3 className="font-medium">{title}</h3>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {saving ? (
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <Loader2 className="size-3 animate-spin" /> salvando...
        </span>
      ) : null}
    </div>
  );
}

function PersonaFields({
  value,
  onChange,
}: {
  value: DraftState["persona"];
  onChange: (v: NonNullable<DraftState["persona"]>) => void;
}) {
  const v = value ?? {};
  function update(patch: Partial<NonNullable<DraftState["persona"]>>) {
    onChange({
      tom: v.tom ?? "neutro",
      energia: v.energia ?? "equilibrada",
      traits: v.traits ?? [],
      idioma: v.idioma ?? "pt-BR",
      tratamento: v.tratamento ?? "voce",
      autoIdentificacao: v.autoIdentificacao ?? "explica_se_perguntado",
      saudacaoPorHorario: v.saudacaoPorHorario ?? true,
      ...patch,
    });
  }
  const traitOptions: { key: NonNullable<typeof v.traits>[number]; label: string }[] = [
    { key: "empatica", label: "Empática" },
    { key: "objetiva", label: "Objetiva" },
    { key: "paciente", label: "Paciente" },
    { key: "divertida", label: "Divertida" },
    { key: "tecnica", label: "Técnica" },
    { key: "acolhedora", label: "Acolhedora" },
    { key: "confiante", label: "Confiante" },
    { key: "discreta", label: "Discreta" },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label>Tom</Label>
        <Select value={v.tom ?? "neutro"} onValueChange={(x) => update({ tom: x as never })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="formal">Formal</SelectItem>
            <SelectItem value="neutro">Neutro</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Energia</Label>
        <Select
          value={v.energia ?? "equilibrada"}
          onValueChange={(x) => update({ energia: x as never })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="calma">Calma</SelectItem>
            <SelectItem value="equilibrada">Equilibrada</SelectItem>
            <SelectItem value="animada">Animada</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Idioma</Label>
        <Select value={v.idioma ?? "pt-BR"} onValueChange={(x) => update({ idioma: x as never })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pt-BR">Português (BR)</SelectItem>
            <SelectItem value="en-US">English (US)</SelectItem>
            <SelectItem value="es-ES">Español</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Tratamento</Label>
        <Select
          value={v.tratamento ?? "voce"}
          onValueChange={(x) => update({ tratamento: x as never })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="voce">Você (informal)</SelectItem>
            <SelectItem value="senhor_senhora">Senhor / Senhora (formal)</SelectItem>
            <SelectItem value="voces_informal">Vocês (plural)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label>Auto-identificação como IA</Label>
        <Select
          value={v.autoIdentificacao ?? "explica_se_perguntado"}
          onValueChange={(x) => update({ autoIdentificacao: x as never })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="assume_ia">Assume IA naturalmente (mais transparente)</SelectItem>
            <SelectItem value="explica_se_perguntado">Confirma só se perguntado direto</SelectItem>
            <SelectItem value="nega">Desvia (não recomendado — risco LGPD)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <input
          type="checkbox"
          id="saudacao-horario"
          checked={v.saudacaoPorHorario ?? true}
          onChange={(e) => update({ saudacaoPorHorario: e.currentTarget.checked })}
        />
        <Label htmlFor="saudacao-horario">Adaptar saudação ao horário (Bom dia/tarde/noite)</Label>
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label>Características marcantes</Label>
        <div className="flex flex-wrap gap-2">
          {traitOptions.map((t) => {
            const active = (v.traits ?? []).includes(t.key);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  const next = active
                    ? (v.traits ?? []).filter((x) => x !== t.key)
                    : [...(v.traits ?? []), t.key];
                  update({ traits: next });
                }}
                className={`rounded-md border px-2 py-1 text-xs ${
                  active
                    ? "border-accent-light bg-accent/20 text-accent-light"
                    : "border-border text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmpresaFields({
  value,
  placeholders,
  onChange,
}: {
  value: DraftState["empresa"];
  placeholders: {
    segmento: string;
    publicoAlvo: string;
    diferenciais: string;
    horarioComercial: string;
  };
  onChange: (v: NonNullable<DraftState["empresa"]>) => void;
}) {
  const v = value ?? {};
  function update(patch: Partial<NonNullable<DraftState["empresa"]>>) {
    onChange({
      segmento: v.segmento ?? "",
      publicoAlvo: v.publicoAlvo ?? "",
      diferenciais: v.diferenciais ?? "",
      horarioComercial: v.horarioComercial ?? "",
      endereco: v.endereco,
      site: v.site,
      outrosCanais: v.outrosCanais,
      ...patch,
    });
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field
        label="Segmento"
        value={v.segmento ?? ""}
        placeholder={placeholders.segmento}
        onBlur={(x) => update({ segmento: x })}
      />
      <Field
        label="Público atendido"
        value={v.publicoAlvo ?? ""}
        placeholder={placeholders.publicoAlvo}
        onBlur={(x) => update({ publicoAlvo: x })}
      />
      <Field
        label="Diferenciais"
        value={v.diferenciais ?? ""}
        placeholder={placeholders.diferenciais}
        onBlur={(x) => update({ diferenciais: x })}
        textarea
        className="sm:col-span-2"
      />
      <Field
        label="Horário comercial"
        value={v.horarioComercial ?? ""}
        placeholder={placeholders.horarioComercial}
        onBlur={(x) => update({ horarioComercial: x })}
      />
      <Field
        label="Endereço (opcional)"
        value={v.endereco ?? ""}
        onBlur={(x) => update({ endereco: x || undefined })}
      />
      <Field
        label="Site (opcional)"
        value={v.site ?? ""}
        onBlur={(x) => update({ site: x || undefined })}
      />
      <Field
        label="Outros canais (opcional)"
        value={v.outrosCanais ?? ""}
        onBlur={(x) => update({ outrosCanais: x || undefined })}
      />
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onBlur,
  textarea,
  className,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onBlur: (v: string) => void;
  textarea?: boolean;
  className?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {textarea ? (
        <Textarea
          id={id}
          rows={2}
          defaultValue={value}
          placeholder={placeholder}
          onBlur={(e) => onBlur(e.currentTarget.value)}
        />
      ) : (
        <Input
          id={id}
          defaultValue={value}
          placeholder={placeholder}
          onBlur={(e) => onBlur(e.currentTarget.value)}
        />
      )}
    </div>
  );
}

function ToolsCheckboxes({
  enabled,
  recommended,
  onChange,
}: {
  enabled: string[];
  recommended: readonly ToolKey[];
  onChange: (v: string[]) => void;
}) {
  const grouped: Record<ToolMetadata["category"], ToolMetadata[]> = {
    informacao: [],
    acao: [],
    escalacao: [],
  };
  for (const t of Object.values(TOOLS_CATALOG)) grouped[t.category].push(t);

  function toggle(key: string) {
    onChange(enabled.includes(key) ? enabled.filter((k) => k !== key) : [...enabled, key]);
  }

  return (
    <div className="flex flex-col gap-3">
      {(Object.keys(grouped) as Array<ToolMetadata["category"]>).map((cat) => (
        <div key={cat}>
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            {TOOL_CATEGORY_LABEL[cat]}
          </p>
          <div className="flex flex-col gap-1">
            {grouped[cat].map((t) => {
              const isOn = enabled.includes(t.key);
              const isRecommended = recommended.includes(t.key);
              return (
                <label key={t.key} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => toggle(t.key)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t.label}</span>
                      {isRecommended ? (
                        <span className="text-accent-light text-xs">recomendada</span>
                      ) : null}
                      {t.requiresIntegration ? (
                        <span className="text-muted-foreground text-xs">
                          (requer {t.requiresIntegration})
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground text-xs">{t.descricaoCurta}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListEditor({
  values,
  defaults,
  placeholder,
  onChange,
}: {
  values: string[];
  defaults: readonly string[];
  placeholder: string;
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const items = values.length ? values : Array.from(defaults);
  const usingDefaults = values.length === 0 && defaults.length > 0;
  return (
    <div className="flex flex-col gap-2">
      {usingDefaults ? (
        <p className="text-muted-foreground text-xs">
          Usando defaults do vertical. Adicione/remova itens pra customizar.
        </p>
      ) : null}
      <ul className="flex flex-col gap-1">
        {items.map((item, i) => (
          <li key={`${i}-${item}`} className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">•</span>
            <span className="flex-1">{item}</span>
            {!usingDefaults ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
              >
                Remover
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.currentTarget.value)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!draft.trim()) return;
            onChange([...(values.length ? values : Array.from(defaults)), draft.trim()]);
            setDraft("");
          }}
        >
          Adicionar
        </Button>
      </div>
    </div>
  );
}

function GlossarioEditor({
  values,
  onChange,
}: {
  values: NonNullable<DraftState["glossario"]>;
  onChange: (v: NonNullable<DraftState["glossario"]>) => void;
}) {
  const [termo, setTermo] = useState("");
  const [significado, setSignificado] = useState("");
  return (
    <div className="flex flex-col gap-2">
      {values.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Vazio. Use pra registrar termos próprios da empresa que o agente deve reconhecer (ex:
          &ldquo;OS&rdquo; = Ordem de Serviço).
        </p>
      ) : null}
      <ul className="flex flex-col gap-1">
        {values.map((item, i) => (
          <li key={`${i}-${item.termo}`} className="flex items-start gap-2 text-sm">
            <div className="flex-1">
              <span className="font-medium">{item.termo}</span>
              <span className="text-muted-foreground"> — {item.significado}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
            >
              Remover
            </Button>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Input
          value={termo}
          placeholder="Termo (ex: OS)"
          onChange={(e) => setTermo(e.currentTarget.value)}
        />
        <Input
          className="sm:col-span-2"
          value={significado}
          placeholder="Significado (ex: Ordem de Serviço — chamado de manutenção)"
          onChange={(e) => setSignificado(e.currentTarget.value)}
        />
      </div>
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!termo.trim() || !significado.trim()) return;
            onChange([...values, { termo: termo.trim(), significado: significado.trim() }]);
            setTermo("");
            setSignificado("");
          }}
        >
          Adicionar termo
        </Button>
      </div>
    </div>
  );
}

function WorkflowsEditor({
  values,
  defaults,
  onChange,
}: {
  values: DraftState["workflows"];
  defaults: ReadonlyArray<{ titulo: string; gatilho: string; passos: string; enabled: boolean }>;
  onChange: (v: DraftState["workflows"]) => void;
}) {
  // Se não tem nada user-input, mostra defaults clonados como "imutáveis até editar"
  const usingDefaults = values.length === 0;
  const items = usingDefaults ? defaults.map((d) => ({ ...d })) : values;

  function update(i: number, patch: Partial<(typeof items)[number]>) {
    const base = usingDefaults ? defaults.map((d) => ({ ...d })) : [...values];
    base[i] = { ...base[i]!, ...patch };
    onChange(base);
  }

  function remove(i: number) {
    const base = usingDefaults ? defaults.map((d) => ({ ...d })) : [...values];
    base.splice(i, 1);
    onChange(base);
  }

  function add() {
    const base = usingDefaults ? defaults.map((d) => ({ ...d })) : [...values];
    base.push({
      titulo: "",
      gatilho: "",
      passos: "",
      enabled: true,
    });
    onChange(base);
  }

  return (
    <div className="flex flex-col gap-3">
      {usingDefaults ? (
        <p className="text-muted-foreground text-xs">
          Usando workflows default do vertical. Edite qualquer campo pra começar a customizar (a
          partir desse momento, o portal salva sua versão e o vertical vira referência).
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {items.map((w, i) => (
          <li key={i} className="border-divider-strong flex flex-col gap-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <Input
                defaultValue={w.titulo}
                placeholder="Título do cenário"
                className="font-medium"
                onBlur={(e) => update(i, { titulo: e.currentTarget.value })}
              />
              <label className="text-muted-foreground flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={w.enabled}
                  onChange={(e) => update(i, { enabled: e.currentTarget.checked })}
                />
                ativo
              </label>
              <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>
                Remover
              </Button>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Quando isso acontece</Label>
              <Input
                defaultValue={w.gatilho}
                placeholder="ex: Cliente pergunta status do pedido"
                onBlur={(e) => update(i, { gatilho: e.currentTarget.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Passos a seguir</Label>
              <Textarea
                rows={4}
                defaultValue={w.passos}
                placeholder={
                  "1. Pergunte número do pedido\n2. Use consultar_pedido\n3. Informe status"
                }
                onBlur={(e) => update(i, { passos: e.currentTarget.value })}
              />
            </div>
          </li>
        ))}
      </ul>

      <div>
        <Button type="button" variant="outline" onClick={add}>
          + Adicionar workflow
        </Button>
      </div>
    </div>
  );
}

function SituacoesFields({
  value,
  defaults,
  onChange,
}: {
  value: DraftState["situacoesCriticas"];
  defaults: { clienteIrritado: string; urgencia: string; foraEscopo: string; foraHorario: string };
  onChange: (v: NonNullable<DraftState["situacoesCriticas"]>) => void;
}) {
  const v = value ?? {};
  function update(patch: Partial<NonNullable<DraftState["situacoesCriticas"]>>) {
    onChange({ ...v, ...patch });
  }
  const fields: Array<{ key: keyof typeof defaults; label: string }> = [
    { key: "clienteIrritado", label: "Cliente irritado" },
    { key: "urgencia", label: "Urgência" },
    { key: "foraEscopo", label: "Pergunta fora do escopo" },
    { key: "foraHorario", label: "Fora do horário comercial" },
  ];
  return (
    <div className="flex flex-col gap-3">
      {fields.map((f) => (
        <div key={f.key} className="flex flex-col gap-1">
          <Label className="text-xs">{f.label}</Label>
          <Textarea
            rows={2}
            maxLength={800}
            defaultValue={v[f.key] ?? ""}
            placeholder={defaults[f.key]}
            onBlur={(e) => update({ [f.key]: e.currentTarget.value || undefined })}
          />
        </div>
      ))}
    </div>
  );
}
