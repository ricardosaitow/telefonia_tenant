import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { getAgentById, listAgentVersions, listDepartmentOptions } from "@/features/agents/queries";
import { listKnowledgeForAgent } from "@/features/knowledge/queries";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

import { AgentForm } from "../agent-form";
import { DeleteAgentButton } from "./delete-button";
import { PauseAgentButton } from "./pause-button";
import { PublishAgentButton } from "./publish-button";
import { ToolsSection } from "./tools-section";
import { VersionHistory } from "./version-history";
import { AgentWizardForm } from "./wizard-form";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  testing: "Em teste",
  production: "Produção",
  paused: "Pausado",
};

type EditAgentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditAgentPage({ params }: EditAgentPageProps) {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "agent:manage")) {
    redirect("/agents");
  }

  const { id } = await params;
  const agent = await getAgentById(ctx.activeTenantId, id);
  if (!agent) notFound();
  // Knowledge cascateia por scope: tenant ∪ department(do agente) ∪ agent.
  // É o que o data plane vai consultar em runtime — wizard mostra o mesmo.
  const [departments, versions, knowledgeAll, tenant] = await Promise.all([
    listDepartmentOptions(ctx.activeTenantId),
    listAgentVersions(ctx.activeTenantId, id),
    listKnowledgeForAgent(ctx.activeTenantId, id, agent.departmentId),
    withTenantContext(ctx.activeTenantId, (tx) =>
      tx.tenant.findUnique({
        where: { id: ctx.activeTenantId },
        select: { nomeFantasia: true },
      }),
    ),
  ]);
  if (!tenant) notFound();
  // Forma o shape esperado pelo wizard (KnowledgeRef).
  const knowledge = knowledgeAll.map((k) => ({
    id: k.id,
    nome: k.nome,
    descricao: k.descricao,
    scope: k.scope,
    status: k.status,
  }));

  const hasCurrent = agent.currentVersionId !== null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Editar agente"
        description={`/${agent.slug} · ${agent.department.nome}`}
        actions={
          <>
            {agent.status === "production" ? (
              <PauseAgentButton id={agent.id} intent="pause" />
            ) : null}
            {agent.status === "paused" ? <PauseAgentButton id={agent.id} intent="resume" /> : null}
            <PublishAgentButton id={agent.id} hasCurrent={hasCurrent} />
            <DeleteAgentButton id={agent.id} nome={agent.nome} />
          </>
        }
      />

      <Card variant="solid" padding="default" className="flex-row items-center gap-3">
        <span className="bg-glass-bg text-accent-light rounded-sm px-2 py-1 text-xs font-medium tracking-wide uppercase">
          {STATUS_LABEL[agent.status] ?? agent.status}
        </span>
        <p className="text-muted-foreground text-sm">
          {hasCurrent
            ? `Última publicação: ${agent.lastPublishedAt?.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) ?? "—"}`
            : "Ainda não publicado. Salve o rascunho e clique em Publicar pra criar a v1."}
        </p>
      </Card>

      <Card variant="solid" padding="lg">
        <AgentForm
          mode="edit"
          departments={departments}
          defaultValues={{
            id: agent.id,
            nome: agent.nome,
            descricao: agent.descricao,
            departmentId: agent.departmentId,
          }}
        />
      </Card>

      <Card variant="solid" padding="lg" className="flex-col">
        <AgentWizardForm
          agentId={agent.id}
          initialDraft={agent.draftState}
          knowledge={knowledge}
          tenantNomeFantasia={tenant.nomeFantasia}
        />
      </Card>

      <ToolsSection activeTenantId={ctx.activeTenantId} agentId={agent.id} canManage />

      <VersionHistory
        agentId={agent.id}
        versions={versions}
        currentVersionId={agent.currentVersionId}
        canManage
      />
    </div>
  );
}
