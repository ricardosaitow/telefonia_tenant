# telefonia_tenant (portal) — Claude Code project guide

**IDIOMA: Responder SEMPRE em português-BR. Código, comentários e commits em inglês. Comunicação com o usuário em pt-BR.**

**PROIBIDO ESPECULAR.** NUNCA usar "provavelmente", "talvez", "pode ser", "hipótese", "possivelmente", "acredito que", "suspeito que", ou qualquer palavra/expressão que indique dúvida ou incerteza. Não trabalhar com probabilidades. Antes de afirmar qualquer coisa, pesquisar até ter certeza absoluta — ler o código, rodar testes, debugar, rastrear o fluxo completo. Se não sabe, pesquisa até saber. Gastar quantos tokens forem necessários. Só apresentar fatos confirmados.

Portal SaaS multi-tenant em Next.js. Control plane da plataforma telefonia-ia: aqui o cliente final configura agentes, departamentos, conhecimento, integrações, ramais, etc.

**Repo irmão:** `/root/telefonia-ia/` é o **data plane** (bridge-ia, wa-bridge, freepbx, mailer, scripts) + **specs canônicos da plataforma**. SEMPRE consultar lá pra modelo de dados, segurança e ADRs cross-repo. Não duplicar.

## Stack (versões realmente instaladas — ver `docs/stack.md` + ADR P001 em `.claude/decisions.md` pra rationale da deriva)

- Runtime: **Node 22.22.2**, **pnpm 10.33.2**
- Framework: **Next.js 16.2.4** (App Router), **React 19.2.4**, TypeScript strict
- Auth: Auth.js v5 (`next-auth@5.0.0-beta.31`) + `@auth/prisma-adapter` + `@node-rs/argon2` + `otpauth` + `jose`
- DB: Postgres 16 + **Prisma 7.8** + RLS via middleware tenant (cliente gerado em `src/generated/prisma`)
- Validação: **Zod 4.3** + `next-safe-action@8` + `@conform-to/react` + `@conform-to/zod`
- UI: **Tailwind CSS 4.2** (CSS-first, `@theme` directive em `globals.css`, sem `tailwind.config.ts`) + shadcn/ui (Radix) + Lucide
- i18n: **next-intl 4.9** + MessageTemplate custom
- Logging: **pino 10.3** com redaction
- Secrets: `@infisical/sdk@5`
- Testes: **Vitest 4.1** + `@testcontainers/postgresql`
- Email: Resend + React Email
- Datas: `date-fns@4` + `date-fns-tz@3`

**Atenção (Next 16):** o `AGENTS.md` na raiz instrui a ler `node_modules/next/dist/docs/` antes de usar APIs do Next.js, porque Next 16 tem breaking changes vs versões anteriores. Confiar no doc local, não em memória.

## Documentos canônicos da plataforma (ler antes de feature significativa)

A fonte de verdade da plataforma vive em `/root/telefonia-ia/`. Sempre referenciar dali, não duplicar:

- @/root/telefonia-ia/docs/ontologia.md — modelo de dados (Account, Tenant, Department, Agent, Conversation, etc.)
- @/root/telefonia-ia/docs/seguranca.md — arquitetura de segurança (RLS, MFA, Infisical, LGPD)
- @/root/telefonia-ia/.claude/decisions.md — ADRs da plataforma (D001-D012 e seguintes)
- @/root/telefonia-ia/.claude/rules/multi-tenant.md
- @/root/telefonia-ia/.claude/rules/security.md
- @/root/telefonia-ia/.claude/rules/database.md

Documentos específicos do portal:

- @docs/stack.md — stack concreta com versões
- @.claude/decisions.md — ADRs SÓ DO PORTAL (P001+)
- @.claude/rules/architecture-portal.md — estrutura de pastas, convenções Next.js
- @.claude/rules/testing-portal.md — convenções de teste no portal
- @.claude/rules/design-portal.md — regras DURAS do design system Pekiart (tokens, composição, dual-theme)
- @docs/design.md — princípios completos do design system

Se `/root/telefonia-ia/` não existir nesta máquina, clone primeiro:
```
git clone <url-telefonia-ia> /root/telefonia-ia
```

## Comandos do projeto

(a serem preenchidos quando o Next.js for inicializado — ver `docs/stack.md` §6)

```
pnpm dev              # dev server
pnpm build            # build produção
pnpm start            # start prod
pnpm lint             # eslint
pnpm type-check       # tsc --noEmit
pnpm test             # vitest unit
pnpm test:integration # vitest integration
pnpm test:rls         # suite anti-cross-tenant (DEVE sempre passar)
pnpm test:e2e         # playwright (V1.5)
pnpm verify           # lint + type-check + test:rls
pnpm db:migrate       # prisma migrate dev
pnpm db:seed
pnpm db:studio
```

## Regras absolutas (nunca quebrar)

Mesmas regras platform-wide que valem em `/root/telefonia-ia/.claude/CLAUDE.md`. Resumo:

