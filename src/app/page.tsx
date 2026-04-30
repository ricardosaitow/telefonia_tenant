import {
  ArrowRight,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  GraduationCap,
  HeartHandshake,
  ListTree,
  Lock,
  Mail,
  MessageSquare,
  Mic,
  Phone,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserCog,
  Wallet,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: "telefon.ia — Atendimento por IA com você no controle",
};

export default async function LandingPage() {
  const session = await auth();
  if (session?.sessionToken) {
    redirect("/tenants");
  }

  return (
    <div className="dark bg-background text-foreground relative flex min-h-full flex-1 flex-col overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 [background:radial-gradient(ellipse_at_15%_15%,var(--accent-glow),transparent_55%),radial-gradient(ellipse_at_85%_85%,rgba(139,92,246,0.10),transparent_55%),radial-gradient(ellipse_at_50%_40%,rgba(99,102,241,0.04),transparent_70%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 py-7">
          <Link href="/" aria-label="telefon.ia" className="flex items-center gap-3">
            <Image
              src="/brand/logo.webp"
              alt=""
              width={42}
              height={42}
              priority
              className="drop-shadow-[0_0_24px_var(--accent-glow)]"
            />
            <span className="font-display text-foreground text-2xl leading-none font-semibold tracking-tight">
              telefon<span className="text-accent-light">.ia</span>
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Cadastre-se</Link>
            </Button>
          </nav>
        </header>

        <main className="flex flex-1 flex-col">
          {/* HERO */}
          <section className="grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
            <div className="flex flex-col gap-7">
              <Eyebrow icon={<Sparkles className="size-3.5" />}>
                Plataforma de atendimento por IA
              </Eyebrow>
              <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight md:text-5xl lg:text-6xl">
                Atendimento que conversa.
                <br />
                <span className="text-accent-light">Equipe que decide.</span>
              </h1>
              <p className="text-muted-foreground max-w-xl text-base leading-relaxed md:text-lg">
                Voz, WhatsApp e email num modelo só. Configure departamentos, treine agentes pra
                falar como sua empresa, e entre na conversa quando o assunto pedir um humano.
              </p>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <ChannelBadge icon={<Mic className="size-4" />} label="Voz" />
                <ChannelBadge icon={<MessageSquare className="size-4" />} label="WhatsApp" />
                <ChannelBadge icon={<Mail className="size-4" />} label="Email" />
              </div>
            </div>

            <HeroVisual />
          </section>

          {/* WORKFLOW */}
          <section className="border-divider border-t py-20 md:py-28">
            <SectionHead
              eyebrow="Como funciona"
              title="Do ramal à conversa, em 4 passos."
              lead="Você cadastra a estrutura uma vez, treina os agentes do jeito da sua empresa, e a IA assume o atendimento — com você no controle do que importa."
            />
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StepCard
                index="01"
                icon={<Phone className="size-5" />}
                title="Conecte canais e ramais"
                description="Cadastre números de voz, WhatsApp Business, inbox de email e ramais SIP do seu PBX. Tudo num lugar só."
              />
              <StepCard
                index="02"
                icon={<Building2 className="size-5" />}
                title="Crie departamentos"
                description="Comercial, suporte, financeiro, recepção. Cada departamento tem horário, regras e seu próprio time de agentes."
              />
              <StepCard
                index="03"
                icon={<Bot className="size-5" />}
                title="Treine seus agentes"
                description="Escolha um vertical pronto, ajuste persona e tom, suba documentos, ative tools. O prompt é gerado pra você."
              />
              <StepCard
                index="04"
                icon={<ListTree className="size-5" />}
                title="Publique e roteie"
                description="Direto, por horário, IVR ou triagem por IA. Cada chamada cai no agente certo do departamento certo."
              />
            </div>
          </section>

          {/* MULTI-CANAL */}
          <section className="border-divider border-t py-20 md:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
              <div className="flex flex-col gap-6">
                <SectionHead
                  align="left"
                  eyebrow="Multi-canal nativo"
                  title="Voz, WhatsApp e email no mesmo lugar."
                  lead="Conversa é conversa. O cliente que ligou e voltou pelo WhatsApp aparece no mesmo histórico — com transcrição, métricas e custos comparáveis."
                />
                <ul className="grid gap-3">
                  <BulletItem
                    icon={<Mic className="size-4" />}
                    title="Voz com IA"
                    description="Atendimento por DID com transcrição em tempo real e gravação opcional."
                  />
                  <BulletItem
                    icon={<MessageSquare className="size-4" />}
                    title="WhatsApp Business"
                    description="Janela de 24h, templates aprovados e mídia. Sessão e disparo cobrados separados."
                  />
                  <BulletItem
                    icon={<Mail className="size-4" />}
                    title="Email"
                    description="Inbox com threading por Message-ID. Resposta no mesmo idioma do remetente."
                  />
                </ul>
              </div>
              <ConversationMock />
            </div>
          </section>

          {/* TREINAMENTO DE AGENTE */}
          <section className="border-divider border-t py-20 md:py-28">
            <SectionHead
              eyebrow="Treinamento de agente"
              title="Cada departamento, um agente com a sua voz."
              lead="Verticais prontas pra começar em minutos, persona configurável e conhecimento próprio. Sem prompt engineering."
            />
            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              <BigFeatureCard
                icon={<Sparkles className="size-5" />}
                title="6 verticais prontas"
                description="Comercial B2B, suporte, recepção, varejo, cobrança, educação. Cada uma traz workflow, limites e situações críticas pré-configuradas."
              >
                <VerticalGrid />
              </BigFeatureCard>
              <BigFeatureCard
                icon={<UserCog className="size-5" />}
                title="Persona com tom próprio"
                description="Nome do personagem, tom, energia, traits, idioma e tratamento. O agente fala do jeito da sua marca."
              >
                <PersonaPills />
              </BigFeatureCard>
              <BigFeatureCard
                icon={<BookOpen className="size-5" />}
                title="Conhecimento próprio"
                description="Suba PDFs, planilhas, links e Notion. O escopo controla quem consulta o quê — tenant inteiro, departamento ou só um agente."
              >
                <KnowledgeChips />
              </BigFeatureCard>
            </div>
            <p className="text-muted-foreground mt-8 text-center text-sm">
              Tools nativas: consultar produto, pedido, 2ª via de boleto, abrir chamado, enviar
              email, agendar visita, transferir pra humano ou outro departamento.
            </p>
          </section>

          {/* HUMANO NO CONTROLE */}
          <section className="border-divider border-t py-20 md:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
              <InterventionMock />
              <div className="flex flex-col gap-6">
                <SectionHead
                  align="left"
                  eyebrow="Humano no controle"
                  title="A IA atende. Você decide quando entrar."
                  lead="Operador acompanha conversas em tempo real, pode sussurrar com o agente ou assumir totalmente. Tudo registrado em auditoria."
                />
                <ul className="grid gap-3">
                  <BulletItem
                    icon={<UserCog className="size-4" />}
                    title="Permissões por departamento"
                    description="Operador só vê o que é dele. Supervisor gerencia agentes e conhecimento do depto. Owner enxerga tudo."
                  />
                  <BulletItem
                    icon={<Sparkles className="size-4" />}
                    title="Versionamento de agente"
                    description="Edite à vontade em rascunho. Publica só quando estiver pronto — versões antigas ficam pra rollback."
                  />
                  <BulletItem
                    icon={<ListTree className="size-4" />}
                    title="Audit log de tudo"
                    description="Quem mudou prompt, quem entrou na conversa, quem conectou integração. Hash chain pra detecção de tampering."
                  />
                </ul>
              </div>
            </div>
          </section>

          {/* SEGURANÇA */}
          <section className="border-divider border-t py-20 md:py-28">
            <SectionHead
              eyebrow="Segurança"
              title="Isolamento real, não promessa."
              lead="Multi-tenant no banco. Segredos fora do código. MFA obrigatório. LGPD desde o primeiro registro."
            />
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <FeatureCard
                icon={<Lock className="size-5" />}
                title="Tenant isolation no Postgres"
                description="Row-Level Security ativada em toda tabela com tenant_id. Mesmo um bug de query não consegue vazar entre clientes."
              />
              <FeatureCard
                icon={<ShieldCheck className="size-5" />}
                title="MFA mandatório"
                description="TOTP obrigatório pra todos os papéis. Backup codes, dispositivo confiável de 30 dias, lockout em força bruta."
              />
              <FeatureCard
                icon={<Receipt className="size-5" />}
                title="LGPD nativo"
                description="Workflow de direitos do titular: acesso, portabilidade, correção, apagamento. Tudo dentro do prazo legal."
              />
            </div>
          </section>

          {/* CTA FINAL */}
          <section className="border-divider border-t py-20 md:py-28">
            <div className="border-glass-border bg-glass-bg relative overflow-hidden rounded-2xl border p-10 backdrop-blur md:p-14">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_at_top_right,var(--accent-glow),transparent_60%)]"
              />
              <div className="relative flex flex-col items-center gap-6 text-center">
                <h2 className="font-display text-3xl leading-tight font-bold tracking-tight md:text-4xl lg:text-5xl">
                  Comece a atender com IA hoje.
                </h2>
                <p className="text-muted-foreground max-w-xl text-base md:text-lg">
                  Crie sua conta, conecte um número e veja o primeiro agente respondendo em minutos.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button asChild size="lg">
                    <Link href="/signup">
                      Cadastre-se
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/login">Já tenho conta</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-divider text-muted-foreground mt-auto flex flex-wrap items-center justify-between gap-3 border-t py-8 text-sm">
          <span>© Pekiart {new Date().getFullYear()}</span>
          <a
            href="mailto:contato@pekiart.com.br"
            className="hover:text-foreground transition-colors"
          >
            contato@pekiart.com.br
          </a>
        </footer>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function Eyebrow({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="border-glass-border bg-glass-bg text-muted-foreground inline-flex items-center gap-2 self-start rounded-md border px-3 py-1 text-xs font-medium tracking-wide uppercase backdrop-blur">
      {icon ? <span className="text-accent-light">{icon}</span> : null}
      {children}
    </span>
  );
}

