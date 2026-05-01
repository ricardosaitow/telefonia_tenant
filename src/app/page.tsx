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
import { redirect } from "next/navigation";

import { HeroMock } from "@/components/composed/hero-mock";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: "Pekiart telefon.ia",
};

export default async function LandingPage() {
  const session = await auth();
  if (session?.sessionToken) {
    redirect("/tenants");
  }

  return (
    <div className="dark bg-background text-foreground flex min-h-full flex-1 flex-col overflow-x-hidden">
      {/* HEADER */}
      <header className="bg-background border-border sticky top-0 z-50 border-b px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between">
          <Link href="/" aria-label="telefon.ia" className="flex items-center gap-2.5">
            <Image src="/brand/logo.webp" alt="" width={32} height={32} priority />
            <span className="font-display text-foreground text-lg leading-none font-semibold tracking-tight">
              telefon
              <span className="bg-gradient-to-r from-[var(--brand-gradient-from)] to-[var(--brand-gradient-to)] bg-clip-text text-transparent">
                .ia
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="px-3 md:px-4">
              <Link href="/signup">
                <span className="hidden md:inline">Registrar-se</span>
                <span className="md:hidden">Registrar</span>
              </Link>
            </Button>
          </nav>
        </div>
      </header>

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

      {/* FOOTER */}
      <footer className="border-border text-muted-foreground border-t text-sm">
        <div className="mx-auto max-w-[1240px] px-4 md:px-6 lg:px-8">
          <div className="grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            {/* Brand (desktop only — mobile version below copyright) */}
            <div className="hidden flex-col gap-6 md:flex">
              <div className="flex items-center gap-3">
                <Image src="/brand/logo.webp" alt="" width={56} height={56} />
                <span className="font-display text-foreground text-2xl font-bold tracking-tight md:text-3xl">
                  Pek
                  <span className="bg-gradient-to-r from-[var(--brand-gradient-alt-from)] via-[var(--brand-gradient-alt-via)] to-[var(--brand-gradient-alt-to)] bg-clip-text text-transparent">
                    ia
                  </span>
                  rt
                </span>
              </div>
              <span>Visão estratégica. Execução precisa.</span>
            </div>

            {/* Produto */}
            <div className="flex flex-col gap-3">
              <span className="text-foreground text-xs font-semibold tracking-wider uppercase">
                Produto
              </span>
              <a href="#" className="hover:text-foreground transition-colors">
                Funcionalidades
              </a>
            </div>

            {/* Suporte */}
            <div className="flex flex-col gap-3">
              <span className="text-foreground text-xs font-semibold tracking-wider uppercase">
                Suporte
              </span>
              <a
                href="mailto:contato@pekiart.com.br"
                className="hover:text-foreground transition-colors"
              >
                Contato
              </a>
              <a
                href="https://wa.me/5511922060089"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                WhatsApp
              </a>
            </div>

            {/* Legal */}
            <div className="flex flex-col gap-3">
              <span className="text-foreground text-xs font-semibold tracking-wider uppercase">
                Legal
              </span>
              <a href="#" className="hover:text-foreground transition-colors">
                Política de Privacidade
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Termos de Uso
              </a>
            </div>
          </div>

          <div className="border-border border-t py-8 text-center text-xs">
            {/* Brand (mobile only — above copyright) */}
            <div className="mb-6 flex flex-col items-center gap-3 md:hidden">
              <div className="flex items-center gap-3">
                <Image src="/brand/logo.webp" alt="" width={40} height={40} />
                <span className="font-display text-foreground text-2xl font-bold tracking-tight">
                  Pek
                  <span className="bg-gradient-to-r from-[var(--brand-gradient-alt-from)] via-[var(--brand-gradient-alt-via)] to-[var(--brand-gradient-alt-to)] bg-clip-text text-transparent">
                    ia
                  </span>
                  rt
                </span>
              </div>
              <span className="text-muted-foreground text-xs">
                Visão estratégica. Execução precisa.
              </span>
            </div>
            © {new Date().getFullYear()} Pekiart Consulting. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
