# Regras de arquitetura do portal

**Escopo:** `src/**`, `next.config.js`, `package.json`, `tailwind.config.ts` (este repo).

Stack canônica: D001 (`/root/telefonia-ia/.claude/decisions.md`).
Detalhe completo: `docs/stack.md`.

## Estrutura de pastas (alvo)

```
portal/
├── src/
│   ├── app/
│   │   ├── (auth)/              # /login, /mfa, /signup, /forgot
│   │   ├── (portal)/            # área logada (após seleção de tenant)
│   │   │   ├── tenants/         # tela de seleção de tenant (multi-membership)
│   │   │   ├── dashboard/
│   │   │   ├── departments/
│   │   │   ├── agents/
│   │   │   ├── knowledge/
│   │   │   ├── channels/
│   │   │   ├── routing/
│   │   │   ├── integrations/
│   │   │   ├── conversations/
│   │   │   ├── audit/
│   │   │   └── settings/
│   │   ├── api/                 # endpoints REST quando necessário (webhooks, downloads)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                  # primitivos shadcn/ui
│   │   ├── layout/
│   │   └── forms/
│   ├── features/                # 1 pasta por feature (entidade)
│   │   └── <feature>/
│   │       ├── actions.ts       # Server Actions
│   │       ├── queries.ts       # leituras
│   │       ├── schemas.ts       # Zod
│   │       ├── components/
│   │       └── types.ts
│   ├── lib/
│   │   ├── auth/                # NextAuth, MFA, TrustedDevice, argon2
│   │   ├── db/                  # Prisma client + middleware tenant
│   │   ├── secrets/             # cliente Infisical
│   │   ├── logger/              # pino com redaction
│   │   ├── rbac/                # assertSession, assertMembership, assertPermission
│   │   ├── i18n/                # next-intl + MessageTemplate resolver
│   │   ├── safe-action/         # cliente next-safe-action
│   │   └── audit/               # helper AuditLog/SecurityEvent
│   ├── types/
│   └── middleware.ts
├── prisma/
├── tests/
├── messages/                    # pt-BR.json, en-US.json, es-ES.json
└── ...
```

## Convenções

- TypeScript strict; sem `any` sem comentário justificando.
- **Server Components por padrão**; `"use client"` só onde precisa interatividade.
- **Server Actions** pra mutação. `next-safe-action` cliente único em `lib/safe-action/`.
- **Imports** organizados por `eslint-plugin-simple-import-sort`.
- **Path aliases**: `@/lib`, `@/components`, `@/features`, `@/types`.

## Princípios

- **Plano de controle vs plano de dados**: este portal gera config; o data plane (`/root/telefonia-ia/`) consome. Portal **nunca** chama Asterisk diretamente; comunicação só via banco compartilhado ou eventos via mensageria (V1.5).
- **Features encapsuladas**: lógica de uma feature mora em `src/features/<feature>/`. Não vazar pra outras features.
- **Sem god-objects**: lib é coleção de utilitários com escopo claro.
- **Erros tipados**: usar `Result<T, E>` ou exceptions classificadas, nunca `throw new Error("oops")`.

## Padrão "Server Action"

Toda Server Action segue este formato:

```ts
"use server";

import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

const inputSchema = z.object({
  agentId: z.string().uuid(),
  /* ... */
});

export const updateAgent = authActionClient
  .schema(inputSchema)
  .action(async ({ parsedInput, ctx }) => {
    // ctx contém: account, membership, tenantId
    assertPermission(ctx.membership, "agent:update");

    return withTenantContext(ctx.tenantId, async (tx) => {
      // mutação dentro da transação com app.current_tenant setado
    });
  });
```

## Regra de "feature plugável"

Para canais e integrações novas (WA, email, ERP, CRM): cada uma é um plugin com interface consistente:
- `connect(credentials_ref): Promise<Connection>`
- `read(...)`, `write(...)`, `subscribe(...)` conforme aplicável
- `disconnect()`

Esse padrão é o que torna escalar de "voz" pra "voz+WA+email+ERP" possível sem reescrever core.

## Anti-padrões (NUNCA)

- Server Action exportada sem `assertSession`/`assertPermission` no início.
- Componente Client buscando dado via `fetch` quando dá pra fazer Server Action / Server Component.
- Lógica de feature vazando pra `lib/` ou pra outra feature.
- Imports relativos longos (`../../../`); usar path alias.
- `any` sem comentário justificando.
- Mexer em RLS/auth direto em código de feature; tudo via helpers de `lib/`.
