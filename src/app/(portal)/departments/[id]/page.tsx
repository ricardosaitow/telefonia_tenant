import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { getDepartmentById } from "@/features/departments/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

import { DepartmentForm } from "../department-form";
import { DeleteDepartmentButton } from "./delete-button";

type EditDepartmentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditDepartmentPage({ params }: EditDepartmentPageProps) {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "department:manage")) {
    redirect("/departments");
  }

  const { id } = await params;
  const department = await getDepartmentById(ctx.activeTenantId, id);
  if (!department) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Editar departamento"
        description={`/${department.slug}`}
        actions={<DeleteDepartmentButton id={department.id} nome={department.nome} />}
      />
      <Card variant="solid" padding="lg">
        <DepartmentForm
          mode="edit"
          defaultValues={{
            id: department.id,
            nome: department.nome,
            descricao: department.descricao,
          }}
        />
      </Card>
    </div>
  );
}
