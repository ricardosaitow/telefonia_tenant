# Stack do portal — telefonia-ia

Versão concreta da decisão D001 (`/root/telefonia-ia/.claude/decisions.md`). Lista as bibliotecas exatas, versões-alvo, padrões de uso e estrutura de pastas. Documento canônico do bootstrap em `portal/`.

> **Atualização 2026-04-27 — Versões realmente instaladas no bootstrap:** o bootstrap usou `@latest` de cada pacote, resultando em versões major acima dos alvos originalmente listados na tabela abaixo. Detalhe e rationale em `.claude/decisions.md` ADR P001. Versões reais conforme `package.json`: **Next 16.2.4, React 19.2.4, Tailwind 4.2.4** (CSS-first, sem `tailwind.config.ts`), **Prisma 7.8, Zod 4.3, Vitest 4.1, next-intl 4.9, date-fns 4.1, pino 10.3, pnpm 10.33**. As **escolhas arquiteturais** (Prisma > Drizzle, Conform > RHF, Vitest > Jest, etc.) seguem todas válidas; só as versões avançaram. Confiar no `AGENTS.md` (gerado pelo create-next-app) pra cuidados específicos do Next 16+.

## 1. Princípios da stack

- **Estável > novo**. Cada lib escolhida tem >2 anos de uso amplo, mantida ativamente, ecossistema saudável.
- **Type-safe ponta-a-ponta.** Schema Zod é a única definição de input; tipos derivados.
- **Segurança por construção.** RLS no banco, secrets no Infisical, validação no boundary, logging com redaction. Nada que dependa de "lembrar".
- **Owned > rented.** Onde fizer diferença (UI, helpers de auth), dono do código. Sem lock-in que paga juros depois.
- **Escolha única por necessidade.** Não há 2 libs pra mesma coisa coexistindo.

## 2. Stack canônica (resumo)

| Camada | Escolha | Versão alvo |
|---|---|---|
| Runtime | Node.js | 22 LTS |
| Package manager | pnpm | 9+ |
| Framework | Next.js (App Router) | 15.x |
| Linguagem | TypeScript strict | 5.x |
| ORM | Prisma | 5.x |
| Banco | PostgreSQL | 16 (mínimo 15) |
| Auth | Auth.js (NextAuth v5) + adapter Prisma | 5.x |
| MFA TOTP | otpauth | 9.x |
| Senha hash | @node-rs/argon2 | latest |
| Server Actions wrapper | next-safe-action | 7.x |
| Validação | Zod | 3.x |
| Forms | Conform | 1.x |
| UI | Tailwind CSS + shadcn/ui (Radix) | TW 3.x |
| Ícones | Lucide React | latest |
| i18n | next-intl | 3.x |
| Logging | pino + pino-pretty (dev) | 9.x |
| Secrets | @infisical/sdk | latest |
| Email transacional | Resend + React Email | latest |
| Datas | date-fns + date-fns-tz | 3.x / 3.x |
| Testes | Vitest + @testcontainers/postgresql | 2.x / latest |
| E2E | Playwright | 1.x (V1.5) |
| Lint | ESLint + typescript-eslint + simple-import-sort + eslint-plugin-security | 9.x |
| Format | Prettier + prettier-plugin-tailwindcss | 3.x |
| Pre-commit | simple-git-hooks + lint-staged | latest |
| Secrets scan | gitleaks | binário |
| SAST | Semgrep | binário |
| Observability (V1.5) | OpenTelemetry SDK | latest |
| Rate limit (V1.5) | upstash/ratelimit + Redis | latest |
| Antivírus upload (V1.5) | clamav-client + ClamAV daemon | latest |

## 3. Estrutura de pastas final (alvo)

