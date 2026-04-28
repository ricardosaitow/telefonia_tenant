import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/composed/empty-state";
import { PageHeader } from "@/components/composed/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listKnowledgeSources } from "@/features/knowledge/queries";
import {
  KNOWLEDGE_SCOPE_LABEL,
  KNOWLEDGE_STATUS_LABEL,
  KNOWLEDGE_TYPE_LABEL,
} from "@/features/knowledge/schemas";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

export default async function KnowledgePage() {
  const ctx = await assertSessionAndMembership();
  const sources = await listKnowledgeSources(ctx.activeTenantId);
  const canManage = can(ctx.membership.globalRole, "knowledge:manage");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Conhecimento"
        description="Fontes pra RAG: PDFs, planilhas, URLs, texto manual. Embeddings ficam no vector store gerenciado pelo data plane."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/knowledge/new">
                <Plus />
                Nova fonte
              </Link>
            </Button>
          ) : null
        }
      />

      {sources.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-6" />}
          title="Nenhuma fonte de conhecimento ainda"
          description={
            canManage
              ? "Cadastre a primeira fonte. V1 só registra metadados; upload real chega quando data plane integrar storage."
              : "Peça pra um admin/supervisor cadastrar."
          }
          action={
            canManage ? (
              <Button asChild>
                <Link href="/knowledge/new">
                  <Plus />
                  Criar fonte
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {sources.map((s) => (
            <li key={s.id}>
              <Card variant="solid" padding="default" className="flex-row items-center gap-4">
                <div className="bg-glass-bg flex size-10 items-center justify-center rounded-md">
                  <BookOpen className="text-accent-light size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground truncate text-sm font-medium">{s.nome}</p>
                    <span className="bg-glass-bg text-muted-foreground rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                      {KNOWLEDGE_STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {KNOWLEDGE_TYPE_LABEL[s.tipo]} · escopo {KNOWLEDGE_SCOPE_LABEL[s.scope]}
                    {s.language ? ` · ${s.language}` : ""}
                    {s.chunkCount ? ` · ${s.chunkCount} chunks` : ""}
                  </p>
                </div>
                {canManage ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/knowledge/${s.id}`}>Editar</Link>
                  </Button>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
