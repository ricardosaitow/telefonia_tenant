"use client";

import { Check } from "lucide-react";

export type StepInfo = {
  key: string;
  label: string;
  status: "complete" | "current" | "pending";
};

type Props = {
  steps: StepInfo[];
  onJump: (index: number) => void;
};

/**
 * Stepper horizontal: cada step é uma coluna de largura igual com círculo
 * + label CENTRALIZADOS verticalmente. As linhas conectoras são posicionadas
 * absolutamente, partindo do centro horizontal de uma coluna e alcançando
 * o centro da próxima — garantia de alinhamento perfeito entre círculo e
 * label.
 *
 * Status:
 * - current: borda accent + número em accent (texto bold)
 * - complete: bg accent + check icon
 * - pending: borda muted + número muted
 */
export function WizardStepper({ steps, onJump }: Props) {
  return (
    <div className="flex w-full items-start">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const isCurrent = step.status === "current";
        const isComplete = step.status === "complete";
        return (
          <div
            key={step.key}
            // Cada step ocupa fatia igual; última coluna não tem linha à direita.
            className="relative flex flex-1 flex-col items-center gap-2"
          >
            {/* Linha conectora — sai do centro horizontal desta coluna,
                largura = 100% da coluna => alcança o centro da próxima.
                top-3.5 (14px) = centro vertical do círculo size-7 (28px). */}
            {!isLast ? (
              <div
                className={[
                  "absolute top-3.5 left-1/2 h-px w-full -translate-y-1/2 transition-colors",
                  isComplete ? "bg-success" : "bg-divider-strong",
                ].join(" ")}
                aria-hidden
              />
            ) : null}

            <button
              type="button"
              onClick={() => onJump(i)}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Passo ${i + 1}: ${step.label}`}
              className={[
                // z-10 pra ficar acima da linha; bg-card pra "cobrir" a linha
                // por trás — sem isso a linha passaria por dentro do círculo.
                "bg-card relative z-10 flex size-7 items-center justify-center rounded-md text-xs font-semibold transition-colors",
                isComplete
                  ? "border-success text-success border-2"
                  : isCurrent
                    ? "border-accent-light text-accent-light border-2"
                    : "border-divider-strong text-muted-foreground hover:border-foreground/40 border",
              ].join(" ")}
            >
              {isComplete ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </button>

            <span
              className={[
                "max-w-28 text-center text-xs leading-tight",
                isCurrent
                  ? "text-foreground font-medium"
                  : isComplete
                    ? "text-foreground/80"
                    : "text-muted-foreground",
              ].join(" ")}
              title={step.label}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