```
/root/telefonia-ia/
├── portal/                          # ESTE projeto Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/              # /login, /mfa, /signup, /forgot
│   │   │   │   └── ...
│   │   │   ├── (portal)/            # área logada (após seleção de tenant)
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── tenants/         # tela de seleção de tenant (multi-membership)
│   │   │   │   ├── dashboard/
│   │   │   │   ├── departments/
│   │   │   │   ├── agents/
│   │   │   │   ├── knowledge/
│   │   │   │   ├── channels/
│   │   │   │   ├── routing/
│   │   │   │   ├── integrations/
│   │   │   │   ├── conversations/
│   │   │   │   ├── audit/
│   │   │   │   └── settings/
│   │   │   ├── api/                 # endpoints REST quando necessário (webhooks, downloads)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx             # landing pública (login)
│   │   ├── components/
│   │   │   ├── ui/                  # primitivos shadcn/ui (Button, Input, etc.)
│   │   │   ├── layout/
│   │   │   └── forms/
│   │   ├── features/                # lógica por feature
│   │   │   ├── agents/
│   │   │   │   ├── actions.ts       # Server Actions
│   │   │   │   ├── queries.ts       # leituras
│   │   │   │   ├── schemas.ts       # Zod
│   │   │   │   ├── components/
│   │   │   │   └── types.ts
│   │   │   ├── auth/
│   │   │   ├── tenants/
│   │   │   ├── departments/
│   │   │   ├── knowledge/
│   │   │   ├── channels/
│   │   │   ├── conversations/
│   │   │   └── integrations/
│   │   ├── lib/
│   │   │   ├── auth/                # NextAuth config, MFA, TrustedDevice
│   │   │   │   ├── config.ts
│   │   │   │   ├── argon2.ts
│   │   │   │   ├── totp.ts
│   │   │   │   └── trusted-device.ts
│   │   │   ├── db/                  # Prisma client + middleware tenant
│   │   │   │   ├── client.ts
│   │   │   │   └── tenant-context.ts
│   │   │   ├── secrets/             # cliente Infisical
│   │   │   │   └── infisical.ts
│   │   │   ├── logger/              # pino com redaction
│   │   │   │   └── index.ts
│   │   │   ├── rbac/                # assertSession, assertMembership, assertPermission
│   │   │   │   └── index.ts
│   │   │   ├── i18n/                # next-intl + MessageTemplate resolver
│   │   │   ├── safe-action/         # cliente next-safe-action com auth+tenant
│   │   │   │   └── index.ts
│   │   │   └── audit/               # helper pra escrever AuditLog/SecurityEvent
│   │   ├── types/
│   │   └── middleware.ts            # Next.js middleware: redirect /login se não autenticado
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   ├── rls/
│   │   │   └── cross-tenant-leak.test.ts
│   │   ├── e2e/                     # V1.5
│   │   └── helpers/
│   │       ├── tenants.ts           # asTenant(id, fn) helper
│   │       └── factories.ts         # builders de fixtures
│   ├── public/
│   ├── messages/                    # next-intl portal strings
│   │   ├── pt-BR.json
│   │   ├── en-US.json
│   │   └── es-ES.json
│   ├── docker-compose.dev.yml       # Postgres local
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── eslint.config.mjs
│   ├── .prettierrc
│   ├── vitest.config.ts
│   └── playwright.config.ts         # V1.5
├── bridge-ia/                       # data plane (já existe)
├── wa-bridge/                       # data plane (já existe)
├── docs/
└── .claude/
```

## 4. Decisões por camada

### 4.1 Next.js — App Router

- **Versão:** 15.x (App Router only).
- **TypeScript strict** com `"strict": true` + `"noUncheckedIndexedAccess": true`.
- **Server Components por padrão.** `"use client"` só onde precisa interatividade.
- **Server Actions** pra mutação. Sem rotas REST quando Server Action serve.
- **Middleware Next.js** (`src/middleware.ts`) só pra autenticação básica e tenant resolution.

**Por que não pages router:** App Router é o futuro, Server Components reduzem JS no cliente, Server Actions integram melhor com auth.

### 4.2 Auth — Auth.js (NextAuth v5)

