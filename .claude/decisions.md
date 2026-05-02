# Architecture Decision Records — telefonia_tenant (portal)

ADRs **específicas do portal**. Decisões cross-repo (que afetam data plane também) ficam em `/root/telefonia-ia/.claude/decisions.md`.

Critério: se a decisão muda algo só dentro de `/root/portal/` (escolha de lib interna, padrão de componente, organização de feature), entra aqui (prefixo `P`). Se muda contrato com o data plane, schema do banco compartilhado, ou modelo de produto, entra na canônica do telefonia-ia (prefixo `D`).

Formato fixo: ID, título, data, status, decisão, rationale, alternativas rejeitadas, impacto.

---

## P001 — Bootstrap com versões "latest" superiores ao alvo da spec (2026-04-27)

**Status:** DECIDED ✓ DO NOT REOPEN
**Decisão:** Bootstrap usou `pnpm dlx create-next-app@latest` + `pnpm add <pkg>` sem pinar versões, resultando em versões major superiores ao alvo originalmente registrado em `docs/stack.md`:

| Lib | Spec original | Instalado | Drift |
|---|---|---|---|
| Next.js | 15.x | 16.2.4 | major +1 |
| React | (não pinado) | 19.2.4 | — |
| Tailwind CSS | 3.x | 4.2.4 | major +1 (CSS-first, sem `tailwind.config.ts`) |
| Prisma | 5.x | 7.8.0 | major +2 |
| Zod | 3.x | 4.3.6 | major +1 |
| Vitest | 2.x | 4.1.5 | major +2 |
| next-intl | 3.x | 4.9.2 | major +1 |
| date-fns | 3.x | 4.1.0 | major +1 |
| pino | 9.x | 10.3.1 | major +1 |
| next-auth | 5 (beta) | 5.0.0-beta.31 | OK (alinhado) |
| pnpm | 9+ | 10.33.2 | major +1 |

**Rationale:** ecosistema Next.js evoluiu rápido. Manter versões "atrasadas" pra alinhar com spec antiga teria custo de migração futura próximo de zero ganho. Spec era um plano; o bootstrap real é a verdade. Vamos com latest stable de tudo.

**Alternativas rejeitadas:** rebaixar manualmente cada dep pra match da spec antiga (tempo perdido reproduzindo versões que vão ficar obsoletas em 6 meses).

**Impacto:**
- **Tailwind 4 é mudança estrutural:** sem `tailwind.config.ts`; configuração via `@theme` directive em CSS. shadcn/ui requer abordagem TW4 quando for adicionado.
- **Prisma 7:** generate por padrão para `src/generated/prisma` (não mais `node_modules/@prisma/client`). Esse path foi adicionado a `.gitignore`.
- **Zod 4:** algumas APIs mudaram em relação a Zod 3. Conferir docs ao usar.
- **Next.js 16:** o `AGENTS.md` injetado pelo create-next-app instrui Claude a ler `node_modules/next/dist/docs/` antes de usar APIs (porque Next 16 quebrou várias coisas vs 15). Importante: confiar no AGENTS.md, não em memória de versões antigas.
- `docs/stack.md` foi atualizado com seção "Versões realmente instaladas" pra evitar referenciar versões fantasma.

**Não-impacto:** decisões arquiteturais (D001-D012) seguem todas válidas. As libs foram só uma versão acima do esperado, mas as escolhas (Prisma vs Drizzle, Conform vs RHF, Vitest vs Jest, etc.) seguem firmes.

---

## P002 — Reverter pra Zod 3 por incompatibilidade com Conform 1.x (2026-04-27)

