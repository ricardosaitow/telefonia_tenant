import { redirect } from "next/navigation";

import { listAccountMemberships } from "@/lib/auth/active-tenant";
import { assertSession, getOrganizationIds, getOrganizationRolesByOrg } from "@/lib/rbac";

import { TenantPicker } from "./tenant-picker";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Operador",
  supervisor: "Supervisor",
  auditor: "Auditor",
};

export default async function TenantsPage() {
  const ctx = await assertSession();
  const orgIds = await getOrganizationIds();
  const memberships = await listAccountMemberships(orgIds);
  // Reusa o context cached do assertSession — race-free.
  const rolesByOrg = await getOrganizationRolesByOrg();

  // 0 memberships: redireciona pra escolha de plano (cria tenant lá).
  if (memberships.length === 0) {
    redirect("/choose-plan");
  }

  // Auto-select (1 tenant + nenhum ativo) era atalho via Session DB. No
  // novo modelo (cookie + Server Component), Next 16 proíbe cookies.set()
  // fora de Server Action / route handler. Auto-select migrou pro fluxo
  // do choose-tenant-action — user clica no card mesmo com 1 opção.
  // TODO: criar Server Action auto-select disparada via useEffect/form-submit
  // se vier requirement.

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Selecione um tenant</h1>
        <p className="text-muted-foreground text-sm">
          Você tem acesso a {memberships.length} tenants. Escolha em qual quer entrar.
        </p>
      </div>

      <TenantPicker
        memberships={memberships.map((m) => {
          const roles = m.logtoOrgId ? (rolesByOrg.get(m.logtoOrgId) ?? []) : [];
          const primaryRole = roles[0] ?? "member";
          return {
            tenantId: m.tenantId,
            tenantName: m.tenant.nomeFantasia,
            tenantSlug: m.tenant.slug,
            role: ROLE_LABELS[primaryRole] ?? primaryRole,
            status: m.tenant.status,
          };
        })}
        activeTenantId={ctx.activeTenantId}
      />
    </div>
  );
}