- **Lib:** `next-auth@5` + `@auth/prisma-adapter`.
- **Strategy:** `database` (sessão revogável; JWT puro só pra refresh).
- **Provider:** Credentials customizado (email + password) — Auth.js não tem Argon2 nativo.
- **Hash de senha:** `@node-rs/argon2` (binding nativo Rust, mais rápido que `argon2` puro JS).
- **MFA TOTP:** `otpauth` lib pra gerar/validar; fluxo step-up custom em rota `/mfa`.
- **Backup codes:** gerados por `crypto.randomBytes`, hash argon2 individual, armazenados cifrados em Infisical.
- **TrustedDevice:** cookie `__Host-td` assinado com `jose` (HMAC) usando chave do Infisical; validado contra entrada `TrustedDevice` no DB.
- **Cookies:** `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Lax`.

**Por que não Lucia / Better Auth:** Auth.js v5 tem ecossistema maior, App Router-native, integração Prisma adapter bem documentada. Lucia é flexível mas mais código a manter; Better Auth é promissor mas ecossistema menor.

### 4.3 Banco — Prisma + Postgres + RLS

- **Lib:** `prisma@5` + `@prisma/client`.
- **Postgres 16** no bootstrap (suporte amplo, features novas úteis).
- **RLS via SQL nas migrations** (gerado pelo subagent `prisma-migrator`).
- **Middleware tenant:** custom em `lib/db/tenant-context.ts` que envolve transação:
  ```ts
  export async function withTenantContext<T>(tenantId: string, fn: PrismaTransaction): Promise<T> {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant = '${escapeUuid(tenantId)}'`);
      return fn(tx);
    });
  }
  ```
- **Usuário do app é não-superuser**; superuser só pra migration. Migrations rodam fora do app (CI ou script manual com creds elevadas).

**Por que não Drizzle:** Prisma tem migration story mais madura, Studio é útil pro time, integração com `@auth/prisma-adapter` cobre boa parte do auth boilerplate. Drizzle é leve e SQL-first mas exige escrever mais por cima.

### 4.4 Validação — Zod + next-safe-action + Conform

- **Schema:** `zod@3`. **Toda** entrada (Server Action, API route, formulário) tem schema Zod.
- **Server Actions:** `next-safe-action@7` pra typed actions com input Zod + auth context:
  ```ts
  export const updateAgent = authActionClient
    .schema(updateAgentSchema)
    .action(async ({ parsedInput, ctx }) => {
      assertPermission(ctx.membership, "agent:update");
      // ...
    });
  ```
- **Forms:** `conform-to@1` pra integrar Server Actions com forms HTML5 sem JS no cliente (form-first, progressive enhancement).
- **Tipos derivados** de Zod via `z.infer<typeof schema>` — uma fonte de verdade.

**Por que Conform vs React Hook Form:** Conform é form-first (HTML5), funciona sem JS no cliente, integra naturalmente com Server Actions. RHF é mais maduro mas client-first e não combina tão bem com App Router/Server Actions. Pra um portal com muita CRUD, Conform reduz boilerplate.

### 4.5 Logging — pino com redaction

- **Lib:** `pino@9` + `pino-pretty` (dev only).
- **Config:** redaction estrutural em campos `password`, `token`, `secret`, `authorization`, `credentials`, `api_key`, `cookie`, `set-cookie`, `mfa_*`, `*_ref` (path Infisical, mesmo que público em si nem é segredo).
- **Output:** JSON em produção (ingerido por Loki/SIEM); pretty em dev.
- **Levels padrão:** `info` em produção, `debug` em dev. `error`/`fatal` para incidentes.

**Por que não winston:** pino é 5x mais rápido, redaction nativa, output JSON estruturado padrão.

### 4.6 Secrets — Infisical SDK

- **Lib:** `@infisical/sdk`.
- **Boot da app:** lê segredos da plataforma do path `/platform/` no Infisical, cache em memória com TTL de 5 min.
- **Segredos por tenant:** lazy load no primeiro uso da request (cache TTL curto), invalidados em mudança via webhook (V1.5).
- **Helper único:** `lib/secrets/infisical.ts` exporta `getSecret(ref)`. Resto da app não fala com Infisical direto.
- **Service account:** token guardado em variável de ambiente `INFISICAL_SERVICE_TOKEN` lida só no boot. Esse token tem policy mínima e é o único secret que mora em env.

### 4.7 UI — Tailwind + shadcn/ui

- **Tailwind CSS 3.x** com plugin `prettier-plugin-tailwindcss` pra ordenação automática.
- **shadcn/ui** (componentes copiados pro repo via `npx shadcn@latest add`). Built on Radix UI (accessible).
- **Lucide React** pra ícones.
- **Tema customizável** via CSS variables (preparado pra white-label futuro por tenant).

**Por que shadcn:** dono do código (sem upgrade hell), accessible por construção (Radix), visual customizável via Tailwind, padrão de mercado pra Next.js sério.

### 4.8 i18n — next-intl + MessageTemplate

Dois sistemas separados (D011):

- **next-intl** pra strings da UI do portal (botões, labels, mensagens de erro, placeholders) — locale do `Account.locale`.
- **MessageTemplate** custom pra mensagens que **o cliente edita** (out-of-hours, ivr_welcome, transfer_handoff). Helper `lib/i18n/templates.ts` resolve por (`tenant_id`, `scope`, `key`, `locale`) com cascata `agent > department > tenant` e fallback pro `Tenant.default_locale`.

Locales V1: `pt-BR`, `en-US`, `es-ES`. Adicionar é só adicionar JSON em `messages/` e povoar templates.

### 4.9 Testes — Vitest + testcontainers

- **Vitest 2.x** pra unit + integration. Mais rápido que Jest, ESM-native, TS-native.
- **@testcontainers/postgresql** pra spinup ephemeral de Postgres em test (mesma versão de produção).
- **Helper `asTenant(id, fn)`** em `tests/helpers/tenants.ts` (essencial pra suite RLS).
- **Vitest projects** pra separar suítes:
  - `unit` (rápido, sem DB)
  - `integration` (com DB)
  - `rls` (com DB, foco em isolamento)
- **Coverage mínima** alvo: 70% no V1, 85% no V1.5.
- **Playwright** pra E2E (V1.5). Esqueleto criado no V1 mas testes ficam pra V1.5.

### 4.10 Email transacional — Resend + React Email

- **Resend** como provedor (API simples, integra com React Email, brasileiro-friendly).
- **React Email** pra templates JSX-first (preview em dev, exporta HTML+plaintext).
- **Templates:** `emails/` na raiz do `portal/`. Tipos: `welcome`, `mfa-enabled`, `new-device`, `password-changed`, `incident-alert`, `dsr-completed`.
- **Alternativa pra V2:** AWS SES quando volume justificar (mais barato em escala).

### 4.11 Datas — date-fns + date-fns-tz

- **date-fns 3.x** (modular, tree-shakable).
- **date-fns-tz** pra timezone (cliente em SP, conversa em outro fuso).
- Sem `moment` (deprecated), sem `dayjs` (suficiente mas ecossistema menor).

### 4.12 Lint, format, pre-commit

- **ESLint flat config** (`eslint.config.mjs`):
  - `@eslint/js` recommended
  - `typescript-eslint` strict-type-checked
  - `eslint-plugin-react`, `eslint-plugin-react-hooks`
  - `eslint-plugin-security` (catches eval, dangerous patterns)
  - `eslint-plugin-simple-import-sort`
  - `eslint-config-prettier` (turn off conflicting rules)
- **Prettier 3** + `prettier-plugin-tailwindcss`.
- **simple-git-hooks** + **lint-staged** (mais leve que husky):
  - `pre-commit`: lint-staged (eslint + prettier nos arquivos staged) + gitleaks
  - `pre-push`: type-check + test:rls
- **Commits:** Conventional Commits enforçado por commitlint.

### 4.13 SAST — Semgrep com regras custom

- Rodar Semgrep em CI com:
  - Regras default `p/typescript`, `p/react`, `p/owasp-top-ten`
  - Regras custom em `.semgrep/` do repo:
    - `prisma-raw-without-review`: bloqueia `$queryRaw`/`$executeRaw` sem comentário `// reviewed-by:`
    - `dangerous-html-without-review`: idem pra `dangerouslySetInnerHTML`
    - `server-action-without-assert-permission`: detecta Server Actions exportadas sem chamada a `assertSession`/`assertPermission`
    - `secret-in-code`: pattern matching adicional sobre gitleaks