function SectionHead({
  eyebrow,
  title,
  lead,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  lead: string;
  align?: "center" | "left";
}) {
  const alignment = align === "center" ? "text-center items-center" : "text-left items-start";
  return (
    <div className={`mx-auto flex max-w-2xl flex-col gap-4 ${alignment}`}>
      <span className="text-accent-light text-xs font-semibold tracking-[0.2em] uppercase">
        {eyebrow}
      </span>
      <h2 className="font-display text-3xl leading-tight font-bold tracking-tight md:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="text-muted-foreground text-base leading-relaxed md:text-lg">{lead}</p>
    </div>
  );
}

function ChannelBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="text-foreground inline-flex items-center gap-2">
      <span className="text-accent-light">{icon}</span>
      {label}
    </span>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="border-glass-border bg-glass-bg rounded-lg border p-6 backdrop-blur">
      <div className="bg-primary/10 text-accent-light mb-4 flex size-10 items-center justify-center rounded-md">
        {icon}
      </div>
      <h3 className="font-display text-foreground mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </article>
  );
}

function StepCard({
  index,
  icon,
  title,
  description,
}: {
  index: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="border-glass-border bg-glass-bg flex flex-col gap-4 rounded-lg border p-6 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-accent-light font-display text-sm font-semibold tracking-wider">
          {index}
        </span>
        <span className="bg-primary/10 text-accent-light flex size-9 items-center justify-center rounded-md">
          {icon}
        </span>
      </div>
      <div>
        <h3 className="font-display text-foreground mb-2 text-base font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </article>
  );
}

function BulletItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="bg-primary/10 text-accent-light mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md">
        {icon}
      </span>
      <div>
        <p className="text-foreground text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </li>
  );
}

function BigFeatureCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="border-glass-border bg-glass-bg flex flex-col gap-5 rounded-lg border p-6 backdrop-blur">
      <div className="bg-primary/10 text-accent-light flex size-10 items-center justify-center rounded-md">
        {icon}
      </div>
      <div>
        <h3 className="font-display text-foreground mb-2 text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
      <div className="border-divider mt-auto border-t pt-5">{children}</div>
    </article>
  );
}

function VerticalGrid() {
  const items = [
    { icon: <Briefcase className="size-3.5" />, label: "Comercial B2B" },
    { icon: <Wrench className="size-3.5" />, label: "Suporte" },
    { icon: <HeartHandshake className="size-3.5" />, label: "Recepção" },
    { icon: <ShoppingBag className="size-3.5" />, label: "Varejo" },
    { icon: <Wallet className="size-3.5" />, label: "Cobrança" },
    { icon: <GraduationCap className="size-3.5" />, label: "Educação" },
  ];
  return (
    <ul className="grid grid-cols-2 gap-2">
      {items.map((it) => (
        <li
          key={it.label}
          className="border-glass-border text-muted-foreground flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs"
        >
          <span className="text-accent-light">{it.icon}</span>
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function PersonaPills() {
  const tags = ["Empática", "Objetiva", "Paciente", "Confiante", "Acolhedora", "Técnica"];
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <span
          key={t}
          className="border-glass-border text-muted-foreground rounded-md border px-2.5 py-1 text-xs"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function KnowledgeChips() {
  const items = ["PDF", "DOCX", "XLSX", "URL", "GDrive", "Notion"];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => (
        <span
          key={t}
          className="border-glass-border text-muted-foreground rounded-md border px-2.5 py-1 text-xs font-medium"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function HeroVisual() {
  return (
    <div aria-hidden className="relative hidden lg:block">
      <div className="pointer-events-none absolute -inset-4 [background:radial-gradient(ellipse_at_center,var(--accent-glow),transparent_70%)]" />
      <div className="border-glass-border bg-glass-bg shadow-modal relative rounded-2xl border p-5 backdrop-blur">
        <div className="border-divider flex items-center gap-2 border-b pb-3">
          <span className="bg-divider-strong size-2.5 rounded-md" />
          <span className="bg-divider-strong size-2.5 rounded-md" />
          <span className="bg-divider-strong size-2.5 rounded-md" />
          <span className="text-muted-foreground ml-3 text-xs">Conversations</span>
        </div>
        <div className="mt-4 grid grid-cols-[140px_1fr] gap-4">
          <ul className="flex flex-col gap-2 text-xs">
            {[
              { label: "Comercial", count: 3, active: true },
              { label: "Suporte", count: 7 },
              { label: "Financeiro", count: 1 },
              { label: "Recepção", count: 2 },
            ].map((d) => (
              <li
                key={d.label}
                className={
                  d.active
                    ? "border-accent-light/40 bg-primary/10 text-foreground flex items-center justify-between rounded-md border px-2.5 py-1.5"
                    : "border-glass-border text-muted-foreground flex items-center justify-between rounded-md border px-2.5 py-1.5"
                }
              >
                <span>{d.label}</span>
                <span>{d.count}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3">
            {[
              { who: "Cliente", w: "70%" },
              { who: "Helena", w: "85%", agent: true },
              { who: "Cliente", w: "55%" },
              { who: "Helena", w: "75%", agent: true },
            ].map((m, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span
                  className={
                    m.agent
                      ? "text-accent-light text-[10px] font-semibold"
                      : "text-muted-foreground text-[10px]"
                  }
                >
                  {m.who}
                </span>
                <span
                  className={
                    m.agent
                      ? "bg-primary/15 h-2 rounded-md"
                      : "bg-glass-bg border-glass-border h-2 rounded-md border"
                  }
                  style={{ width: m.w }}
                />
                <span
                  className={
                    m.agent
                      ? "bg-primary/10 h-2 rounded-md"
                      : "bg-glass-bg border-glass-border h-2 rounded-md border"
                  }
                  style={{ width: `calc(${m.w} - 12%)` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversationMock() {
  return (
    <div aria-hidden className="relative">
      <div className="border-glass-border bg-glass-bg shadow-modal relative rounded-2xl border p-5 backdrop-blur">
        <div className="border-divider mb-4 flex items-center justify-between border-b pb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-accent-light flex size-7 items-center justify-center rounded-md">
              <Mic className="size-3.5" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-foreground font-semibold">Helena · Comercial</span>
              <span className="text-muted-foreground">Voz · 02:14</span>
            </div>
          </div>
          <span className="border-glass-border text-muted-foreground rounded-md border px-2 py-0.5 text-[10px] uppercase">
            Em curso
          </span>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <Bubble who="Cliente">olá, vocês têm tinta acrílica em 18 litros?</Bubble>
          <Bubble who="Helena" agent>
            temos sim! tinta acrílica fosco premium, 18L, em quatro cores. quer que eu já envie a
            referência por WhatsApp?
          </Bubble>
          <Bubble who="Cliente">pode mandar pelo whats, mesmo número</Bubble>
          <div className="border-glass-border bg-glass-bg text-muted-foreground flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
            <Sparkles className="text-accent-light size-3.5" />
            tool: <span className="text-foreground">enviar_email + transferir_canal</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  who,
  agent,
  children,
}: {
  who: string;
  agent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={agent ? "flex flex-col items-end gap-1" : "flex flex-col items-start gap-1"}>
      <span
        className={
          agent
            ? "text-accent-light text-[10px] font-semibold tracking-wide uppercase"
            : "text-muted-foreground text-[10px] tracking-wide uppercase"
        }
      >
        {who}
      </span>
      <span
        className={
          agent
            ? "bg-primary/15 text-foreground max-w-[85%] rounded-md px-3 py-2 leading-snug"
            : "border-glass-border bg-glass-bg text-foreground max-w-[85%] rounded-md border px-3 py-2 leading-snug"
        }
      >
        {children}
      </span>
    </div>
  );
}

function InterventionMock() {
  return (
    <div aria-hidden className="relative">
      <div className="border-glass-border bg-glass-bg shadow-modal relative rounded-2xl border p-5 backdrop-blur">
        <div className="border-divider mb-4 flex items-center gap-3 border-b pb-3">
          <span className="bg-primary/10 text-accent-light flex size-9 items-center justify-center rounded-md">
            <UserCog className="size-4" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-foreground text-sm font-semibold">Operador entrou</span>
            <span className="text-muted-foreground text-xs">Maria · supervisora · Comercial</span>
          </div>
          <span className="border-accent-light/40 bg-primary/10 text-accent-light ml-auto rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase">
            Ao vivo
          </span>
        </div>

        <ul className="grid gap-3 text-sm">
          <TimelineItem label="Modo" value="observando" tone="muted" />
          <TimelineItem label="Sussurro" value="lembre do desconto progressivo" tone="accent" />
          <TimelineItem label="Modo" value="assistindo" tone="muted" />
          <TimelineItem label="Modo" value="takeover" tone="accent" />
          <TimelineItem label="Audit" value="registrado · hash chain ok" tone="muted" />
        </ul>
      </div>
    </div>
  );
}

function TimelineItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "muted" | "accent";
}) {
  return (
    <li className="border-divider flex items-center justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground text-xs tracking-wide uppercase">{label}</span>
      <span
        className={
          tone === "accent"
            ? "text-accent-light font-mono text-xs"
            : "text-foreground font-mono text-xs"
        }
      >
        {value}
      </span>
    </li>
  );
}