**Status:** DECIDED ✓ DO NOT REOPEN
**Decisão:** Downgrade `zod` de `^4.3.6` (instalada no bootstrap, P001) pra `^3.25.76`. Mantém o resto da stack inalterada.
**Rationale:** No primeiro uso real de form (`@conform-to/zod` em `/login` e `/signup`), o build do Next.js falhou: `@conform-to/zod@1.19.1` (última versão publicada) importa `ZodPipeline` do zod, mas em zod 4 esse export foi renomeado pra `ZodPipe`. Conform ainda não tem release que suporte Zod 4 (não existe `@conform-to/zod-v4`; última 1.19.1 ainda é Zod 3-only). Conform é decisão arquitetural (P001/stack.md §4.4) — preferimos ele a React Hook Form pelo modelo form-first com Server Actions. Logo: Conform fica, Zod regride.
**Alternativas rejeitadas:**
- Trocar Conform por React Hook Form: perde a UX progressive-enhancement com Server Actions e contrair a dívida do P001/§4.4 que justifica Conform.
- Bypassar `@conform-to/zod` e fazer parse manual via `safeParse(Object.fromEntries(formData))`: perde a integração Conform `useForm({ lastResult })` ↔ `submission.reply()` que dá rehidratação de erros sem boilerplate.
- Forkar `@conform-to/zod` localmente trocando `ZodPipeline → ZodPipe`: dívida invisível, vai quebrar em qualquer update.
**Impacto:**
- `package.json`: `zod ^3.25.76`. Lockfile atualizado.
- `docs/stack.md`: ADR P001 lista zod 4.3.6 como "instalado"; aqui registramos a regressão sem reescrever P001 (preserva trilha histórica).
- Quando Conform publicar versão com Zod 4 (esperar release notes do edmundhung/conform), abrir nova ADR pra subir Zod novamente.

## P003 — Design system Pekiart (tokens semânticos, dual-theme, shadcn como toolkit) (2026-04-28)

**Status:** DECIDED ✓ DO NOT REOPEN
**Decisão:** Adotar design system Pekiart consolidado em `docs/design.md`. Pilares:
1. **Identidade Pekiart canônica** (paleta deep blue-black + indigo/violet, tipografia Inter + Plus Jakarta Sans, logo do lobo) extraída de `pekiart.com.br` e do Meet (`/root/meet-inspect/meet/custom-overlay/custom.css`). Não-negociável — alinha portal com o resto da marca.
2. **Tokens semânticos puros**. Toda cor visual em `src/features/**` e `src/app/**` vai por token (`bg-card`, `text-accent-light`, `border-glass-border`, etc). Cor numerada (`bg-zinc-900`) é proibida e bloqueada por ESLint rule custom.
3. **Dual-theme desde V1**. `:root` = light, `.dark` = dark default. Toggle via `next-themes`. Cada componente é validado nos 2 temas antes de merge. Evita o pior tipo de retrabalho (adicionar tema depois).
4. **shadcn como toolkit, não estética**. Mantém Radix por baixo (a11y) + código no repo (controle); primitivos são refatorados agressivamente pra perder o sotaque shadcn-default. Identidade Pekiart se sobrepõe.
5. **Composição > criação**. Feature consome `src/components/ui/` (primitivos shadcn refatorados) ou `src/components/composed/` (composições reutilizáveis). Feature não cria primitivo próprio.
6. **Vibe Linear no comportamento, vibe Pekiart na pele**. Sidebar fixa + topbar + densidade alta + keyboard-first (Linear) com paleta + glass + glow Pekiart.

**Rationale:** trauma do user com sistemas que viram Frankenstein conforme features acumulam. Risco real do "Cara v0/Lovable" associada a shadcn-default em B2B sério (perde credibilidade). Solução: regras DURAS desde a fundação + enforcement automático (ESLint, futuramente subagent design-reviewer).
**Alternativas rejeitadas:**
- Larganhar shadcn por Mantine/HeroUI/Radix-Themes: perde controle de código (dep runtime), pra ganhar pouco — identidade vem do sistema de tokens, não do toolkit.
- Tailwind UI/Catalyst (pago): user descartou pagar.
- Single-theme (só dark) com light depois: refator visto como inaceitável (experiência prévia ruim do user).
- Tokens optional: histórico mostra que vira inconsistência em 6 meses.
**Impacto:**
- `globals.css` reescrito com tokens Pekiart dual-theme + carregamento de Inter+Plus Jakarta via next/font.
- `src/components/ui/{button,card,input,label,alert}.tsx` refatorados.
- `src/components/theme-provider.tsx` + `next-themes` instalado.
- `(auth)/layout.tsx` + login/signup pages refatoradas com vibe Meet.
- `docs/design.md` (princípios completos), `.claude/rules/design-portal.md` (regras duras), entram via @import em `.claude/CLAUDE.md`.
- ESLint rule custom em `eslint.config.mjs` bloqueia `\b(bg|text|border|ring|from|via|to|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+\b` em `src/features/**` e `src/app/**`.
- Subagent `design-reviewer` documentado como pendente pra V1.5.
- Quando sistema de UI nova surgir (ex.: dashboard com gráficos), primeiro adicionar componente composto em `src/components/composed/`, **depois** consumir na feature. Nunca inline.