### 4.14 Observability (V1.5)

- **OpenTelemetry SDK** Node + auto-instrumentation HTTP/Prisma.
- **Exporter:** console em dev; OTLP pra Grafana Cloud / SigNoz / Tempo+Loki em produção.
- Campos obrigatórios em todo span: `tenant.id`, `account.id`, `feature` (ex.: `agents.publish`).

### 4.15 Rate limit (V1.5)

- **`@upstash/ratelimit`** com Redis (local em dev, Upstash ou Redis dedicado em produção).
- Aplicado em middleware Next.js + dentro de Server Actions sensíveis.

### 4.16 Antivírus upload (V1.5)

- **ClamAV** rodando como daemon em sidecar.
- Cliente: `clamav.js` ou subprocess a `clamscan`.
- Scan **antes** de aceitar upload (rejeita se positivo, registra SecurityEvent).

## 5. `package.json` — scripts canônicos

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --max-warnings=0",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "test": "vitest run --project unit",
    "test:integration": "vitest run --project integration",
    "test:rls": "vitest run --project rls",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset",
    "secrets:check": "gitleaks detect --source . --verbose",
    "sast": "semgrep --config auto --error",
    "verify": "pnpm lint && pnpm type-check && pnpm test:rls",
    "prepare": "simple-git-hooks"
  }
}
```

## 6. Bootstrap do projeto Next.js

Sequência exata pra inicializar `portal/`:

```bash
cd /root/telefonia-ia
pnpm dlx create-next-app@latest portal \
  --typescript --tailwind --eslint --app \
  --src-dir --import-alias "@/*" --no-turbopack
