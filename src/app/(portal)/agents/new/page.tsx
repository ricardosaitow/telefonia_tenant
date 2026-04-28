import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { listDepartmentOptions } from "@/features/agents/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

import { AgentForm } from "../agent-form";

export default async function NewAgentPage() {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "agent:manage")) {
    redirect("/agents");
  }

  const departments = await listDepartmentOptions(ctx.activeTenantId);
  if (departments.length === 0) {
    redirect("/agents");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Novo agente"
        description="Cria em status rascunho. Publish chega na próxima fatia."
      />
      <Card variant="solid" padding="lg">
        <AgentForm mode="create" departments={departments} />
      </Card>
    </div>
  );
}
