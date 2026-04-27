# telefonia_tenant (portal) — Claude Code project guide

Portal SaaS multi-tenant em Next.js. Control plane da plataforma telefonia-ia: aqui o cliente final configura agentes, departamentos, conhecimento, integrações, ramais, etc.

**Repo irmão:** `/root/telefonia-ia/` é o **data plane** (bridge-ia, wa-bridge, freepbx, mailer, scripts) + **specs canônicos da plataforma**. SEMPRE consultar lá pra modelo de dados, segurança e ADRs cross-repo. Não duplicar.

## Stack (ver `docs/stack.md` pra detalhe completo)

- Runtime: Node 22 LTS, pnpm 9+
- Framework: Next.js 15 (App Router), TypeScript strict
- Auth: Auth.js v5 + Prisma adapter + argon2id + TOTP (otpauth) + TrustedDevice
- DB: Postgres 16 + Prisma 5 + RLS via middleware tenant
- Validação: Zod + next-safe-action + Conform
- UI: Tailwind + shadcn/ui (Radix) + Lucide
- i18n: next-intl + MessageTemplate custom
- Logging: pino com redaction
- Secrets: @infisical/sdk
- Testes: Vitest + testcontainers/postgresql

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

- (vazio)

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

- Repo recém-criado.
- Nenhuma linha de código Next.js escrita ainda.
- `docs/stack.md` é o spec do bootstrap.
- ADRs platform-wide já registradas em `/root/telefonia-ia/.claude/decisions.md` (D001-D012).
- Próximo passo: bootstrap Next.js conforme `docs/stack.md` §6.
