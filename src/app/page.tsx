import {
  ArrowRight,
  Briefcase,
  Check,
  Eye,
  FileCheck,
  Key,
  Lock,
  Mail,
  MessageSquare,
  Mic,
  Phone,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { HeroMock } from "@/components/composed/hero-mock";
import { Button } from "@/components/ui/button";

import { LandingHeader } from "./landing-header";

export const metadata: Metadata = {
  title: "telefon.ia - Pekiart",
};

export default async function LandingPage() {
  return (
    <div className="dark bg-background text-foreground flex min-h-full flex-1 flex-col overflow-x-hidden">
      <LandingHeader />

      {/* HERO — gradient vertical bg → surface-1 */}
      <div className="bg-gradient-to-b from-[var(--background)] from-0% via-[var(--surface-3)] via-40% to-[var(--surface-hero)]">
        <section className="mx-auto flex max-w-[1240px] flex-col items-center px-4 pt-20 pb-16 md:px-6 lg:px-8 lg:pt-28 lg:pb-20">
          <div className="flex w-full max-w-[58rem] flex-col">
            <h1 className="font-display text-4xl leading-[1.08] font-bold tracking-tight md:text-5xl lg:text-[4rem]">
              Atendimento que não dorme,
              <br className="hidden lg:inline" /> não falta e não pede aumento.
            </h1>
            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-muted-foreground text-base md:text-lg">
                Voz, WhatsApp e email. IA treinada com o tom da sua marca. Sempre disponível.
              </p>
              <Link
                href="/signup"
                className="text-accent-light font-display inline-flex shrink-0 items-center gap-1 text-sm font-semibold hover:underline"
              >
                Comece agora
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Product showcase */}
          <div className="mt-12 w-full max-w-6xl">
            <HeroMock />
          </div>
        </section>
      </div>

      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-4 md:px-6 lg:px-8">
        {/* FEATURE 1: Canais + Departamentos */}
        <section className="border-border border-t py-20 md:py-28">
          <div className="mb-10 grid items-start gap-6 px-4 md:grid-cols-2 md:px-8">
            <h2 className="font-display self-center text-3xl font-bold tracking-tight md:text-4xl">
              Presente em toda a jornada.
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed md:text-lg">
              Seu comercial vende, mas o pós-venda não existe. O suporte resolve, mas ninguém faz
              follow-up. Seu agente está exatamente onde hoje seu cliente não encontra ninguém.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Mock: timeline unificada */}
            <div className="relative overflow-hidden rounded-2xl">
              <div className="from-background pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-5% to-transparent to-40%" />
              <div className="border-border bg-surface-1 rounded-2xl border p-5">
                <div className="flex flex-col gap-3 text-xs">
                  {[
                    {
                      time: "09:12",
                      channel: "voice" as const,
                      icon: <Mic className="size-3" />,
                      text: "Cliente ligou pedindo orçamento de tinta acrílica 18L",
                    },
                    {
                      time: "09:14",
                      channel: "voice" as const,
                      icon: <Mic className="size-3" />,
                      text: "Helena enviou as 4 opções disponíveis com preço",
                    },
                    {
                      time: "14:38",
                      channel: "whatsapp" as const,
                      icon: <MessageSquare className="size-3" />,
                      text: 'Cliente voltou pelo WhatsApp: "fechado, manda o boleto"',
                    },
                    {
                      time: "14:39",
                      channel: "whatsapp" as const,
                      icon: <MessageSquare className="size-3" />,
                      text: "Helena gerou boleto e enviou link de pagamento",
                    },
                    {
                      time: "19:05",
                      channel: "email" as const,
                      icon: <Mail className="size-3" />,
                      text: "Cliente pediu nota fiscal por email",
                    },
                    {
                      time: "19:06",
                      channel: "email" as const,
                      icon: <Mail className="size-3" />,
                      text: "Helena enviou NF em PDF automaticamente",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-muted-foreground w-10 shrink-0 pt-0.5 text-right font-mono text-[10px]">
                        {item.time}
                      </span>
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-md ${
                          item.channel === "voice"
                            ? "bg-primary/15 text-accent-light"
                            : item.channel === "whatsapp"
                              ? "bg-success/15 text-success"
                              : "bg-accent-purple/15 text-accent-purple"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="text-muted-foreground leading-relaxed">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Mock: departamentos + roteamento */}
            <div className="relative overflow-hidden rounded-2xl">
              <div className="from-background pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-5% to-transparent to-40%" />
              <div className="border-border bg-surface-1 rounded-2xl border p-5">
                <div className="flex flex-col gap-3 text-xs">
                  <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                    Departamentos
                  </span>
                  {[
                    {
                      name: "Comercial",
                      agents: "Helena, Pedro",
                      channels: [
                        <Mic key="m" className="size-2.5" />,
                        <MessageSquare key="w" className="size-2.5" />,
                      ],
                      active: 3,
                    },
                    {
                      name: "Suporte",
                      agents: "Carlos",
                      channels: [
                        <MessageSquare key="w" className="size-2.5" />,
                        <Mail key="e" className="size-2.5" />,
                      ],
                      active: 7,
                    },
                    {
                      name: "Financeiro",
                      agents: "Ana",
                      channels: [<Mail key="e" className="size-2.5" />],
                      active: 1,
                    },
                    {
                      name: "Recepção",
                      agents: "Helena",
                      channels: [<Mic key="m" className="size-2.5" />],
                      active: 2,
                    },
                  ].map((dept) => (
                    <div
                      key={dept.name}
                      className="border-border bg-surface-2 flex items-center justify-between rounded-lg border px-3 py-2.5"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground font-semibold">{dept.name}</span>
                        <span className="text-muted-foreground text-[10px]">
                          Agentes: {dept.agents}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-muted-foreground flex items-center gap-1">
                          {dept.channels}
                        </div>
                        <span className="bg-primary/10 text-accent-light rounded-md px-2 py-0.5 text-[10px] font-semibold">
                          {dept.active} ativas
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="border-border mt-2 border-t pt-3">
                    <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      Roteamento
                    </span>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {[
                        { rule: "Horário comercial → Comercial", active: true },
                        { rule: "Fora do horário → Recepção (IA)", active: true },
                        { rule: "Assunto financeiro → Financeiro", active: true },
                      ].map((r) => (
                        <div key={r.rule} className="text-muted-foreground flex items-center gap-2">
                          <Check className="text-success size-2.5 shrink-0" />
                          <span>{r.rule}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE 2: Treinamento + Integrações */}
        <section className="border-border border-t py-20 md:py-28">
          <div className="mb-10 grid items-start gap-6 px-4 md:grid-cols-2 md:px-8">
            <h2 className="font-display self-center text-3xl font-bold tracking-tight md:text-4xl">
              Seu atendimento, no seu controle.
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed md:text-lg">
              Trocar o tom do agente é um chamado. Subir um catálogo novo, um orçamento. Conectar o
              WhatsApp no telefone, um projeto de meses. Ou era — agora você resolve sozinho, quando
              quiser.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Mock: wizard do agente */}
            <div className="relative overflow-hidden rounded-2xl">
              <div className="from-background pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-5% to-transparent to-40%" />
              <div className="border-border bg-surface-1 rounded-2xl border p-5">
                <div className="flex flex-col gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      Vertical
                    </span>
                    <span className="border-border bg-surface-2 text-foreground rounded-md border px-2.5 py-1.5">
                      Comercial B2B
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      Persona
                    </span>
                    <span className="border-border bg-surface-2 text-foreground rounded-md border px-2.5 py-1.5">
                      Helena
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {["Empática", "Objetiva", "Confiante", "Paciente"].map((t) => (
                        <span
                          key={t}
                          className="bg-primary/10 text-accent-light rounded-md px-2 py-0.5 text-[10px]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      Conhecimento
                    </span>
                    <div className="flex flex-col gap-1">
                      {[
                        { name: "catalogo-2026.pdf", size: "2.4 MB" },
                        { name: "tabela-precos.xlsx", size: "890 KB" },
                        { name: "politica-troca.pdf", size: "340 KB" },
                      ].map((f) => (
                        <span
                          key={f.name}
                          className="border-border bg-surface-2 text-muted-foreground flex items-center justify-between rounded-md border px-2.5 py-1.5"
                        >
                          <span className="flex items-center gap-1.5">
                            <FileCheck className="text-success size-2.5" />
                            {f.name}
                          </span>
                          <span className="text-[10px]">{f.size}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="border-border border-t pt-3">
                    <span className="bg-primary text-primary-foreground font-display rounded-md px-3 py-1.5 text-[10px] font-semibold">
                      Publicar agente
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* Mock: integrações */}
            <div className="relative overflow-hidden rounded-2xl">
              <div className="from-background pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-5% to-transparent to-40%" />
              <div className="border-border bg-surface-1 rounded-2xl border p-5">
                <div className="flex flex-col gap-3 text-xs">
                  <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                    Integrações
                  </span>
                  {[
                    {
                      name: "WhatsApp Business",
                      status: "Conectado",
                      connected: true,
                      icon: <MessageSquare className="size-3.5" />,
                    },
                    {
                      name: "PBX / SIP",
                      status: "Conectado",
                      connected: true,
                      icon: <Phone className="size-3.5" />,
                    },
                    {
                      name: "Email SMTP",
                      status: "Conectado",
                      connected: true,
                      icon: <Mail className="size-3.5" />,
                    },
                    {
                      name: "CRM",
                      status: "Disponível",
                      connected: false,
                      icon: <UserCog className="size-3.5" />,
                    },
                    {
                      name: "ERP",
                      status: "Disponível",
                      connected: false,
                      icon: <Briefcase className="size-3.5" />,
                    },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className="border-border bg-surface-2 flex items-center justify-between rounded-lg border px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex size-7 items-center justify-center rounded-md ${item.connected ? "bg-primary/15 text-accent-light" : "bg-surface-3 text-muted-foreground"}`}
                        >
                          {item.icon}
                        </span>
                        <span className="text-foreground font-semibold">{item.name}</span>
                      </div>
                      <span
                        className={`flex items-center gap-1 text-[10px] ${item.connected ? "text-success" : "text-muted-foreground"}`}
                      >
                        {item.connected && <Check className="size-2.5" />}
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE 3: Controle + Métricas */}
        <section className="border-border border-t py-20 md:py-28">
          <div className="mb-10 grid items-start gap-6 px-4 md:grid-cols-2 md:px-8">
            <h2 className="font-display self-center text-3xl font-bold tracking-tight md:text-4xl">
              Confie na IA. Cobre os resultados.
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed md:text-lg">
              Seu agente atende, resolve e reporta. Você acompanha os números, identifica o que
              ajustar e só intervém quando faz sentido — não porque precisa, mas porque quer.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Mock: monitoramento ao vivo */}
            <div className="relative overflow-hidden rounded-2xl">
              <div className="from-background pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-5% to-transparent to-40%" />
              <div className="border-border bg-surface-1 rounded-2xl border">
                <div className="divide-border grid grid-cols-1 divide-y md:grid-cols-[1fr_160px] md:divide-x md:divide-y-0">
                  <div className="flex flex-col gap-2 p-4 text-xs">
                    <div className="flex items-center gap-2 pb-1">
                      <span className="bg-success size-1.5 animate-pulse rounded-md" />
                      <span className="text-success text-[10px] font-semibold">Ao vivo</span>
                      <span className="text-muted-foreground text-[10px]">
                        · Helena · Comercial
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-[10px]">Cliente</span>
                      <span className="border-border bg-surface-2 text-foreground rounded-md border px-2.5 py-1.5">
                        preciso cancelar meu pedido
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-accent-light text-[10px] font-semibold">Helena</span>
                      <span className="bg-primary/10 text-foreground rounded-md px-2.5 py-1.5">
                        posso oferecer estorno como crédito. o que acha?
                      </span>
                    </div>
                    <span className="border-border bg-surface-2 inline-flex items-center gap-1.5 self-start rounded-md border px-2.5 py-1 text-[10px]">
                      <Check className="text-success size-2.5" />
                      <span className="text-success">Cancelamento evitado</span>
                    </span>
                  </div>
                  <div className="bg-surface-2/30 flex flex-col gap-2 p-3 text-xs">
                    <span className="bg-primary/10 text-accent-light flex items-center gap-1.5 rounded-md px-2 py-1">
                      <Eye className="size-2.5" />
                      Observando
                    </span>
                    <span className="border-accent-light/30 bg-primary/5 text-accent-light flex items-center gap-1.5 rounded-md border border-dashed px-2 py-1">
                      <MessageSquare className="size-2.5" />
                      Sussurrar
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1.5 px-2 py-1">
                      <UserCog className="size-2.5" />
                      Assumir
                    </span>
                    <div className="bg-accent-light/10 border-accent-light/20 mt-auto rounded-md border p-2">
                      <span className="text-accent-light text-[10px]">Sussurro:</span>
                      <p className="text-foreground mt-0.5 text-[10px]">
                        &ldquo;oferece crédito&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Mock: dashboard métricas */}
            <div className="relative overflow-hidden rounded-2xl">
              <div className="from-background pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-5% to-transparent to-40%" />
              <div className="border-border bg-surface-1 rounded-2xl border p-5">
                <div className="flex flex-col gap-4 text-xs">
                  <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                    Hoje
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Atendimentos", value: "247", trend: "+12%" },
                      { label: "Tempo médio", value: "1m 48s", trend: "-23%" },
                      { label: "Resolução IA", value: "89%", trend: "+5%" },
                      { label: "Satisfação", value: "4.8/5", trend: "+0.3" },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="border-border bg-surface-2 flex flex-col gap-1 rounded-lg border p-3"
                      >
                        <span className="text-muted-foreground text-[10px]">{m.label}</span>
                        <div className="flex items-end justify-between">
                          <span className="text-foreground text-lg font-semibold">{m.value}</span>
                          <span className="text-success text-[10px] font-semibold">{m.trend}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-border border-t pt-3">
                    <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      Por departamento
                    </span>
                    <div className="mt-2 flex flex-col gap-2">
                      {[
                        { name: "Comercial", bar: "75%", count: "104" },
                        { name: "Suporte", bar: "55%", count: "86" },
                        { name: "Financeiro", bar: "20%", count: "32" },
                        { name: "Recepção", bar: "15%", count: "25" },
                      ].map((d) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <span className="text-muted-foreground w-16 shrink-0">{d.name}</span>
                          <div className="bg-surface-3 h-2 flex-1 rounded-md">
                            <div
                              className="bg-primary/40 h-2 rounded-md"
                              style={{ width: d.bar }}
                            />
                          </div>
                          <span className="text-foreground w-8 text-right font-mono text-[10px]">
                            {d.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE 4: Segurança (mock + copy) */}
        <section className="border-border border-t py-20 md:py-28">
          <div className="mb-10 grid items-start gap-6 px-4 md:grid-cols-2 md:px-8">
            <h2 className="font-display self-center text-3xl font-bold tracking-tight md:text-4xl">
              Segurança que
              <br />
              você não precisa pensar.
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed md:text-lg">
              Seus dados protegidos por padrão. Sem configuração extra, sem preocupação.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Mock: painel de segurança */}
            <div className="relative overflow-hidden rounded-2xl">
              <div className="from-background pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-5% to-transparent to-40%" />
              <div className="border-border bg-surface-1 rounded-2xl border p-5">
                <div className="flex flex-col gap-3 text-xs">
                  <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                    Status
                  </span>
                  {[
                    {
                      icon: <Lock className="size-3" />,
                      label: "Dados protegidos",
                      status: "Ativo",
                    },
                    {
                      icon: <ShieldCheck className="size-3" />,
                      label: "Login com verificação dupla",
                      status: "Ativo",
                    },
                    {
                      icon: <Eye className="size-3" />,
                      label: "Registro de atividades",
                      status: "Ativo",
                    },
                    {
                      icon: <Key className="size-3" />,
                      label: "Recuperação de senha",
                      status: "Configurado",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="border-border bg-surface-2 flex items-center justify-between rounded-lg border px-3 py-2.5"
                    >
                      <span className="text-muted-foreground flex items-center gap-2">
                        <span className="text-accent-light">{item.icon}</span>
                        {item.label}
                      </span>
                      <span className="text-success flex items-center gap-1">
                        <Check className="size-2.5" />
                        {item.status}
                      </span>
                    </div>
                  ))}
                  <div className="border-border mt-2 border-t pt-3">
                    <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      Últimas atividades
                    </span>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {[
                        { time: "14:39", event: "Agente publicado por Maria" },
                        { time: "13:15", event: "Login verificado — João" },
                        { time: "11:02", event: "Permissão atualizada por Maria" },
                      ].map((item) => (
                        <div
                          key={item.time + item.event}
                          className="text-muted-foreground flex items-center gap-2"
                        >
                          <span className="w-10 shrink-0 text-right font-mono text-[10px]">
                            {item.time}
                          </span>
                          <span>{item.event}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Mock: controle de acesso */}
            <div className="relative overflow-hidden rounded-2xl">
              <div className="from-background pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-5% to-transparent to-40%" />
              <div className="border-border bg-surface-1 rounded-2xl border p-5">
                <div className="flex flex-col gap-3 text-xs">
                  <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                    Permissões
                  </span>
                  {[
                    {
                      role: "Admin",
                      perms: [
                        "Configurar agentes",
                        "Gerenciar equipe",
                        "Ver métricas",
                        "Alterar plano",
                      ],
                      accent: true,
                    },
                    {
                      role: "Supervisor",
                      perms: ["Configurar agentes", "Monitorar ao vivo", "Ver métricas"],
                      accent: false,
                    },
                    {
                      role: "Operador",
                      perms: ["Monitorar ao vivo", "Assumir conversas"],
                      accent: false,
                    },
                  ].map((item) => (
                    <div
                      key={item.role}
                      className="border-border bg-surface-2 flex flex-col gap-2 rounded-lg border px-3 py-2.5"
                    >
                      <span
                        className={`font-semibold ${item.accent ? "text-accent-light" : "text-foreground"}`}
                      >
                        {item.role}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {item.perms.map((p) => (
                          <span
                            key={p}
                            className="bg-surface-3 text-muted-foreground rounded-md px-2 py-0.5 text-[10px]"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="border-border mt-2 border-t pt-3">
                    <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      Sessões ativas
                    </span>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {[
                        { user: "Maria (Admin)", device: "Chrome · São Paulo", time: "Agora" },
                        { user: "João (Operador)", device: "Firefox · Campinas", time: "3 min" },
                      ].map((s) => (
                        <div
                          key={s.user}
                          className="text-muted-foreground flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <span className="bg-success size-1.5 rounded-md" />
                            {s.user}
                          </span>
                          <span className="text-[10px]">
                            {s.device} · {s.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PASSOS */}
        <section className="border-border border-t py-20 md:py-28">
          <div className="mx-auto mb-14 flex max-w-2xl flex-col items-center gap-4 text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
              Comece em minutos. Sem burocracia.
            </h2>
          </div>

          <div className="relative grid gap-10 md:grid-cols-3 md:gap-0">
            {/* Linha conectora (desktop) */}
            <div className="border-border absolute top-6 right-[16.7%] left-[16.7%] hidden border-t border-dashed md:block" />

            {[
              {
                index: "1",
                title: "Crie sua conta",
                description: "Nome, empresa e email. Sem cartão de crédito, sem compromisso.",
              },
              {
                index: "2",
                title: "Configure seu primeiro agente",
                description:
                  "Escolha a vertical, defina o tom e publique. Leva minutos, não semanas.",
              },
              {
                index: "3",
                title: "Comece a atender",
                description:
                  "Seu agente está no ar. Conecte seus canais e seus clientes são atendidos a partir de agora.",
              },
            ].map((step) => (
              <div
                key={step.index}
                className="relative flex flex-col items-center gap-4 text-center md:px-8"
              >
                <span className="bg-background border-border text-accent-light font-display relative z-10 flex size-12 items-center justify-center rounded-lg border text-xl font-bold">
                  {step.index}
                </span>
                <h3 className="font-display text-foreground text-base font-semibold">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="border-border border-t py-20 md:py-28">
          <div className="flex flex-col items-center gap-8 text-center">
            <h2 className="font-display text-2xl leading-[1.15] font-bold tracking-tight text-balance md:text-3xl lg:text-5xl">
              Quantos clientes você perdeu até chegar aqui?
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed md:text-lg">
              Com{" "}
              <span className="text-foreground font-semibold">
                telefon
                <span className="bg-gradient-to-r from-[var(--brand-gradient-from)] to-[var(--brand-gradient-to)] bg-clip-text text-transparent">
                  .ia
                </span>
              </span>
              , nenhum contato fica sem resposta.
            </p>
            <Button asChild size="lg" className="px-8">
              <Link href="/signup">
                Criar conta grátis
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* FOOTER — espelha o footer da landing institucional (pekiart.com.br) */}
      <footer className="border-border bg-background border-t">
        <div className="mx-auto max-w-[1240px] px-4 md:px-6 lg:px-8">
          <div className="grid gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            {/* Brand */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Image src="/brand/logo.webp" alt="" width={56} height={56} priority />
                <span className="font-display text-foreground text-2xl font-bold tracking-tight md:text-3xl">
                  Pek
                  <span className="bg-gradient-to-r from-[var(--brand-gradient-alt-from)] via-[var(--brand-gradient-alt-via)] to-[var(--brand-gradient-alt-to)] bg-clip-text text-transparent">
                    ia
                  </span>
                  rt
                </span>
              </div>
              <p className="text-muted-foreground text-sm">Visão estratégica. Execução precisa.</p>
            </div>

            {/* Produtos */}
            <div className="flex flex-col gap-3">
              <span className="text-foreground text-[11px] font-semibold tracking-[0.12em] uppercase">
                Produtos
              </span>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <a
                    href="https://telefonia.pekiart.com.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    telefon.ia
                  </a>
                </li>
                <li>
                  <a
                    href="https://financia.pekiart.com.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    financ.ia
                  </a>
                </li>
                <li>
                  <a
                    href="https://meet.pekiart.com.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    meet.ia
                  </a>
                </li>
              </ul>
            </div>

            {/* Pekiart */}
            <div className="flex flex-col gap-3">
              <span className="text-foreground text-[11px] font-semibold tracking-[0.12em] uppercase">
                Pekiart
              </span>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <a
                    href="mailto:contato@pekiart.com.br"
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    E-mail
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/5511922060089"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a
                    href="https://pekiart.com.br/#newsletter"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    Newsletter
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="flex flex-col gap-3">
              <span className="text-foreground text-[11px] font-semibold tracking-[0.12em] uppercase">
                Legal
              </span>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <a
                    href="https://pekiart.com.br/privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    Privacidade
                  </a>
                </li>
                <li>
                  <a
                    href="https://pekiart.com.br/termos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    Termos
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-border text-muted-foreground flex flex-col items-center justify-between gap-4 border-t py-6 text-xs md:flex-row">
            <span>
              © {new Date().getFullYear()} Pekiart Consulting. Todos os direitos reservados.
            </span>
            <div className="flex items-center gap-2">
              <a
                href="#"
                aria-label="LinkedIn"
                className="border-border bg-surface-1 hover:text-foreground grid size-9 place-items-center rounded-lg border transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.34 18.34V10H5.67v8.34h2.67zM7 8.67a1.54 1.54 0 1 0 0-3.07 1.54 1.54 0 0 0 0 3.07zM18.34 18.34v-4.78c0-2.48-1.34-3.63-3.13-3.63-1.44 0-2.09.79-2.45 1.35V10h-2.67v8.34h2.67v-4.66c0-.25.02-.5.09-.68.2-.5.65-1.01 1.41-1.01 1 0 1.4.76 1.4 1.87v4.48h2.68z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="X (Twitter)"
                className="border-border bg-surface-1 hover:text-foreground grid size-9 place-items-center rounded-lg border transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="YouTube"
                className="border-border bg-surface-1 hover:text-foreground grid size-9 place-items-center rounded-lg border transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