cd portal

# Auth + DB
pnpm add next-auth@beta @auth/prisma-adapter @prisma/client
pnpm add @node-rs/argon2 otpauth jose
pnpm add -D prisma

# Validação + actions + forms
pnpm add zod next-safe-action @conform-to/react @conform-to/zod

# Logging + secrets
pnpm add pino @infisical/sdk
pnpm add -D pino-pretty

# UI
pnpm dlx shadcn@latest init
pnpm add lucide-react clsx tailwind-merge
pnpm add -D prettier prettier-plugin-tailwindcss

# i18n
pnpm add next-intl

# Email
pnpm add resend @react-email/components

# Datas
pnpm add date-fns date-fns-tz

# Lint extras
pnpm add -D eslint-plugin-security eslint-plugin-simple-import-sort \
            eslint-config-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Testes
pnpm add -D vitest @vitest/ui @vitest/coverage-v8 \
            @testcontainers/postgresql tsx \
            @testing-library/react @testing-library/jest-dom

# Pre-commit
pnpm add -D simple-git-hooks lint-staged @commitlint/cli @commitlint/config-conventional

# Init Prisma
pnpm prisma init --datasource-provider postgresql

# Configura simple-git-hooks
# (em package.json — ver §7)
```

## 7. Variáveis de ambiente — `.env.example`

Versionado em git. **Nenhum valor real**, só placeholders.

```bash
# === Plataforma ===
DATABASE_URL="postgresql://app_user:CHANGE_ME@localhost:5432/telefonia_ia?schema=public"
DATABASE_URL_MIGRATE="postgresql://migrator_user:CHANGE_ME@localhost:5432/telefonia_ia?schema=public"

