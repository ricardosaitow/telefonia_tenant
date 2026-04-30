"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ===========================================================================
// Field — wrapper consistente label + input/textarea + helper
// ===========================================================================

type FieldProps = {
  label: string;
  helper?: string;
  value: string;
  placeholder?: string;
  onCommit: (v: string) => void;
  textarea?: boolean;
  rows?: number;
  maxLength?: number;
  /**
   * Quando muda, força re-sync do estado local com o `value` externo —
   * usado pra refletir troca de vertical (defaultText muda) sem perder
   * edição do user na mesma vertical.
   */
  remountKey?: string;
  /**
   * Texto padrão ativo do tipo de atendimento. Se passado, mostra checkbox
   * "Usar sugestão como ponto de partida" abaixo do input — clicar carrega
   * o texto no field pra user editar/expandir.
   */
  defaultText?: string;
};

export function Field({
  label,
  helper,
  value,
  placeholder,
  onCommit,
  textarea,
  rows,
  maxLength,
  remountKey,
  defaultText,
}: FieldProps) {
  const id = `f-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const checkboxId = `${id}-use-default`;
  const Component = textarea ? Textarea : Input;

  // `bump` força re-mount do input uncontrolled quando user marca/desmarca
  // o checkbox — assim o input pega o novo defaultValue imediatamente.
  const [bump, setBump] = useState(0);

  // Estado do checkbox tracked localmente (não derivado de `value === defaultText`,
  // que ficava false após edits do user). Toggle = ação explícita: marcar
  // injeta o default; desmarcar limpa. Edição posterior do user não muda o
  // checkbox — fica check'd com sentido "comecei pelo padrão".
  const [usingDefault, setUsingDefault] = useState(!!defaultText && value === defaultText);

  function toggleDefault(checked: boolean) {
    const next = checked ? (defaultText ?? "") : "";
    setUsingDefault(checked);
    onCommit(next);
    setBump((b) => b + 1);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-foreground text-sm font-medium">
        {label}
      </Label>
      <Component
        id={id}
        key={`${remountKey ?? ""}-${bump}`}
        defaultValue={value}
        placeholder={placeholder}
        rows={rows ?? (textarea ? 3 : undefined)}
        maxLength={maxLength}
        onBlur={(e) => onCommit(e.currentTarget.value)}
      />
      {defaultText ? (
        <div className="flex items-start gap-2">
          <input
            id={checkboxId}
            type="checkbox"
            checked={usingDefault}
            onChange={(e) => toggleDefault(e.currentTarget.checked)}
            className="mt-0.5 size-4 cursor-pointer"
          />
          <Label
            htmlFor={checkboxId}
            className="text-muted-foreground cursor-pointer text-xs leading-tight"
          >
            Usar sugestão do tipo de atendimento como ponto de partida
            <span className="text-muted-foreground/70 ml-1">
              (você pode editar/complementar depois)
            </span>
          </Label>
        </div>
      ) : null}
      {helper ? <p className="text-muted-foreground text-xs">{helper}</p> : null}
    </div>
  );
}

// ===========================================================================
// RadioCards — visual radio com cards (ex: pros tipos de tom, energia, vertical)
// ===========================================================================

type RadioOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
};

type RadioCardsProps<T extends string> = {
  label: string;
  helper?: string;
  options: RadioOption<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  /** Quantas colunas no grid (default 2). */
  cols?: 1 | 2 | 3;
};

export function RadioCards<T extends string>({
  label,
  helper,
  options,
  value,
  onChange,
  cols = 2,
}: RadioCardsProps<T>) {
  const grid = cols === 3 ? "sm:grid-cols-3" : cols === 2 ? "sm:grid-cols-2" : "";
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-foreground text-sm font-medium">{label}</Label>
      {helper ? <p className="text-muted-foreground -mt-1 text-xs">{helper}</p> : null}
      <div className={`grid grid-cols-1 gap-2 ${grid}`}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onClick={() => onChange(opt.value)}
              className={[
                "flex flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm transition-colors",
                active
                  ? "border-accent-light bg-accent/15"
                  : "border-divider-strong hover:border-foreground/30 bg-background",
                opt.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
              ].join(" ")}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className={active ? "text-foreground font-medium" : "text-foreground"}>
                  {opt.label}
                </span>
                {opt.badge ? (
                  <span className="text-muted-foreground text-xs">{opt.badge}</span>
                ) : null}
              </div>
              {opt.description ? (
                <span className="text-muted-foreground text-xs">{opt.description}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===========================================================================
// ChipToggleGroup — multi-select tipo "characteristics" (chips clicáveis)
// ===========================================================================

type ChipOption<T extends string> = { value: T; label: string };

type ChipToggleGroupProps<T extends string> = {
  label: string;
  helper?: string;
  options: ChipOption<T>[];
  values: readonly T[];
  onChange: (v: T[]) => void;
};

export function ChipToggleGroup<T extends string>({
  label,
  helper,
  options,
  values,
  onChange,
}: ChipToggleGroupProps<T>) {
  function toggle(v: T) {
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  }
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-foreground text-sm font-medium">{label}</Label>
      {helper ? <p className="text-muted-foreground -mt-1 text-xs">{helper}</p> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = values.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={[
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-accent-light bg-accent/15 text-accent-light"
                  : "border-divider-strong text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              ].join(" ")}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===========================================================================
// SwitchField — boolean toggle com label e helper
// ===========================================================================

type SwitchFieldProps = {
  label: string;
  helper?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
};

export function SwitchField({ label, helper, checked, onChange }: SwitchFieldProps) {
  const id = `sw-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
        className="mt-0.5 size-4"
      />
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id} className="text-foreground cursor-pointer text-sm font-medium">
          {label}
        </Label>
        {helper ? <p className="text-muted-foreground text-xs">{helper}</p> : null}
      </div>
    </div>
  );
}

