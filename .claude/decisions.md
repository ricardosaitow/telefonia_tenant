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

## Como adicionar nova ADR

1. Decisão tomada no chat? Cria entrada aqui imediatamente.
2. Próxima sessão de Claude já não reabre.
3. Se mudar de ideia depois: **não edita** a ADR antiga; cria nova ADR com `Status: SUPERSEDES Pxxx` + rationale do que mudou no contexto.
4. Se a decisão é cross-repo (afeta data plane): registrar em `/root/telefonia-ia/.claude/decisions.md` com prefixo `D`, não aqui.
