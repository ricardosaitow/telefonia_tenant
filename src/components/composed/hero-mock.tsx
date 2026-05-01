"use client";

import { Check, Eye, Mail, MessageSquare, Mic, Search, Sparkles, UserCog } from "lucide-react";
import { useState } from "react";

type Tab = "conversations" | "chat" | "details";

const tabs: { id: Tab; label: string }[] = [
  { id: "conversations", label: "Contatos" },
  { id: "chat", label: "Interações" },
  { id: "details", label: "Detalhes" },
];

export function HeroMock() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  return (
    <div
      aria-hidden
      className="border-divider-strong bg-surface-1 overflow-hidden rounded-2xl border"
      style={{
        boxShadow: "0 20px 70px rgba(0, 0, 0, 0.5), 0 8px 30px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Mobile tab bar */}
      <div className="border-border flex border-b md:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`font-display flex-1 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? "text-accent-light border-accent-light border-b-2"
                : "text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3-column layout */}
      <div className="divide-border md:grid md:grid-cols-[220px_1fr_240px] md:divide-x">
        {/* Col 1: Lista de conversas */}
        <div
          className={`flex-col ${
            activeTab === "conversations" ? "flex md:flex" : "hidden md:flex"
          }`}
        >
          {/* Search */}
          <div className="border-border border-b p-3">
            <div className="bg-surface-2 border-border flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs">
              <Search className="text-muted-foreground size-3" />
              <span className="text-muted-foreground">Buscar conversas...</span>
            </div>
          </div>

          {/* Department filter */}
          <div className="border-border flex items-center gap-1.5 border-b px-3 py-2">
            {["Todos", "Comercial", "Suporte"].map((d, i) => (
              <span
                key={d}
                className={
                  i === 0
                    ? "bg-primary/15 text-accent-light rounded-md px-2 py-0.5 text-[10px] font-semibold"
                    : "text-muted-foreground px-2 py-0.5 text-[10px]"
                }
              >
                {d}
              </span>
            ))}
          </div>

          {/* Conversation list */}
          <div className="flex flex-col">
            {[
              {
                name: "Carlos Mendes",
                msg: "vocês têm tinta acrílica em 18L?",
                time: "agora",
                channel: "voice" as const,
                active: true,
                agent: "Helena",
              },
              {
                name: "Ana Beatriz",
                msg: "preciso da 2ª via do boleto",
                time: "2min",
                channel: "whatsapp" as const,
                active: false,
                agent: "Pedro",
              },
              {
                name: "Roberto Silva",
                msg: "qual prazo de entrega pra SP?",
                time: "5min",
                channel: "whatsapp" as const,
                active: false,
                agent: "Helena",
              },
              {
                name: "Fernanda Lima",
                msg: "Orçamento enviado em anexo",
                time: "12min",
                channel: "email" as const,
                active: false,
                agent: "Helena",
              },
              {
                name: "Marcos Oliveira",
                msg: "obrigado, resolvido!",
                time: "18min",
                channel: "voice" as const,
                active: false,
                agent: "Pedro",
                resolved: true,
              },
            ].map((c) => (
              <div
                key={c.name}
                className={`flex gap-2.5 px-3 py-2.5 ${c.active ? "bg-primary/10 border-accent-light/30 border-l-2" : "border-l-2 border-transparent"}`}
              >
                <div className="relative shrink-0">
                  <span className="bg-surface-3 text-foreground flex size-8 items-center justify-center rounded-md text-[10px] font-semibold">
                    {c.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <span
                    className={`absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-md ${
                      c.channel === "voice"
                        ? "bg-primary/20"
                        : c.channel === "whatsapp"
                          ? "bg-success/20"
                          : "bg-accent-purple/20"
                    }`}
                  >
                    {c.channel === "voice" ? (
                      <Mic className="text-accent-light size-2" />
                    ) : c.channel === "whatsapp" ? (
                      <MessageSquare className="text-success size-2" />
                    ) : (
                      <Mail className="text-accent-purple size-2" />
                    )}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-semibold ${c.active ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {c.name}
                    </span>
                    <span className="text-muted-foreground text-[10px]">{c.time}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {c.resolved ? (
                      <span className="text-success text-[10px]">Resolvido</span>
                    ) : (
                      <span className="text-muted-foreground truncate text-[10px]">{c.msg}</span>
                    )}
                  </div>
                  <span className="text-muted-foreground text-[9px]">
                    <span className="text-accent-light">IA</span> {c.agent}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2: Conversa ativa */}
        <div className={`flex-col ${activeTab === "chat" ? "flex md:flex" : "hidden md:flex"}`}>
          {/* Chat header */}
          <div className="border-border flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="bg-surface-3 text-foreground flex size-8 items-center justify-center rounded-md text-xs font-semibold">
                CM
              </span>
              <div className="flex flex-col">
                <span className="text-foreground text-xs font-semibold">Carlos Mendes</span>
                <span className="text-muted-foreground text-[10px]">
                  Comercial · Iniciado por voz
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5">
                <span className="bg-success size-1.5 animate-pulse rounded-md" />
                <span className="text-success text-[10px]">Ao vivo</span>
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-1 flex-col gap-3 p-4 text-sm">
            {/* System: channel info */}
            <div className="flex items-center justify-center gap-2">
              <span className="border-border flex-1 border-t" />
              <span className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
                <Mic className="text-accent-light size-2.5" />
                Conversa iniciada por voz · 23:12
              </span>
              <span className="border-border flex-1 border-t" />
            </div>

            <MockMsg who="Carlos" agent={false}>
              olá, vocês têm tinta acrílica em 18 litros?
            </MockMsg>
            <MockMsg who="Helena" agent>
              temos sim! tinta acrílica fosco premium, 18L, disponível em quatro cores. quer que eu
              envie o catálogo com os preços?
            </MockMsg>
            <MockMsg who="Carlos" agent={false}>
              pode sim, manda pelo whats que é mais fácil
            </MockMsg>

            {/* System: action */}
            <span className="border-border bg-surface-2 text-muted-foreground inline-flex items-center gap-2 self-start rounded-md border px-3 py-1.5 text-xs">
              <Sparkles className="text-accent-light size-3" />
              Verificando disponibilidade...
            </span>

            {/* System: channel switch */}
            <div className="flex items-center justify-center gap-2">
              <span className="border-border flex-1 border-t" />
              <span className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
                <MessageSquare className="text-success size-2.5" />
                Conversa continuou via WhatsApp
              </span>
              <span className="border-border flex-1 border-t" />
            </div>

            <MockMsg who="Helena" agent>
              Pronto, Carlos! Enviei o catálogo com 4 opções e a tabela de preços. Precisa de mais
              alguma coisa?
            </MockMsg>

            {/* System: completed action */}
            <span className="border-border bg-surface-2 inline-flex items-center gap-2 self-start rounded-md border px-3 py-1.5 text-xs">
              <Check className="text-success size-3" />
              <span className="text-success">Catálogo enviado via WhatsApp</span>
            </span>

            <MockMsg who="Carlos" agent={false}>
              perfeito, vou ver aqui e já volto
            </MockMsg>
          </div>
        </div>

        {/* Col 3: Detalhes + Operador */}
        <div
          className={`bg-surface-2/30 flex-col text-xs ${
            activeTab === "details" ? "flex md:flex" : "hidden md:flex"
          }`}
        >
          {/* Contact card */}
          <div className="border-border flex flex-col gap-3 border-b p-4">
            <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Contato
            </span>
            <div className="flex items-center gap-2.5">
              <span className="bg-surface-3 text-foreground flex size-10 items-center justify-center rounded-md text-sm font-semibold">
                CM
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-foreground font-semibold">Carlos Mendes</span>
                <span className="text-muted-foreground text-[10px]">carlos@empresa.com</span>
                <span className="text-muted-foreground text-[10px]">(11) 9999-9999</span>
              </div>
            </div>
          </div>

          {/* Conversation details */}
          <div className="border-border flex flex-col gap-2.5 border-b p-4">
            <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Conversa
            </span>
            <div className="flex flex-col gap-2">
              {[
                { label: "Agente", value: "Helena", accent: true },
                { label: "Departamento", value: "Comercial" },
                { label: "Duração", value: "4min 22s" },
                { label: "Canais", value: "Voz → WhatsApp", accent: true },
                { label: "Resposta média", value: "<2s" },
              ].map((d) => (
                <div key={d.label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{d.label}</span>
                  <span
                    className={d.accent ? "text-accent-light font-semibold" : "text-foreground"}
                  >
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="border-border flex flex-col gap-2.5 border-b p-4">
            <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Tags
            </span>
            <div className="flex flex-wrap gap-1.5">
              {["Tinta acrílica", "18L", "Catálogo enviado"].map((tag) => (
                <span
                  key={tag}
                  className="border-border bg-surface-2 text-muted-foreground rounded-md border px-2 py-0.5 text-[10px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Operator panel */}
          <div className="flex flex-col gap-3 p-4">
            <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Supervisão
            </span>
            <div className="flex items-center gap-2">
              <span className="bg-accent-purple/20 text-accent-purple flex size-6 items-center justify-center rounded-md text-[10px] font-semibold">
                M
              </span>
              <div className="flex flex-col">
                <span className="text-foreground font-semibold">Maria Costa</span>
                <span className="text-muted-foreground text-[10px]">Supervisora · Comercial</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="bg-primary/10 text-accent-light flex items-center gap-2 rounded-md px-2.5 py-1.5">
                <Eye className="size-3" />
                Observando ao vivo
              </span>
              <span className="text-muted-foreground flex items-center gap-2 px-2.5 py-1.5">
                <MessageSquare className="size-3" />
                Sussurrar pra IA
              </span>
              <span className="text-muted-foreground flex items-center gap-2 px-2.5 py-1.5">
                <UserCog className="size-3" />
                Assumir conversa
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function MockMsg({
  who,
  agent,
  children,
}: {
  who: string;
  agent: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={
          agent
            ? "text-accent-light text-[10px] font-semibold"
            : "text-muted-foreground text-[10px]"
        }
      >
        {who}
      </span>
      <span
        className={
          agent
            ? "bg-primary/10 text-foreground max-w-[85%] rounded-md px-3 py-2"
            : "border-border bg-surface-2 text-foreground max-w-[85%] rounded-md border px-3 py-2"
        }
      >
        {children}
      </span>
    </div>
  );
}
