# Regras de teste do portal

**Escopo:** `tests/**` (este repo).

Convenções gerais herdadas de `/root/telefonia-ia/.claude/rules/testing.md` (mesmas regras valem). Este arquivo cobre adaptações específicas do Next.js + Vitest + testcontainers.

## Suítes (vitest projects)

```ts
// vitest.config.ts (esqueleto)
export default defineConfig({
  test: {
    projects: [
      {
        name: "unit",
        include: ["tests/unit/**/*.test.ts"],
      },
      {
        name: "integration",
        include: ["tests/integration/**/*.test.ts"],
        setupFiles: ["tests/helpers/db-setup.ts"],
      },
      {
        name: "rls",
        include: ["tests/rls/**/*.test.ts"],
        setupFiles: ["tests/helpers/db-setup.ts"],
      },
    ],
  },
});
```

| Suíte | Comando | Bloqueia merge? |
|---|---|---|
| Unit | `pnpm test` | Sim |
| Integration | `pnpm test:integration` | Sim |
| **RLS** | `pnpm test:rls` | **Sim — anti-cross-tenant é invariante** |
| E2E (Playwright) | `pnpm test:e2e` | V1.5 |

## Helpers obrigatórios

### `tests/helpers/db-setup.ts`

Spinup de Postgres ephemeral via testcontainers. Aplica migrations Prisma. Roda em `globalSetup`.

```ts
import { PostgreSqlContainer } from "@testcontainers/postgresql";

export async function setup() {
  const container = await new PostgreSqlContainer("postgres:16")
    .withDatabase("portal_test")
    .start();
  process.env.DATABASE_URL = container.getConnectionUri();
  // aplicar migrations
  // seed mínimo de tenants A e B
}
```

### `tests/helpers/tenants.ts`

Helper `asTenant(id, fn)` — roda função dentro de transação com `SET LOCAL app.current_tenant`. **Essencial pra suite RLS**.

```ts
export async function asTenant<T>(tenantId: string, fn: (tx: TX) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant = '${tenantId}'`);
    return fn(tx);
  });
}
```

### `tests/helpers/factories.ts`

Builders de fixtures (Account, Tenant, Agent, etc.). Sempre criar via factory, nunca repetir setup inline.

## Padrão de teste RLS (`tests/rls/cross-tenant-leak.test.ts`)

Pra **TODA** model com `tenantId`:

```ts
describe("RLS: <table>", () => {
  it("tenant B não enxerga registro de tenant A", async () => {
    const recA = await asTenant(A, () =>
      prisma.<modelo>.create({ data: { /* ... */ } })
    );
    const found = await asTenant(B, () =>
      prisma.<modelo>.findUnique({ where: { id: recA.id } })
    );
    expect(found).toBeNull();
  });

  it("tenant B não consegue atualizar registro de tenant A", async () => {
    const recA = await asTenant(A, () =>
      prisma.<modelo>.create({ data: { /* ... */ } })
    );
    const updated = await asTenant(B, () =>
      prisma.<modelo>.updateMany({
        where: { id: recA.id },
        data: { /* algum campo */ },
      })
    );
    expect(updated.count).toBe(0);
  });

  it("tenant B não consegue apagar registro de tenant A", async () => {
    /* análogo */
  });
});
```

## Testes de Server Actions

```ts
import { updateAgent } from "@/features/agents/actions";

describe("updateAgent", () => {
  it("rejeita sem session", async () => {
    const result = await updateAgent({ agentId: "..." });
    expect(result?.serverError).toMatch(/unauthenticated/i);
  });

  it("rejeita operator tentando publicar", async () => {
    /* setup membership operator + chamar com mock de session */
  });
});
```

## Anti-padrões (NUNCA)

- Mockar `prisma` em testes que existem pra validar query real.
- Teste que passa só porque tem `tenantId` no `where` mas não testa o caso adversário (B tentando acessar dado de A).
- E2E que depende de produção/staging real.
- Teste que setup deixa banco sujo pra próximo teste — sempre rollback.
- Teste de Server Action sem testar permissão negada.