// ===========================================================================
// ListEditor — adiciona/remove strings (limites, restrições, critérios)
// ===========================================================================

type ListEditorProps = {
  label: string;
  helper?: string;
  values: string[];
  defaults: readonly string[];
  placeholder: string;
  onChange: (v: string[]) => void;
};

export function ListEditor({
  label,
  helper,
  values,
  defaults,
  placeholder,
  onChange,
}: ListEditorProps) {
  const [draft, setDraft] = useState("");
  const usingDefaults = values.length === 0 && defaults.length > 0;
  const items = usingDefaults ? Array.from(defaults) : values;

  function remove(index: number) {
    // Se está usando defaults, "promove" pra user-state com defaults menos o
    // item removido. Senão filtra direto. Empty resultante volta aos defaults
    // (efeito colateral aceitável — user pode usar "Restaurar padrões" se quiser).
    const base = usingDefaults ? Array.from(defaults) : values;
    onChange(base.filter((_, j) => j !== index));
  }

  function add() {
    if (!draft.trim()) return;
    const base = usingDefaults ? Array.from(defaults) : values;
    onChange([...base, draft.trim()]);
    setDraft("");
  }

  function restoreDefaults() {
    onChange([]);
  }

  const userCustomized = !usingDefaults && defaults.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-foreground text-sm font-medium">{label}</Label>
          {helper ? <p className="text-muted-foreground text-xs">{helper}</p> : null}
        </div>
        {userCustomized ? (
          <Button type="button" size="sm" variant="outline" onClick={restoreDefaults}>
            Restaurar sugestões padrão
          </Button>
        ) : null}
      </div>
      {usingDefaults ? (
        <p className="text-muted-foreground text-xs">
          Usando sugestões do tipo de atendimento. Edite/remova pra customizar.
        </p>
      ) : null}
      <ul className="border-divider-strong divide-divider-strong flex flex-col divide-y rounded-md border">
        {items.length === 0 ? (
          <li className="text-muted-foreground p-3 text-sm">Nenhum item.</li>
        ) : (
          items.map((item, i) => (
            <li key={`${i}-${item}`} className="flex items-center gap-2 p-3 text-sm">
              <span className="flex-1">{item}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>
                Remover
              </Button>
            </li>
          ))
        )}
      </ul>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" disabled={!draft.trim()} onClick={add}>
          Adicionar
        </Button>
      </div>
    </div>
  );
}