1. **Tenant isolation** (D002): toda tabela com `tenant_id` tem RLS policy. Toda Server Action começa com `assertSession()` + `assertMembership()`. Toda transação seta `app.current_tenant`.
2. **Segredos** (D009): nunca em DB, .env (só `.env.example`), log, console, ou commit. Único caminho é Infisical via `getSecret(ref)`.
3. **Migrations Prisma**: subagent `prisma-migrator` é auto-invocado. Toda nova tabela com `tenant_id` exige RLS policy + teste em `tests/rls/`.
4. **Decisões**: antes de propor alternativa a algo já implementado, rodar `/check-decisions`. ADR com `Status: DECIDED` exige citar ID e justificar mudança de contexto.
5. **Audit + Security**: toda ação privilegiada gera `AuditLog`. Eventos de segurança geram `SecurityEvent`.
6. **MFA mandatório** (D008) pra todos os papéis. TrustedDevice de 30 dias preserva UX.
7. **Versionamento de Agent** (D005): `draft_state` (autosave) + `AgentVersion` imutável (publish). Runtime sempre lê `current_version_id`.
8. **Conversation unificada** (D006): voz/WA/email moram na mesma tabela.

## Pitfalls conhecidos (lições aprendidas)

(Esta seção cresce ao longo do projeto. Hooks de pós-erro escrevem aqui automaticamente quando padrão recorrente.)

- **shadcn `radix-nova` style traz variants Tailwind 4 que assumem custom variants não definidos no projeto.** Templates novos vêm com classes tipo `data-active:`, `data-horizontal:`, `data-vertical:` que parecem semântica direta dos atributos Radix mas NÃO funcionam — Radix usa `data-state="active"` (não `data-active`) e `data-orientation="horizontal"` (não `data-horizontal`). Quando `shadcn add` instalar componente novo, sempre traduzir essas variants pro syntax raw Tailwind 4: `data-[state=active]:`, `data-[orientation=horizontal]:`, etc. Caso real: `tabs.tsx` instalou com layout completamente quebrado (TabsList em row em vez de col, tab ativa sem destaque visual) por causa disso.
- **Inputs uncontrolled (`defaultValue`) só leem state no mount.** Mudanças no state após mount NÃO atualizam o input. Em UI que troca placeholders/defaults condicionalmente (ex: vertical do agent muda → defaults dos campos mudam), os inputs já renderizados ficam congelados. Fix: forçar re-mount via `key` que muda quando o contexto muda (`key={\`field-${draft.vertical}\`}`). Ou tornar controlled (`value` + `onChange`).
- **Server Actions disparadas por `onBlur` perdem a última edição quando user troca de tab/route antes de tabular fora.** React não dispara `blur` no unmount. Em wizard com tabs, isso = perda silenciosa. Fix: chamar `document.activeElement.blur()` antes da troca de tab/navegação pra forçar o handler.

## Como pedir ajuda nesta base de código

- Pra revisar mudança sensível: `/security-review <arquivos>`
- Pra rodar suite RLS: `/rls-test`
- Pra retomar trabalho depois de pausa: `/resume-project`
- Pra compactar contexto preservando decisões: `/compact-context`
- Antes de propor mudança arquitetural: `/check-decisions <proposta>`

## Fluxo padrão de trabalho

1. Ler ADRs relevantes em `decisions.md` (canônico do telefonia-ia + portal-local).
2. Schema novo: o `prisma-migrator` é chamado automaticamente.
3. Auth/RLS/integration: `security-reviewer` é chamado automaticamente.
4. Antes de commit: `pnpm verify`.
5. Commits em Conventional Commits.

## Estado atual do projeto (2026-04-27)

- ✓ Repo criado com remote `git@github-telefonia:ricardosaitow/telefonia_tenant.git` (push pendente — deploy key precisa ser adicionada nesse repo).
- ✓ `.claude/` setup completo + `docs/stack.md` (com nota de deriva de versão).
- ✓ Bootstrap Next.js feito (`pnpm dlx create-next-app`).
- ✓ Todas as deps de `docs/stack.md` §6 instaladas (auth, prisma, zod, conform, pino, infisical, lucide, next-intl, resend, date-fns, vitest, testcontainers, simple-git-hooks, prettier, eslint plugins).
- ✓ `prisma init` rodado — `prisma/schema.prisma` esqueleto criado.
- ✓ `package.json` com scripts canônicos + simple-git-hooks + lint-staged + commitlint.
- ⚠️ ADR P001 registrada em `.claude/decisions.md`: deriva de versão (Next 16 em vez de 15, TW 4 em vez de 3, etc.) — bootstrap usou latest stable; spec atualizada.

**Próximos passos planejados:**
1. Configurar Vitest projects (unit/integration/rls).
2. Configurar ESLint flat com plugin-security e import-sort.
3. Configurar Prettier.
4. Inicializar shadcn/ui (modo TW4).
5. Escrever primeiras models no `prisma/schema.prisma` (Account, Tenant, TenantMembership) com RLS via subagent `prisma-migrator`.
6. Configurar middleware tenant (`lib/db/tenant-context.ts`) e helper `asTenant` (`tests/helpers/tenants.ts`).
7. Suite RLS inicial (cobre Account/Tenant/Membership) — primeiro teste anti-cross-tenant rodando.
8. NextAuth com Credentials + argon2 (sem MFA ainda).
9. Primeiro fluxo end-to-end validável: signup → login → tela de seleção de tenant.
