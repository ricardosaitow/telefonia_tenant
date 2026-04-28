import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
};

/**
 * Estado vazio padrão pra listas. Ícone Lucide grande + título + descrição
 * + CTA opcional. Glass-panel pra alinhar com vibe Pekiart.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="glass-panel flex flex-col items-center gap-3 rounded-[var(--radius-lg)] p-12 text-center">
      <div className="bg-glass-bg text-accent-light flex size-12 items-center justify-center rounded-md">
        {icon}
      </div>
      <h2 className="font-display text-foreground text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
