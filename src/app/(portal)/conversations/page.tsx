import { Mail, MessageCircle, MessagesSquare, MonitorSmartphone, Phone, User } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/composed/empty-state";
import { PageHeader } from "@/components/composed/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listConversations } from "@/features/conversations/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

const STATUS_LABEL: Record<string, string> = {
  active: "Em andamento",
  ended: "Encerrada",
  abandoned: "Abandonada",
  escalated: "Escalada",
};

const ASSISTANCE_LABEL: Record<string, string> = {
  ai_only: "Só IA",
  human_observing: "Humano observando",
  human_assisted: "Humano assistindo",
  human_takeover: "Humano no controle",
};

const CHANNEL_TYPE_ICON = {
  voice_did: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  webchat: MonitorSmartphone,
} as const;

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

export default async function ConversationsPage() {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "conversation:view")) {
    redirect("/dashboard");
  }

  const conversations = await listConversations(ctx.activeTenantId);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Conversas"
        description="Atendimentos por todos os canais (voz, WhatsApp, email, webchat). 100 mais recentes; filtros + paginação chegam em V1.5."
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessagesSquare className="size-6" />}
          title="Nenhuma conversa ainda"
          description="Conversas chegam aqui em tempo real conforme o data plane (bridge-ia, wa-bridge) recebe canais. Configure pelo menos 1 canal + 1 regra de roteamento pra começar."
          action={
            <Button asChild>
              <Link href="/channels">Ir pra Canais</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {conversations.map((conv) => {
            const ChannelIcon = CHANNEL_TYPE_ICON[conv.channel.tipo];
            return (
              <li key={conv.id}>
                <Card variant="solid" padding="default" className="flex-row items-center gap-4">
                  <div className="bg-glass-bg flex size-10 items-center justify-center rounded-md">
                    <ChannelIcon className="text-accent-light size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground truncate text-sm font-medium">
                        <User className="text-muted-foreground mr-1 inline size-3.5 align-text-bottom" />
                        {conv.customerIdentifier ?? "—"}
                      </p>
                      <span className="bg-glass-bg text-muted-foreground rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                        {STATUS_LABEL[conv.status] ?? conv.status}
                      </span>
                      {conv.assistanceMode !== "ai_only" ? (
                        <span className="text-accent-light bg-glass-bg rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                          {ASSISTANCE_LABEL[conv.assistanceMode]}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {conv.channel.nomeAmigavel}
                      {conv.currentAgent ? ` · ${conv.currentAgent.nome}` : ""}
                      {conv.currentDepartment ? ` · ${conv.currentDepartment.nome}` : ""}
                      {conv.summary ? ` · ${conv.summary}` : ""}
                    </p>
                  </div>
                  <div className="text-muted-foreground flex flex-col items-end text-xs">
                    <span>
                      {conv.startedAt.toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                    <span>{formatDuration(conv.durationSeconds)}</span>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
