import { ScrollText } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/composed/empty-state";
import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { listAuditLogs } from "@/features/audit/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

export default async function AuditPage() {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "audit:view")) {
    redirect("/dashboard");
  }

  const logs = await listAuditLogs(ctx.activeTenantId);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Auditoria"
        description="Ações privilegiadas no tenant. Os 100 eventos mais recentes (filtros + paginação chegam em V1.5)."
      />

      {logs.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="size-6" />}
          title="Nenhum evento ainda"
          description="Conforme você cria departamentos, agentes e publica versões, eventos aparecem aqui."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {logs.map((log) => (
            <li key={log.id}>
              <AuditLogRow log={log} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type LogRowProps = {
  log: Awaited<ReturnType<typeof listAuditLogs>>[number];
};

function AuditLogRow({ log }: LogRowProps) {
  const hasPayload = log.before !== null || log.after !== null;
  return (
    <Card variant="solid" padding="default" className="gap-2 py-3">
      <div className="flex items-center gap-3">
        <code className="bg-glass-bg text-accent-light rounded-sm px-1.5 py-0.5 font-mono text-xs">
          {log.action}
        </code>
        <span className="text-muted-foreground text-xs">
          {log.entityType}/{log.entityId.slice(0, 8)}
        </span>
        <span className="text-muted-foreground ml-auto text-xs">
          {log.createdAt.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "medium",
          })}
        </span>
      </div>
      <div className="text-muted-foreground text-xs">
        por {log.account?.nome ?? "—"}
        {log.account?.email ? ` (${log.account.email})` : ""}
      </div>
      {hasPayload ? (
        <details className="mt-1">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
            Ver payload
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {log.before !== null ? <PayloadBlock label="before" value={log.before} /> : null}
            {log.after !== null ? <PayloadBlock label="after" value={log.after} /> : null}
          </div>
        </details>
      ) : null}
    </Card>
  );
}

function PayloadBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="bg-glass-bg flex flex-col gap-1 rounded-md p-2">
      <span className="text-muted-foreground text-[10px] tracking-wide uppercase">{label}</span>
      <pre className="text-foreground overflow-x-auto font-mono text-xs leading-snug">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
