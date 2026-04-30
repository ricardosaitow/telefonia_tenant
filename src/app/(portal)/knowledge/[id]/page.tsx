import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { listAgentOptions, listDepartmentOptions } from "@/features/agents/queries";
import { getKnowledgeSourceById } from "@/features/knowledge/queries";
import { KNOWLEDGE_SCOPE_LABEL, KNOWLEDGE_TYPE_LABEL } from "@/features/knowledge/schemas";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

import { KnowledgeForm } from "../knowledge-form";
import { DeleteKnowledgeButton } from "./delete-button";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditKnowledgePage({ params }: EditPageProps) {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "knowledge:manage")) {
    redirect("/knowledge");
  }

  const { id } = await params;
  const [ks, departments, agents] = await Promise.all([
    getKnowledgeSourceById(ctx.activeTenantId, id),
    listDepartmentOptions(ctx.activeTenantId),
    listAgentOptions(ctx.activeTenantId),
  ]);
  if (!ks) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Editar fonte de conhecimento"
        description={`${KNOWLEDGE_TYPE_LABEL[ks.tipo]} · escopo ${KNOWLEDGE_SCOPE_LABEL[ks.scope]}`}
        actions={<DeleteKnowledgeButton id={ks.id} nome={ks.nome} />}
      />
      <Card variant="solid" padding="lg">
        <KnowledgeForm
          mode="edit"
          departments={departments}
          agents={agents}
          defaultValues={{
            id: ks.id,
            nome: ks.nome,
            descricao: ks.descricao,
            scope: ks.scope,
            scopeRefId: ks.scopeRefId,
            tipo: ks.tipo,
            language: ks.language,
          }}
        />
      </Card>
    </div>
  );
}
