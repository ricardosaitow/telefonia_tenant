import { Bot, Plus } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/composed/empty-state";
import { PageHeader } from "@/components/composed/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listAgents, listDepartmentOptions } from "@/features/agents/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  testing: "Em teste",
  production: "Produção",
  paused: "Pausado",
};

export default async function AgentsPage() {
  const ctx = await assertSessionAndMembership();
  const [agents, departments] = await Promise.all([
    listAgents(ctx.activeTenantId),
    listDepartmentOptions(ctx.activeTenantId),
  ]);
  const canManage = can(ctx.membership.globalRole, "agent:manage");
  const noDepartments = departments.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Agentes"
        description="Configurações de IA por departamento. Cada agente tem rascunho editável + versões publicadas (publish vem na próxima fatia)."
        actions={
          canManage && !noDepartments ? (
            <Button asChild>
              <Link href="/agents/new">
                <Plus />
                Novo agente
              </Link>
            </Button>
          ) : null
        }
      />

      {noDepartments ? (
        <EmptyState
          icon={<Bot className="size-6" />}
          title="Crie um departamento primeiro"
          description="Agentes pertencem a departamentos. Crie pelo menos um departamento antes."
          action={
            canManage ? (
              <Button asChild>
                <Link href="/departments/new">
                  <Plus />
                  Criar departamento
                </Link>
              </Button>
            ) : null
          }
        />
      ) : agents.length === 0 ? (
        <EmptyState
          icon={<Bot className="size-6" />}
          title="Nenhum agente ainda"
          description={
            canManage
              ? "Crie o primeiro agente pra começar a configurar a IA."
              : "Peça pra um admin/supervisor criar o primeiro agente."
          }
          action={
            canManage ? (
              <Button asChild>
                <Link href="/agents/new">
                  <Plus />
                  Criar agente
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {agents.map((a) => (
            <li key={a.id}>
              <Card variant="solid" padding="default" className="flex-row items-center gap-4">
                <div className="bg-glass-bg flex size-10 items-center justify-center rounded-md">
                  <Bot className="text-accent-light size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-foreground truncate text-base font-semibold tracking-tight">
                      {a.nome}
                    </p>
                    <span className="bg-glass-bg text-muted-foreground rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    /{a.slug} · {a.department.nome}
                    {a.descricao ? ` · ${a.descricao}` : ""}
                  </p>
                </div>
                {canManage ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/agents/${a.id}`}>Editar</Link>
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
