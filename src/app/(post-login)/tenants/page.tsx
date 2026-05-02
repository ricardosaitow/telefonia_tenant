import { redirect } from "next/navigation";

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

  // 0 memberships: redireciona pra escolha de plano (cria tenant lá).
  if (memberships.length === 0) {
    redirect("/choose-plan");
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
