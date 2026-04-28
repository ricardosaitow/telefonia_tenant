import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { getTenantSettings } from "@/features/tenant-settings/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

import { SettingsForm } from "./settings-form";

const STATUS_LABEL: Record<string, string> = {
  trial: "Trial",
  active: "Ativo",
  suspended: "Suspenso",
  canceled: "Cancelado",
};

export default async function SettingsPage() {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "tenant:settings")) {
    redirect("/dashboard");
  }

  const tenant = await getTenantSettings(ctx.activeTenantId);
  if (!tenant) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Configurações do tenant"
        description="Dados cadastrais e preferências. Slug, status e plano são gerenciados pela Pekiart."
      />

      <Card variant="solid" padding="lg" className="gap-5">
        <div className="border-border/50 flex items-center justify-between gap-4 border-b pb-3">
          <div>
            <p className="text-foreground text-sm font-medium">{tenant.nomeFantasia}</p>
            <p className="text-muted-foreground font-mono text-xs">{tenant.slug}</p>
          </div>
          <span className="bg-glass-bg text-accent-light rounded-sm px-2 py-1 text-xs font-medium tracking-wide uppercase">
            {STATUS_LABEL[tenant.status] ?? tenant.status}
          </span>
        </div>

        <SettingsForm
          initial={{
            nomeFantasia: tenant.nomeFantasia,
            razaoSocial: tenant.razaoSocial,
            cnpj: tenant.cnpj,
            dominioEmailPrincipal: tenant.dominioEmailPrincipal,
            defaultLocale: tenant.defaultLocale,
          }}
        />
      </Card>
    </div>
  );
}
