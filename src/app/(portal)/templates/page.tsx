import { MessageSquareQuote, Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/composed/empty-state";
import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { listTenantTemplates } from "@/features/templates/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

import { CreateTemplateForm } from "./create-form";
import { EditTemplateForm } from "./edit-form";

const LOCALE_FLAG: Record<string, string> = {
  "pt-BR": "BR",
  "en-US": "US",
  "es-ES": "ES",
};

export default async function TemplatesPage() {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "template:manage")) {
    redirect("/dashboard");
  }

  const templates = await listTenantTemplates(ctx.activeTenantId);

  // Agrupa por key pra mostrar variantes de locale juntos.
  const grouped = templates.reduce<Record<string, typeof templates>>((acc, t) => {
    (acc[t.key] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Templates de mensagem"
        description="Mensagens fixas que o sistema usa (fora de horário, transferência, fallback). Por idioma. V1: scope=tenant. Templates por departamento/canal chegam em V1.x."
      />

      <Card variant="solid" padding="lg" className="gap-3">
        <div className="flex items-center gap-2">
          <Plus className="text-muted-foreground size-4" />
          <h3 className="text-foreground text-sm font-medium">Novo template</h3>
        </div>
        <CreateTemplateForm />
      </Card>

      {templates.length === 0 ? (
        <EmptyState
          icon={<MessageSquareQuote className="size-6" />}
          title="Nenhum template ainda"
          description="Crie acima. Sugestões: out_of_hours, ivr_welcome, transfer_handoff, error_fallback."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([key, items]) => (
            <section key={key} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-foreground font-mono text-xs font-semibold">{key}</h3>
                <span className="text-muted-foreground text-xs">
                  {items.length} {items.length === 1 ? "idioma" : "idiomas"}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {items.map((t) => (
                  <li key={t.id}>
                    <Card variant="solid" padding="default" className="gap-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-glass-bg text-accent-light rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide">
                          {LOCALE_FLAG[t.locale] ?? t.locale}
                        </span>
                      </div>
                      <EditTemplateForm template={t} />
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
