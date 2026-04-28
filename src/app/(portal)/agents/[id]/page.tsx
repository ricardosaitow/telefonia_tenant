import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { getAgentById, listDepartmentOptions } from "@/features/agents/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

import { AgentForm } from "../agent-form";
import { DeleteAgentButton } from "./delete-button";

type EditAgentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditAgentPage({ params }: EditAgentPageProps) {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "agent:manage")) {
    redirect("/agents");
  }

  const { id } = await params;
  const [agent, departments] = await Promise.all([
    getAgentById(ctx.activeTenantId, id),
    listDepartmentOptions(ctx.activeTenantId),
  ]);
  if (!agent) notFound();

  // Extrai systemPrompt do draftState (pode estar undefined se draft vazio).
  const draft = (agent.draftState ?? {}) as { systemPrompt?: string };
  const systemPrompt = draft.systemPrompt ?? "";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title={`Editar agente`}
        description={`/${agent.slug} · ${agent.department.nome}`}
        actions={<DeleteAgentButton id={agent.id} nome={agent.nome} />}
      />
      <Card variant="solid" padding="lg">
        <AgentForm
          mode="edit"
          departments={departments}
          defaultValues={{
            id: agent.id,
            nome: agent.nome,
            descricao: agent.descricao,
            departmentId: agent.departmentId,
            systemPrompt,
          }}
        />
      </Card>
    </div>
  );
}
