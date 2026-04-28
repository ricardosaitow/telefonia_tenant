"use client";

import { History, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { restoreAgentVersionAction } from "@/features/agents/restore-version-action";

type Version = {
  id: string;
  version: number;
  publishedAt: Date;
  changelog: string | null;
  publishedByAccount: { id: string; nome: string; email: string } | null;
};

type VersionHistoryProps = {
  agentId: string;
  versions: Version[];
  currentVersionId: string | null;
  canManage: boolean;
};

export function VersionHistory({
  agentId,
  versions,
  currentVersionId,
  canManage,
}: VersionHistoryProps) {
  if (versions.length === 0) {
    return (
      <Card variant="solid" padding="default" className="flex-row items-center gap-3">
        <History className="text-muted-foreground size-5" />
        <p className="text-muted-foreground text-sm">
          Nenhuma versão publicada ainda. Salve o rascunho e clique em Publicar pra criar a v1.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <History className="text-muted-foreground size-4" />
        <h2 className="font-display text-foreground text-sm font-semibold tracking-tight">
          Histórico de versões
        </h2>
      </div>
      <ul className="flex flex-col gap-2">
        {versions.map((v) => {
          const isCurrent = v.id === currentVersionId;
          return (
            <li key={v.id}>
              <Card variant="solid" padding="default" className="flex-row items-center gap-3 py-3">
                <div className="bg-glass-bg text-accent-light flex size-8 items-center justify-center rounded-md font-mono text-xs font-semibold">
                  v{v.version}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground text-sm font-medium">
                      {v.publishedAt.toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                    {isCurrent ? (
                      <span className="text-accent-light bg-glass-bg rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                        atual
                      </span>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    por {v.publishedByAccount?.nome ?? "—"}
                    {v.changelog ? ` · ${v.changelog}` : ""}
                  </p>
                </div>
                {canManage && !isCurrent ? (
                  <form
                    action={restoreAgentVersionAction}
                    onSubmit={(e) => {
                      if (
                        !window.confirm(
                          `Restaurar v${v.version} pro rascunho? Vai sobrescrever o rascunho atual (mudanças não publicadas serão perdidas).`,
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="agentId" value={agentId} />
                    <input type="hidden" name="versionId" value={v.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      <RotateCcw />
                      Restaurar
                    </Button>
                  </form>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
