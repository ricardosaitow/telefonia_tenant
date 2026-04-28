import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

import { KnowledgeForm } from "../knowledge-form";

export default async function NewKnowledgePage() {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "knowledge:manage")) {
    redirect("/knowledge");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Nova fonte de conhecimento"
        description="V1 sem upload real — só metadados. Status default: pronto."
      />
      <Card variant="solid" padding="lg">
        <KnowledgeForm mode="create" />
      </Card>
    </div>
  );
}
