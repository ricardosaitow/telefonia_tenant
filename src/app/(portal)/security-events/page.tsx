import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/composed/empty-state";
import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { listSecurityEvents, type SecurityEventListItem } from "@/features/security-events/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

const SEVERITY_TONE: Record<string, string> = {
  info: "bg-glass-bg text-muted-foreground",
  low: "bg-glass-bg text-foreground",
  medium: "bg-glass-bg text-accent-light",
  high: "bg-destructive/15 text-destructive",
  critical: "bg-destructive/25 text-destructive",
};

const CATEGORY_LABEL: Record<string, string> = {
  authn: "Autenticação",
  authz: "Autorização",
  integration: "Integração",
  upload: "Upload",
  data_access: "Acesso a dado",
  config_change: "Mudança de config",
  secret_access: "Acesso a segredo",
  rate_limit: "Rate limit",
  anomaly: "Anomalia",
};

export default async function SecurityEventsPage() {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "audit:view")) {
    redirect("/dashboard");
  }

  const events = await listSecurityEvents(ctx.activeTenantId);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Eventos de segurança"
        description="Sinais a investigar (login fail, lockout, MFA fail, permissão negada, mudança de config). Os 200 mais recentes. Filtros + paginação em V1.5."
      />

      {events.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert className="size-6" />}
          title="Nenhum evento de segurança"
          description="Tudo limpo. Logins, mudanças de config e tentativas suspeitas aparecem aqui."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((ev) => (
            <li key={ev.id}>
              <SecurityEventRow event={ev} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SecurityEventRow({ event }: { event: SecurityEventListItem }) {
  const hasMetadata =
    event.metadata !== null &&
    typeof event.metadata === "object" &&
    Object.keys(event.metadata as object).length > 0;

  return (
    <Card variant="solid" padding="default" className="gap-2 py-3">
      <div className="flex items-center gap-3">
        <span
          className={`rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase ${
            SEVERITY_TONE[event.severity] ?? SEVERITY_TONE.info
          }`}
        >
          {event.severity}
        </span>
        <code className="bg-glass-bg text-accent-light rounded-sm px-1.5 py-0.5 font-mono text-xs">
          {event.eventType}
        </code>
        <span className="text-muted-foreground text-xs">
          {CATEGORY_LABEL[event.category] ?? event.category}
        </span>
        <span className="text-muted-foreground ml-auto text-xs">
          {event.createdAt.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "medium",
          })}
        </span>
      </div>

      {event.description ? <p className="text-foreground text-sm">{event.description}</p> : null}

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {event.account ? (
          <span>
            {event.account.nome}
            <span className="text-muted-foreground/70 ml-1">({event.account.email})</span>
          </span>
        ) : (
          <span className="text-muted-foreground/70">sem account associada</span>
        )}
        {event.ipAddress ? <span>IP: {event.ipAddress}</span> : null}
        {event.resolvedAt ? (
          <span className="text-foreground">
            resolvido em {event.resolvedAt.toLocaleDateString("pt-BR")}
          </span>
        ) : null}
      </div>

      {hasMetadata ? (
        <details className="mt-1">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
            Ver metadata
          </summary>
          <div className="bg-glass-bg mt-2 rounded-md p-2">
            <pre className="text-foreground overflow-x-auto font-mono text-xs leading-snug">
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </div>
        </details>
      ) : null}
    </Card>
  );
}
