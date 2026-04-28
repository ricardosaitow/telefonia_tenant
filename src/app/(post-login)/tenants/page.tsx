import { redirect } from "next/navigation";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listAccountMemberships, setActiveTenant } from "@/lib/auth/active-tenant";
import { assertSession } from "@/lib/rbac";

import { TenantPicker } from "./tenant-picker";

const ROLE_LABELS: Record<string, string> = {
  tenant_owner: "Owner",
  tenant_admin: "Admin",
  department_supervisor: "Supervisor",
  operator: "Operador",
  auditor: "Auditor",
};

export default async function TenantsPage() {
  const ctx = await assertSession();
  const memberships = await listAccountMemberships(ctx.account.id);

  // 0 memberships: dead-end — orientar contato com admin.
  if (memberships.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card variant="glass" padding="lg" className="w-full max-w-md gap-3">
          <CardHeader>
            <CardTitle>Sem acesso a tenants</CardTitle>
            <CardDescription>
              Sua conta não tem acesso a nenhum tenant. Peça pra um admin do tenant te convidar.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // 1 membership e nada selecionado: pula o picker.
  if (memberships.length === 1 && ctx.activeTenantId === null) {
    const only = memberships[0]!;
    await setActiveTenant(ctx.sessionToken, only.tenantId);
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Selecione um tenant</h1>
        <p className="text-muted-foreground text-sm">
          Você tem acesso a {memberships.length} tenants. Escolha em qual quer entrar.
        </p>
      </div>

      <TenantPicker
        memberships={memberships.map((m) => ({
          tenantId: m.tenantId,
          tenantName: m.tenant.nomeFantasia,
          tenantSlug: m.tenant.slug,
          role: ROLE_LABELS[m.globalRole] ?? m.globalRole,
          status: m.tenant.status,
        }))}
        activeTenantId={ctx.activeTenantId}
      />
    </div>
  );
}
