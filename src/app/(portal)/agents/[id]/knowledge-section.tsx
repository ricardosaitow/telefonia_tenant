import { BookOpen, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { removeAgentKnowledgeAction } from "@/features/knowledge/agent-link-actions";
import { listAgentKnowledge, listKnowledgeSources } from "@/features/knowledge/queries";
import { KNOWLEDGE_TYPE_LABEL } from "@/features/knowledge/schemas";

import { AddAgentKnowledgeForm } from "./add-knowledge-form";

type Props = {
  activeTenantId: string;
  agentId: string;
  canManage: boolean;
};

export async function KnowledgeSection({ activeTenantId, agentId, canManage }: Props) {
  const [vinculos, todasSources] = await Promise.all([
    listAgentKnowledge(activeTenantId, agentId),
    listKnowledgeSources(activeTenantId),
  ]);

  const vinculadosIds = new Set(vinculos.map((v) => v.knowledgeSourceId));
  const disponiveis = todasSources.filter((s) => !vinculadosIds.has(s.id));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <BookOpen className="text-muted-foreground size-4" />
        <h2 className="font-display text-foreground text-sm font-semibold tracking-tight">
          Conhecimento
        </h2>
        <span className="text-muted-foreground text-xs">fontes que o agente consulta (RAG)</span>
      </div>

      {vinculos.length === 0 ? (
        <Card variant="solid" padding="default">
          <p className="text-muted-foreground text-sm">
            Nenhuma fonte vinculada. Sem conhecimento, agente responde só com system prompt.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {vinculos.map((v) => (
            <li key={v.knowledgeSourceId}>
              <Card variant="solid" padding="default" className="flex-row items-center gap-3 py-3">
                <BookOpen className="text-accent-light size-4" />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">
                    {v.knowledgeSource.nome}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {KNOWLEDGE_TYPE_LABEL[v.knowledgeSource.tipo]} · {v.knowledgeSource.scope} ·{" "}
                    {v.knowledgeSource.status}
                  </p>
                </div>
                {canManage ? (
                  <form action={removeAgentKnowledgeAction}>
                    <input type="hidden" name="agentId" value={agentId} />
                    <input type="hidden" name="knowledgeSourceId" value={v.knowledgeSourceId} />
                    <Button type="submit" variant="ghost" size="sm" aria-label="Remover">
                      <Trash2 />
                    </Button>
                  </form>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        todasSources.length === 0 ? (
          <Card variant="solid" padding="default" className="flex-row items-center gap-2">
            <Plus className="text-muted-foreground size-4" />
            <p className="text-muted-foreground flex-1 text-sm">
              Crie uma fonte primeiro pra poder vincular.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/knowledge/new">Nova fonte</Link>
            </Button>
          </Card>
        ) : disponiveis.length === 0 ? (
          <Card variant="solid" padding="default">
            <p className="text-muted-foreground text-sm">
              Todas as fontes do tenant já estão vinculadas a este agente.
            </p>
          </Card>
        ) : (
          <Card variant="solid" padding="default" className="gap-3">
            <div className="flex items-center gap-2">
              <Plus className="text-muted-foreground size-4" />
              <h3 className="text-foreground text-sm font-medium">Vincular fonte existente</h3>
            </div>
            <AddAgentKnowledgeForm agentId={agentId} options={disponiveis} />
          </Card>
        )
      ) : null}
    </div>
  );
}
