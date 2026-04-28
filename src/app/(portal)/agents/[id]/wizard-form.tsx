"use client";

import { Eye, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { previewAgentPromptAction } from "@/features/agents/preview-prompt-action";
import { saveAgentWizardSection } from "@/features/agents/save-wizard-action";
import { type DraftState, parseDraftState } from "@/lib/agents/draft-state-schema";
import { VERTICAL_OPTIONS } from "@/lib/agents/templates/verticals";
import { getVerticalDefaults } from "@/lib/agents/templates/verticals";
import {
  TOOL_CATEGORY_LABEL,
  type ToolKey,
  type ToolMetadata,
  TOOLS_CATALOG,
} from "@/lib/agents/tools-catalog";

type Props = {
  agentId: string;
  /** draftState bruto vindo do banco. */
  initialDraft: unknown;
};

export function AgentWizardForm({ agentId, initialDraft }: Props) {
  const [draft, setDraft] = useState<DraftState>(() => parseDraftState(initialDraft));
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<{
    prompt: string;
    chars: number;
    tokens: number;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewPending, startPreview] = useTransition();
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const verticalDefaults = getVerticalDefaults(draft.vertical);

  async function saveSection<K extends keyof DraftState>(section: K, value: DraftState[K]) {
    setSavingSection(section as string);
    setSaveError(null);
    try {
      const fd = new FormData();
      fd.set("agentId", agentId);
      fd.set("section", section as string);
      fd.set("payload", JSON.stringify(value));
      const result = await saveAgentWizardSection(fd);
      if (!result.ok) setSaveError(result.error);
      else setDraft((prev) => ({ ...prev, [section]: value }));
    } finally {
      setSavingSection(null);
    }
  }

  function loadPreview() {
    setPreviewError(null);
    startPreview(async () => {
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

  return (
    <div className="flex flex-col gap-4">
      {saveError ? (
        <Alert variant="destructive">
          <AlertDescription>Erro ao salvar: {saveError}</AlertDescription>
        </Alert>
      ) : null}

      {/* ------- Vertical ------- */}
      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Modelo de agente (vertical)"
          description="Define defaults de workflows, limites e situações típicas."
          saving={savingSection === "vertical"}
        />
        <Select
          value={draft.vertical}
          onValueChange={(v) => saveSection("vertical", v as DraftState["vertical"])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VERTICAL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} disabled={opt.soon}>
                {opt.label}
                {opt.soon ? " (em breve)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* ------- Identidade ------- */}
      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Identidade"
          description="Apresentação da empresa em 1-3 linhas."
          saving={savingSection === "identity"}
        />
        <Label htmlFor="identity-descricao">Descrição curta da empresa</Label>
        <Textarea
          id="identity-descricao"
          rows={3}
          maxLength={500}
          defaultValue={draft.identity?.descricaoCurta ?? ""}
          placeholder={verticalDefaults.defaultIdentityHint}
          onBlur={(e) => saveSection("identity", { descricaoCurta: e.currentTarget.value })}
        />
      </Card>

      {/* ------- Persona ------- */}
      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Persona"
          description="Tom, energia e características marcantes."
          saving={savingSection === "persona"}
        />
        <PersonaFields value={draft.persona} onChange={(v) => saveSection("persona", v)} />
      </Card>

      {/* ------- Empresa ------- */}
      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="A empresa"
          description="Fatos sobre o negócio (cliente conhece de cor)."
          saving={savingSection === "empresa"}
        />
        <EmpresaFields
          value={draft.empresa}
          placeholders={verticalDefaults.placeholders}
          onChange={(v) => saveSection("empresa", v)}
        />
      </Card>

      {/* ------- Capacidades (tools) ------- */}
      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Capacidades (ações disponíveis)"
          description="Marque as ações que o agente pode executar."
          saving={savingSection === "toolsEnabled"}
        />
        <ToolsCheckboxes
          enabled={draft.toolsEnabled}
          recommended={verticalDefaults.recommendedTools}
          onChange={(v) => saveSection("toolsEnabled", v)}
        />
      </Card>

      {/* ------- Limites ------- */}
      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Limites (NUNCA faça)"
          description="Regras absolutas. Vazio = usa defaults do modelo."
          saving={savingSection === "limites"}
        />
        <ListEditor
          values={draft.limites}
          defaults={verticalDefaults.defaultLimites}
          placeholder="ex: prometer prazo sem consultar"
          onChange={(v) => saveSection("limites", v)}
        />
      </Card>

      {/* ------- Situações críticas ------- */}
      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Situações críticas"
          description="Como agir em momentos delicados. Vazio = usa default do modelo."
          saving={savingSection === "situacoesCriticas"}
        />
        <SituacoesFields
          value={draft.situacoesCriticas}
          defaults={verticalDefaults.defaultSituacoes}
          onChange={(v) => saveSection("situacoesCriticas", v)}
        />
      </Card>

      {/* ------- Encerramento ------- */}
      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Encerramento"
          description="Frase final da ligação."
          saving={savingSection === "encerramento"}
        />
        <Textarea
          rows={2}
          maxLength={500}
          defaultValue={draft.encerramento ?? ""}
          placeholder={verticalDefaults.defaultEncerramento}
          onBlur={(e) => saveSection("encerramento", e.currentTarget.value)}
        />
      </Card>

      {/* ------- Expert mode ------- */}
      <Card variant="solid" padding="default" className="flex-col gap-3">
        <SectionHeader
          title="Modo expert (opcional)"
          description="Sobrescreve TODO o template com prompt manual. Use só se sabe o que está fazendo."
          saving={savingSection === "systemPromptOverride"}
        />
        <Textarea
          rows={6}
          maxLength={80000}
          defaultValue={draft.systemPromptOverride ?? ""}
          placeholder="Vazio = usa template gerado a partir das seções acima."
          onBlur={(e) => saveSection("systemPromptOverride", e.currentTarget.value || undefined)}
        />
      </Card>

      {/* ------- Preview ------- */}
      <Card variant="solid" padding="default" className="flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Prompt gerado</h3>
            <p className="text-muted-foreground text-sm">
              Renderiza o prompt final com base no que você preencheu.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={loadPreview} disabled={previewPending}>
            {previewPending ? <Loader2 className="animate-spin" /> : <Eye />}
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  description,
  saving,
}: {
  title: string;
  description?: string;
  saving: boolean;
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
    <div className="grid grid-cols-2 gap-3">
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
        <Label>Características</Label>
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
  const usingDefaults = values.length === 0;
  return (
    <div className="flex flex-col gap-2">
      {usingDefaults ? (
        <p className="text-muted-foreground text-xs">
          Usando defaults do modelo. Adicione/remova itens pra customizar.
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
