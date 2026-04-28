import { BarChart3 } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/composed/empty-state";
import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { getUsageSummary, listRecentUsageRecords } from "@/features/usage/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

const TIPO_LABEL: Record<string, string> = {
  gemini_audio_minutes: "Gemini · áudio (min)",
  gemini_tokens_in: "Gemini · tokens entrada",
  gemini_tokens_out: "Gemini · tokens saída",
  whatsapp_message_session: "WhatsApp · sessão",
  whatsapp_message_template: "WhatsApp · template",
  email_sent: "Email enviado",
  storage_gb_day: "Storage (GB·dia)",
  sip_call_minutes: "Voz SIP (min)",
};

const fmtUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const fmtQty = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

export default async function UsagePage() {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "usage:view")) {
    redirect("/dashboard");
  }

  const [summary, recent] = await Promise.all([
    getUsageSummary(ctx.activeTenantId),
    listRecentUsageRecords(ctx.activeTenantId),
  ]);

  const allEmpty = summary.every((w) => w.byTipo.length === 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Uso & custos"
        description="Consumo agregado por tipo (Gemini, WhatsApp, storage). O runtime escreve UsageRecord conforme conversas rodam — Premium com chave própria mostra custo zero (D012)."
      />

      {allEmpty ? (
        <EmptyState
          icon={<BarChart3 className="size-6" />}
          title="Sem registros de uso ainda"
          description="Quando conversas começarem a rodar (voz, WA, email), o consumo aparece aqui agregado por janela."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {summary.map((win) => (
            <Card key={win.windowLabel} variant="solid" padding="default" className="gap-3">
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground text-xs tracking-wide uppercase">
                  Últimos {win.windowLabel}
                </span>
                <span className="text-foreground font-display text-2xl font-semibold">
                  {fmtUsd.format(win.totalCostUsd)}
                </span>
              </div>
              {win.byTipo.length === 0 ? (
                <p className="text-muted-foreground text-xs">Sem consumo nessa janela.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-xs">
                  {win.byTipo.map((b) => (
                    <li key={b.tipo} className="flex items-center justify-between gap-2">
                      <span className="text-foreground truncate">
                        {TIPO_LABEL[b.tipo] ?? b.tipo}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {fmtQty.format(b.quantity)}
                      </span>
                      <span className="text-foreground tabular-nums">
                        {fmtUsd.format(b.totalCostUsd)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      {recent.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-foreground text-sm font-medium">Últimos lançamentos</h2>
          <Card variant="solid" padding="none" className="gap-0 overflow-hidden">
            <ul className="divide-divider divide-y">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                  <code className="bg-glass-bg text-accent-light rounded-sm px-1.5 py-0.5 font-mono">
                    {r.tipo}
                  </code>
                  <span className="text-muted-foreground tabular-nums">
                    {fmtQty.format(Number(r.quantity))}
                  </span>
                  <span className="text-foreground tabular-nums">
                    {fmtUsd.format(Number(r.totalCostUsd))}
                  </span>
                  <span className="text-muted-foreground ml-auto">
                    {r.recordedAt.toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
