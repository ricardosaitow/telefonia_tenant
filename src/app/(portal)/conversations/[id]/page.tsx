import {
  ArrowLeft,
  Bot,
  Clock,
  DollarSign,
  Mail,
  MessageCircle,
  MonitorSmartphone,
  Phone,
  User,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/composed/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getConversationDetail } from "@/features/conversations/queries";
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

const SPEAKER_LABEL: Record<string, string> = {
  customer: "Cliente",
  agent: "Agente",
  system: "Sistema",
  tool: "Tool",
  human_operator: "Operador humano",
};

const INTERVENTION_LABEL: Record<string, string> = {
  observing: "Observando",
  assisted: "Assistindo",
  takeover: "Assumiu controle",
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

type ConversationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ConversationDetailPage({ params }: ConversationDetailPageProps) {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "conversation:view")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const conv = await getConversationDetail(ctx.activeTenantId, id);
  if (!conv) notFound();

  const ChannelIcon = CHANNEL_TYPE_ICON[conv.channel.tipo];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title={`Conversa ${conv.customerIdentifier ?? "(sem identificador)"}`}
        description={`${conv.channel.nomeAmigavel} · ${conv.channel.identificador}`}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/conversations">
              <ArrowLeft />
              Voltar
            </Link>
          </Button>
        }
      />

      <Card variant="solid" padding="default" className="gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-glass-bg flex size-10 items-center justify-center rounded-md">
            <ChannelIcon className="text-accent-light size-5" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-glass-bg text-muted-foreground rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
              {STATUS_LABEL[conv.status] ?? conv.status}
            </span>
            {conv.assistanceMode !== "ai_only" ? (
              <span className="text-accent-light bg-glass-bg rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                {ASSISTANCE_LABEL[conv.assistanceMode]}
              </span>
            ) : null}
            {conv.languageDetected ? (
              <span className="bg-glass-bg text-muted-foreground rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                {conv.languageDetected}
              </span>
            ) : null}
            {conv.tags.map((t) => (
              <span
                key={t}
                className="bg-glass-bg text-muted-foreground rounded-sm px-1.5 py-0.5 text-[10px]"
              >
                #{t}
              </span>
            ))}
          </div>
          <div className="text-muted-foreground ml-auto flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {conv.startedAt.toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "medium",
              })}
            </span>
            <span>{formatDuration(conv.durationSeconds)}</span>
            {conv.costUsdTotal ? (
              <span className="flex items-center gap-1">
                <DollarSign className="size-3.5" />
                {conv.costUsdTotal.toString()}
              </span>
            ) : null}
          </div>
        </div>

        {(conv.currentAgent || conv.currentDepartment) && (
          <p className="text-muted-foreground text-xs">
            Atual: {conv.currentAgent?.nome ?? "—"}
            {conv.currentDepartment ? ` · ${conv.currentDepartment.nome}` : ""}
          </p>
        )}

        {conv.summary ? (
          <p className="text-foreground border-divider border-t pt-3 text-sm">{conv.summary}</p>
        ) : null}

        <ChannelSpecificData conv={conv} />
      </Card>

      {conv.agentHistory.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-foreground text-sm font-semibold tracking-tight">
            Transferências
          </h2>
          <ul className="text-muted-foreground flex flex-col gap-1 text-xs">
            {conv.agentHistory.map((h) => (
              <li key={h.id}>
                {h.at.toLocaleString("pt-BR", { timeStyle: "medium" })} · {h.fromAgent?.nome ?? "—"}{" "}
                → <span className="text-foreground">{h.toAgent.nome}</span>
                {h.reason ? ` — ${h.reason}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {conv.interventions.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-foreground text-sm font-semibold tracking-tight">
            Intervenções humanas
          </h2>
          <ul className="text-muted-foreground flex flex-col gap-1 text-xs">
            {conv.interventions.map((i) => (
              <li key={i.id}>
                {i.startedAt.toLocaleString("pt-BR", { timeStyle: "medium" })} ·{" "}
                <span className="text-foreground">{i.operatorAccount.nome}</span> —{" "}
                {INTERVENTION_LABEL[i.modeEntered] ?? i.modeEntered}
                {i.endedAt
                  ? ` (até ${i.endedAt.toLocaleString("pt-BR", { timeStyle: "medium" })})`
                  : " (em andamento)"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-foreground text-sm font-semibold tracking-tight">
          Linha do tempo ({conv.turns.length} turns)
        </h2>
        {conv.turns.length === 0 ? (
          <Card variant="solid" padding="default">
            <p className="text-muted-foreground text-sm">Nenhum turn registrado.</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {conv.turns.map((turn) => (
              <li key={turn.id}>
                <TurnBubble turn={turn} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type ChannelSpecificDataProps = {
  conv: {
    voiceData: {
      sipCallId: string | null;
      recordingRef: string | null;
      callerIdName: string | null;
      hangupCause: string | null;
    } | null;
    emailData: {
      subject: string | null;
      fromAddress: string | null;
      rootMessageId: string | null;
    } | null;
    whatsappData: { waChatId: string | null; businessInitiatedWindowUntil: Date | null } | null;
  };
};

function ChannelSpecificData({ conv }: ChannelSpecificDataProps) {
  if (conv.voiceData) {
    return (
      <div className="border-divider text-muted-foreground border-t pt-3 text-xs">
        <p>
          Voz · SIP Call ID: <code>{conv.voiceData.sipCallId ?? "—"}</code>
          {conv.voiceData.callerIdName ? ` · ${conv.voiceData.callerIdName}` : ""}
          {conv.voiceData.hangupCause ? ` · ${conv.voiceData.hangupCause}` : ""}
        </p>
        {conv.voiceData.recordingRef ? (
          <p className="text-accent-light mt-1">Gravação: {conv.voiceData.recordingRef}</p>
        ) : null}
      </div>
    );
  }
  if (conv.emailData) {
    return (
      <div className="border-divider text-muted-foreground border-t pt-3 text-xs">
        <p>
          Email · {conv.emailData.subject ? `"${conv.emailData.subject}"` : "(sem assunto)"}
          {conv.emailData.fromAddress ? ` · de ${conv.emailData.fromAddress}` : ""}
        </p>
      </div>
    );
  }
  if (conv.whatsappData) {
    return (
      <div className="border-divider text-muted-foreground border-t pt-3 text-xs">
        <p>
          WhatsApp · chat <code>{conv.whatsappData.waChatId ?? "—"}</code>
          {conv.whatsappData.businessInitiatedWindowUntil
            ? ` · janela 24h até ${conv.whatsappData.businessInitiatedWindowUntil.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
            : ""}
        </p>
      </div>
    );
  }
  return null;
}

type Turn = {
  id: string;
  speaker: string;
  contentText: string | null;
  contentAudioRef: string | null;
  timestamp: Date;
  latencyMs: number | null;
  toolCall: unknown;
  toolResult: unknown;
  tokensIn: number | null;
  tokensOut: number | null;
  actorAccount: { id: string; nome: string } | null;
};

function TurnBubble({ turn }: { turn: Turn }) {
  const isCustomer = turn.speaker === "customer";
  const isTool = turn.speaker === "tool" || turn.toolCall !== null;
  const SpeakerIcon = isCustomer ? User : isTool ? Wrench : Bot;

  return (
    <div className={`flex gap-3 ${isCustomer ? "" : "flex-row-reverse"}`}>
      <div className="bg-glass-bg flex size-8 shrink-0 items-center justify-center rounded-md">
        <SpeakerIcon className="text-accent-light size-4" />
      </div>
      <div className={`flex max-w-[80%] flex-col gap-1 ${isCustomer ? "" : "items-end"}`}>
        <div
          className={`text-muted-foreground flex items-center gap-2 text-[10px] ${isCustomer ? "" : "flex-row-reverse"}`}
        >
          <span>{SPEAKER_LABEL[turn.speaker] ?? turn.speaker}</span>
          {turn.actorAccount ? <span>· {turn.actorAccount.nome}</span> : null}
          <span>· {turn.timestamp.toLocaleTimeString("pt-BR", { timeStyle: "medium" })}</span>
          {turn.latencyMs !== null ? <span>· {turn.latencyMs}ms</span> : null}
        </div>
        <Card
          variant="solid"
          padding="sm"
          className={`gap-1 ${isCustomer ? "" : "border-accent-light/30"}`}
        >
          {turn.contentText ? (
            <p className="text-foreground text-sm whitespace-pre-wrap">{turn.contentText}</p>
          ) : null}
          {turn.contentAudioRef ? (
            <p className="text-accent-light text-xs">🎵 {turn.contentAudioRef}</p>
          ) : null}
          {turn.toolCall ? (
            <details className="text-xs">
              <summary className="text-muted-foreground cursor-pointer">Tool call</summary>
              <pre className="bg-glass-bg text-foreground mt-1 overflow-x-auto rounded p-2 font-mono text-[10px]">
                {JSON.stringify(turn.toolCall, null, 2)}
              </pre>
            </details>
          ) : null}
          {turn.toolResult ? (
            <details className="text-xs">
              <summary className="text-muted-foreground cursor-pointer">Tool result</summary>
              <pre className="bg-glass-bg text-foreground mt-1 overflow-x-auto rounded p-2 font-mono text-[10px]">
                {JSON.stringify(turn.toolResult, null, 2)}
              </pre>
            </details>
          ) : null}
          {turn.tokensIn !== null || turn.tokensOut !== null ? (
            <p className="text-muted-foreground text-[10px]">
              tokens: in {turn.tokensIn ?? 0} / out {turn.tokensOut ?? 0}
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