# Ambiente
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# === Auth ===
# Gerada com: openssl rand -base64 32
AUTH_SECRET="CHANGE_ME"
# URL pública (em produção, https://portal.pekiart.com.br)
AUTH_URL="http://localhost:3000"

# === Infisical ===
INFISICAL_SERVICE_TOKEN="st.xxx.xxx"
INFISICAL_SITE_URL="https://secrets.pekiart.com.br"
INFISICAL_PROJECT_ID="CHANGE_ME"
INFISICAL_ENVIRONMENT="dev"  # dev / staging / prod

# === Email (Resend) ===
# Em produção, vem do Infisical. Em dev, env direto serve.
RESEND_API_KEY=""
EMAIL_FROM="noreply@pekiart.com.br"

# === Logs ===
LOG_LEVEL="debug"  # debug em dev, info em prod

# === Observability (V1.5) ===
# OTEL_EXPORTER_OTLP_ENDPOINT=""
# OTEL_SERVICE_NAME="telefonia-ia-portal"
```

Em produção: `DATABASE_URL`, `AUTH_SECRET`, `RESEND_API_KEY` etc. vêm do Infisical via `getSecret()`. Só `INFISICAL_SERVICE_TOKEN` e `NODE_ENV`/`AUTH_URL` ficam em env de fato.

## 8. Pinning e atualização de dependências

- **`packageManager`** fixado em `package.json` (`pnpm@9.x.x`).
- **`engines.node`** fixado em `>=22.0.0`.
- **Lockfile** (`pnpm-lock.yaml`) commitado, atualizado por PR.
- **Renovate** ou **Dependabot** ativo, agrupando atualizações por categoria (auth, dev-deps, etc.) e PRs semanais.
- **Major upgrade** sempre vira PR isolado com lab de testes manual.

## 9. O que NÃO entra agora (registro pra não esquecer)

- **Storybook** pra documentar componentes (V1.5+ se a UI crescer muito).
- **i18n de timezone do operator** (V1: tudo São Paulo; V2: detectar do navegador).
- **Feature flags** (Unleash/PostHog) — adicionar quando precisar A/B test.
- **GraphQL** — REST + Server Actions cobrem tudo no V1.
- **Microservices** dentro do portal — monolito modular é o caminho.
- **Server-side caching agressivo (Redis)** — V1.5 quando rate limit chegar.
- **CDN** custom — Cloudflare cobre (V1.5 quando ativado).

## 10. Próxima ação

Setup mínimo pra começar:

1. **Bootstrap do projeto Next.js** em `portal/` conforme §6 (comando exato).
2. **Bootstrap do schema Prisma** com primeiras models da ontologia (`Account`, `Tenant`, `TenantMembership`).
3. **Setup de RLS** + middleware tenant + helper `asTenant`.
4. **Suite anti-cross-tenant inicial** com 1 model (Tenant ou Account) — esqueleto que escala.
5. **NextAuth com Credentials + argon2** (sem MFA ainda — vem em sequência).
6. Primeiro commit: setup base validável.

Em paralelo, ainda nesta etapa "antes do código":
- **Decisão de PBX** (FreePBX hackado vs FusionPBX vs Asterisk puro) — com a ontologia em mãos, agora é informada. Vira `docs/pbx.md`. Pode ficar pra depois do bootstrap inicial sem prejudicar.
- **Wireframe das telas** principais (login, MFA, seleção de tenant, dashboard, agentes). Baixa fidelidade. Vira `docs/wireframes.md` ou Figma público.

Sugestão de ordem: §10.1-6 (bootstrap concreto) primeiro, decisão PBX e wireframes em paralelo durante o bootstrap. Cada item de §10.1-6 é uma sessão curta com Claude Code rodando subagents corretos (`prisma-migrator` em §10.2, `security-reviewer` em §10.5).
