import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

import { DepartmentForm } from "../department-form";

export default async function NewDepartmentPage() {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "department:manage")) {
    redirect("/departments");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader title="Novo departamento" description="Vai aparecer em /departamentos." />
      <Card variant="solid" padding="lg">
        <DepartmentForm mode="create" />
      </Card>
    </div>
  );
}