## P004 — Sem pill: `rounded-full` banido em UI elements (2026-04-28)

**Status:** DECIDED ✓ DO NOT REOPEN
**Decisão:** Avatares, buttons, badges, cards e demais UI elements em `src/features/**`, `src/app/**`, `src/components/composed/**` usam `rounded-md` (10px) ou `rounded-lg` (14px) — **nunca** `rounded-full`. Exceção: status dots, loading spinners e decorações puramente icônicas, restritas a `src/components/ui/**` com comentário `// rounded-full ok: <razão>`. ESLint bloqueia `rounded-full` nos paths proibidos.
**Rationale:** decisão de produto explícita do user no feedback do 8c: "esse formato elipsoidal, não quero usar no sistema". Identidade visual do portal usa quadrados de pontas arredondadas — alinha com vibe Linear (square-ish) e mantém característica Pekiart pelo glow + glass + paleta, não pelo formato pill.
**Alternativas rejeitadas:**
- Manter pill no Button default (Pekiart Meet usa pill em CTAs): user vetou explicitamente; consistência interna do portal vence consistência cross-produto.
- Permitir pill caso a caso: vira inconsistência em 6 meses. Regra dura.
**Impacto:**
- `src/components/ui/button.tsx`: variant default trocou `rounded-full` → `rounded-md`. Removidos `compoundVariants` que aplicavam pill em sizes icon.
- `src/components/composed/user-menu.tsx`: avatar (initials) e wrapper trocaram `rounded-full` → `rounded-md`.
- `docs/design.md` §5 (Radius): linha "Pill" virou linha riscada com nota "Banido — P004".
- `.claude/rules/design-portal.md`: nova seção "Formato (radius)" + entrada nos Anti-padrões.
- `eslint.config.mjs`: regex de cor numerada estendida pra capturar `\brounded-full\b` em features/app/composed.
- Quando o Meet for re-skinnado pra alinhar com novo portal, transferir esta decisão pra lá (entrada no `decisions.md` cross-repo).

## P005 — Migração visual Pekiart Glassmorphism → Linear Pure (2026-05-01)

