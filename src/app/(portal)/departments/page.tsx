import { Building2, Plus } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/composed/empty-state";
import { PageHeader } from "@/components/composed/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listDepartments } from "@/features/departments/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

export default async function DepartmentsPage() {
  const ctx = await assertSessionAndMembership();
  const departments = await listDepartments(ctx.activeTenantId);
  const canManage = can(ctx.membership.globalRole, "department:manage");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Departamentos"
        description="Agrupam agentes por área (Comercial, Suporte, Financeiro)."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/departments/new">
                <Plus />
                Novo departamento
              </Link>
            </Button>
          ) : null
        }
      />

      {departments.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-6" />}
          title="Nenhum departamento ainda"
          description={
            canManage
              ? "Crie o primeiro departamento pra começar a organizar agentes."
              : "Peça pra um admin criar o primeiro departamento."
          }
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
      ) : (
        <ul className="flex flex-col gap-3">
          {departments.map((dept) => (
            <li key={dept.id}>
              <Card variant="solid" padding="default" className="flex-row items-center gap-4">
                <div className="bg-glass-bg flex size-10 items-center justify-center rounded-md">
                  <Building2 className="text-accent-light size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-foreground truncate text-base font-semibold tracking-tight">
                    {dept.nome}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    /{dept.slug}
                    {dept.descricao ? ` · ${dept.descricao}` : ""}
                  </p>
                </div>
                {canManage ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/departments/${dept.id}`}>Editar</Link>
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
