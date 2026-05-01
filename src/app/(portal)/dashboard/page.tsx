import {
  Activity,
  AlertTriangle,
  BookOpen,
  Bot,
  Building2,
  MessageSquare,
  MessageSquareQuote,
  Radio,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { getDashboardStats } from "@/features/dashboard/queries";
import { assertSessionWithTenant } from "@/lib/rbac";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  ended: "Encerrada",
  abandoned: "Abandonada",
  escalated: "Escalada",
};

const CHANNEL_LABEL: Record<string, string> = {
  voice_did: "Voz",
  whatsapp: "WhatsApp",
  email: "Email",
  webchat: "Webchat",
};

export default async function DashboardPage() {
  const ctx = await assertSessionWithTenant();
  const stats = await getDashboardStats(ctx.activeTenantId);

  const cards = [
    {
      label: "Departamentos",
      value: stats.departments,
      href: "/departments",
      icon: <Building2 className="size-4" />,
    },
    {
      label: "Agentes em produção",
      value: stats.agentsPublished,
      sub: stats.agentsDraft > 0 ? `${stats.agentsDraft} em rascunho/teste` : "todos publicados",
      href: "/agents",
      icon: <Bot className="size-4" />,
    },
    {
      label: "Canais",
      value: stats.channels,
      href: "/channels",
      icon: <Radio className="size-4" />,
    },
    {
      label: "Conversas ativas",
      value: stats.conversationsActive,
      sub: `${stats.conversationsLast24h} nas últimas 24h`,
      href: "/conversations",
      icon: <MessageSquare className="size-4" />,
    },
    {
      label: "Bases de conhecimento",
      value: stats.knowledgeSources,
      href: "/knowledge",
      icon: <BookOpen className="size-4" />,
    },
    {
      label: "Templates",
      value: stats.templates,
      href: "/templates",
      icon: <MessageSquareQuote className="size-4" />,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Dashboard"
        description={`Olá, ${ctx.account.name}. Visão geral do tenant ativo.`}
      />

      {stats.recentSecurityEvents > 0 ? (
        <Link href="/security-events" className="block">
          <Card
            variant="solid"
            padding="default"
            className="hover:bg-surface-1 flex-row items-center gap-3 transition-colors"
          >
            <AlertTriangle className="text-accent-light size-5 shrink-0" />
            <div className="flex-1">
              <p className="text-foreground text-sm font-medium">
                {stats.recentSecurityEvents}{" "}
                {stats.recentSecurityEvents === 1 ? "evento" : "eventos"} de segurança nos últimos 7
                dias
              </p>
              <p className="text-muted-foreground text-xs">
                Severidade ≥ medium. Toque pra investigar.
              </p>
            </div>
          </Card>
        </Link>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="block">
            <Card
              variant="solid"
              padding="default"
              className="hover:bg-surface-1 gap-1 transition-colors"
            >
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                {c.icon}
                <span>{c.label}</span>
              </div>
              <p className="text-foreground font-display text-3xl font-semibold">{c.value}</p>
              {c.sub ? <p className="text-muted-foreground text-xs">{c.sub}</p> : null}
            </Card>
          </Link>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Activity className="text-muted-foreground size-4" />
          <h2 className="text-foreground text-sm font-medium">Conversas recentes</h2>
        </div>
        {stats.recentConversations.length === 0 ? (
          <Card variant="solid" padding="default">
            <p className="text-muted-foreground text-sm">Nenhuma conversa ainda.</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {stats.recentConversations.map((c) => (
              <li key={c.id}>
                <Link href={`/conversations/${c.id}`}>
                  <Card
                    variant="solid"
                    padding="default"
                    className="hover:bg-surface-1 flex-row items-center gap-3 transition-colors"
                  >
                    <span className="bg-surface-2 text-foreground rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                      {CHANNEL_LABEL[c.channelTipo] ?? c.channelTipo}
                    </span>
                    <span className="text-foreground text-sm">{c.customerIdentifier ?? "—"}</span>
                    <span className="text-muted-foreground ml-auto text-xs">
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {c.startedAt.toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