**Status:** DECIDED ✓ DO NOT REOPEN
**Decisão:** Migrar estética visual do portal de "Pekiart Glassmorphism" (glass panels, glow effects, radial gradients, backdrop-blur) para "Linear Pure" (superfícies sólidas, borders hairline, sem glow, sem blur). Escopo: tokens CSS, componentes primitivos, auth layout, login/signup pages, dashboard, portal headers e sidebar.
**Rationale:** glassmorphism cria ruído visual desnecessário em produto B2B denso. Linear.app provou que superfícies sólidas + borders sutis + hierarquia por contraste de bg é mais legível e profissional. A identidade Pekiart se preserva pela paleta indigo/violet, tipografia (Inter + Plus Jakarta Sans) e logo — não pelo efeito glass.
**Mudanças concretas:**
- Tokens dark: bg mais neutro (#010102 / #0f1011 / #141516), texto sem tint azul (#e8e8e8 / #8a8f98).
- Tokens light: bg puro (#ffffff / #f5f6f8), sem tint azul.
- Novo token ladder: `--surface-1/2/3` pra hierarquia de camadas.
- Shadows: `--shadow-glow` e `--shadow-glow-lg` → `none`. `--shadow-card` → hairline only.
- `glass-panel` utility: remove `backdrop-filter: blur()`, usa bg sólido + border.
- `pekiart-radial-bg-layer`: `display: none`.
- Button: remove translate-y hover + glow, usa `hover:opacity-90`.
- Input/Textarea/Select: focus via `ring-1 ring-ring/20` em vez de `shadow-glow`.
- Card glass variant: bg sólido em vez de backdrop-blur.
- Auth layout: remove radial gradient overlay.
- Portal/post-login headers e sidebar: remove `backdrop-blur`, usa bg sólido.
- Letter-spacing headings: `-0.02em` → `-0.03em`.
**O que NÃO muda:** fontes, radius (P004 mantido), arquitetura de componentes, enforcement de tokens (ESLint), dual-theme, accent hue (#6366f1), APIs de componentes.
**Alternativas rejeitadas:**
- Manter glass parcial (só em auth): inconsistência visual entre auth e portal. Melhor ser Linear puro em tudo.
- Remover accent-light/accent-purple: são parte da identidade Pekiart, ficam como accent textual/border.
**Impacto:**
- `globals.css`: tokens reescritos.
- `button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `card.tsx`: ajustes de classe.
- `(auth)/layout.tsx`, `(portal)/layout.tsx`, `(post-login)/layout.tsx`, `portal-sidebar.tsx`: remove glass/blur.
- `login/page.tsx`, `signup/page.tsx`: card glass → solid.
- `dashboard/page.tsx`: hover/badge updates.
- `docs/design.md`, `.claude/rules/design-portal.md`: atualizados.

---

## P006 — Canal email usa SMTP/IMAP/POP3 configurado pelo tenant + webmail integrado (2026-05-02)

**Status:** DECIDED
**Decisão:** Canal de email para atendimento (conversas) usa SMTP outbound + IMAP/POP3 inbound configurados pelo tenant, em vez de Resend inbound webhook. Webmail integrado no portal (módulo "Email" no sidebar). Transacional (reset senha, convite, welcome) continua usando Resend.
**Rationale:** Resend inbound exige MX/SPF/DKIM no dashboard Resend — impraticável para tenants sem conhecimento de DNS. SMTP/IMAP/POP3 são configurados pelo tenant com campos familiares (servidor, porta, usuário, senha) e provider hints auto-preenchem para Gmail/Outlook/Yahoo. Webmail dá ao operador controle direto da caixa de email sem sair do portal.
**Alternativas rejeitadas:**
- Manter Resend para inbound: UX ruim para tenants; requer DNS config manual.
- Mailgun/SendGrid inbound: mesma complexidade DNS.
- Só SMTP sem webmail: operador não visualiza inbox, perde contexto.
**Impacto:**
- Credenciais SMTP/IMAP/POP3: AES-256-GCM em DB (via `CHANNEL_ENCRYPTION_KEY`). Migração para Infisical planejada (D009 aplica quando dynamic tenant secrets virar necessidade).
- Channel model: 14 campos novos (smtp_*, inbound_*, last_poll_*).
- 3 novos models tenant-scoped com RLS: EmailFolder, EmailMessage, EmailAttachment.
- Resend webhook removido (route + lib). svix removido do projeto.
- Cron route `/api/cron/email-poll` para polling periódico.
- Webmail UI: three-panel (pastas | lista | detalhe) em `/email`.
- Permissões: `email:view`, `email:send` adicionadas à RBAC matrix.
- Rate limits: `TEST_CONNECTION` (5/min), `EMAIL_SEND` (30/min).

---

## P007 — Assinatura de email block-based, per-user, server-injected (2026-05-02)

**Status:** DECIDED
**Decisão:** Assinatura de email implementada como editor block-based (foto, info, contato, social, banner, divisor) com renderização server-side para HTML de tabelas com inline styles. Modelo 1:1 com `TenantMembership` (`EmailSignature`). Injeção server-side no momento do envio (padrão Exclaimer/CodeTwo): assinatura completa em new/forward, compacta ("-- nome") em reply.
**Rationale:** Email HTML precisa de tabelas com inline styles para compatibilidade com Outlook/Gmail. Editor WYSIWYG genérico produziria HTML que quebra em clientes de email. Blocos tipados com controles específicos garantem output seguro. Server-side injection garante consistência (usuário não pode alterar/remover no cliente).
**Alternativas rejeitadas:**
- Editor WYSIWYG (TipTap/Slate): HTML gerado quebra em email clients.
- Assinatura por tenant (global): não atende necessidade de assinaturas personalizadas por membro.
- Client-side injection: inconsistente, manipulável.
**Impacto:**
- Model `EmailSignature` com RLS (tenant_id) + teste anti-cross-tenant.
- Feature `src/features/email-signature/` com types, schemas, renderer, queries, save-action.
- API routes para upload/serve de imagens de assinatura (sem auth no serve — destinatários precisam acessar).
- Editor em `/email/signature` com preview ao vivo.
- Integração no `POST /api/webmail/send` e compose modal.

---

## P008 — Módulo Chat separado de Conversation (atendimento humano + WhatsApp) (2026-05-02)

**Status:** DECIDED
**Decisão:** Implementar módulo de chat no portal como entidade separada de `Conversation` (D006). 5 novos models: `Chat`, `ChatMessage`, `ChatParticipant`, `ChatNote`, `QuickReply`. Todas tenant-scoped com RLS.

**Diferença Chat vs Conversation:**
- `Conversation` (D006) é escrita pelo runtime (bridge-ia): tem `Turn`, `tokensIn/Out`, `costUsdTotal`, `AssistanceMode`. Semântica de agente IA.
- `Chat` é escrito pelo portal: participantes humanos, ACK WhatsApp, read tracking, protocolo, quick replies, notas internas. Semântica de atendimento humano.
- Ponte futura: `Chat.conversationId?` opcional para cross-reference quando operador humano assume conversa que começou com IA.

**Real-time:** SSE via API Route (`ReadableStream`). Next.js 16 não tem suporte nativo a WebSocket; custom server com Socket.io viola o modelo do framework. `ChatEventBus` singleton via `globalThis`. V1: single-instance. V2: Redis pub/sub para multi-instance.

**WhatsApp:** via wa-bridge (não whatsapp-web.js). Portal já tem `Channel` com campos wa-bridge. Inbound: webhook → cria/atualiza Chat+ChatMessage → SSE. Outbound: Server Action → salva ChatMessage → HTTP POST wa-bridge → atualiza waMessageId → SSE.

**FK para TenantMembership (não Account):** toda referência a "usuário" no chat usa `membershipId` (contexto do tenant), não `accountId`.

**RBAC:** `chat:view` (owner/admin/supervisor/operator), `chat:send` (idem), `chat:manage` (owner/admin/supervisor), `chat:admin` (owner/admin), `quick_reply:manage` (owner/admin/supervisor).

**Rationale:** separar Chat de Conversation evita poluir o modelo de dados do runtime IA com campos de atendimento humano (participantes, ACK WhatsApp, read tracking, protocol, quick replies). Os dois mundos coexistem e podem ser cross-referenced via FK opcional.

**Alternativas rejeitadas:**
- Reutilizar Conversation+Turn pra chat: forçaria adicionar campos de atendimento humano (participants, ACK, read tracking) em tabelas do runtime IA. Polui o modelo, cria confusão semântica, e dificulta queries otimizadas para cada caso.
- WebSocket via custom server: viola o modelo de deploy Next.js (serverless-ready). SSE cobre push server→client; mutações via Server Actions (já é o padrão).

**Impacto:**
- 5 tabelas novas com RLS + testes anti-cross-tenant.
- 4 enums: `ChatType`, `ChatStatus`, `ChatPriority`, `ChatMessageType`.
- Sidebar: "Chat" com `MessageCircle` no grupo "Operação" após "Email".
- Relações inversas em Tenant, TenantMembership, Channel, Department.
- Feature folder: `src/features/chat/` + `src/features/quick-replies/`.
- API routes: SSE, webhook inbound/ack, upload, media serve.

---

## Como adicionar nova ADR

1. Decisão tomada no chat? Cria entrada aqui imediatamente.
2. Próxima sessão de Claude já não reabre.
3. Se mudar de ideia depois: **não edita** a ADR antiga; cria nova ADR com `Status: SUPERSEDES Pxxx` + rationale do que mudou no contexto.
4. Se a decisão é cross-repo (afeta data plane): registrar em `/root/telefonia-ia/.claude/decisions.md` com prefixo `D`, não aqui.
