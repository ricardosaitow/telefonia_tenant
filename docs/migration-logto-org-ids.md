# Migration: Logto Org IDs como tenant identifier

**Status:** Design — aguardando aprovação
**Sprint:** Fase 3 portal · subtarefa 3.1
**Data:** 2026-05-15

## Problema

O portal hoje tem `Tenant.id` como `UUID` (Postgres `@db.Uuid`). Ao migrar
auth pro Logto (Fase 3), os IDs das Organizations que o Logto emite têm
formato curto (~12 chars, ex: `o49qdbq0demc`) — NÃO são UUIDs.

Consequência: `assertSession()` lê `claims.organizations` (Logto IDs) e
tenta query em `Tenant` (UUID), Prisma rejeita:

```
DriverAdapterError: invalid input syntax for type uuid: "o49qdbq0demc"
```

Migração precisa reconciliar a tipagem.

## Estado atual

```
prisma/schema.prisma:
  - 24 tabelas com `tenantId String @map("tenant_id") @db.Uuid`
  - FK consistente pra Tenant.id (Uuid)
  - 47 menções a tenant_id no total

prisma/migrations/*.sql:
  - 3+ migrations com RLS policies usando `current_setting('app.current_tenant')::uuid`
  - Coluna tenant_id criada como uuid em cada CREATE TABLE
  - Constraints FK assumem uuid
```

## Opções

### Opção X — Dual key (UUID + logtoOrgId)

Adiciona `logtoOrgId: String @unique` na Tenant. Mantém todos os UUIDs em
outras tabelas. `assertSession` faz lookup `Tenant.findUnique({ where:
{ logtoOrgId: claims.organizations[0] }})` pra obter o UUID interno, que é o
que vai pro cookie `portal-active-tenant`.

**Mudanças:**

- ✅ Schema: 1 coluna nova em 1 tabela (Tenant)
- ✅ RLS: zero mudança (continua UUID)
- ✅ Migrations existentes: intactas
- ✅ FKs: intactas
- ⚠️ Código: assertSession faz lookup extra (Logto ID → Tenant.id UUID)
- ⚠️ Performance: 1 query a mais por request (cacheável)
- ⚠️ Conceitual: 2 IDs por tenant — confuso longo prazo

**Effort:** ~1-2 horas

### Opção Y — String-everywhere (Tenant.id = Logto org ID)

Muda `Tenant.id` de UUID pra String. Muda todos os 24 `tenantId` columns
correspondentes pra String. Reescreve RLS policies pra `text =
current_setting('app.current_tenant')`. Cookie armazena Logto org ID
direto.

**Mudanças:**

- ⚠️ Schema: 24 tabelas afetadas (mudança de tipo da coluna FK)
- ⚠️ RLS: reescrever ~24 policies em 3+ migrations
- ⚠️ Migration: precisa DROP CONSTRAINT, ALTER COLUMN TYPE, RECREATE CONSTRAINT,
  pra TODAS as tabelas com FK pra Tenant
- ⚠️ Risco de dados existentes: precisa converter UUIDs existentes pra... nada
  (não tem mapping; precisa apagar dados de teste)
- ✅ Código: ID único em todo lugar, sem mapping
- ✅ Performance: zero overhead
- ✅ Conceitual: limpo

**Effort:** ~3-4 horas + risco

### Opção Z — Compromisso: PostgreSQL stores Logto ID, exposes UUID

Manter `Tenant.id` UUID na app, mas adicionar trigger no Postgres que
auto-popula `id` a partir do hash do `logtoOrgId`. Pra que dados existentes
(test) continuem funcionando. Complexidade média.

**Effort:** ~2-3 horas, mas mais frágil

## Recomendação

**Opção X** (dual key).

Justificativa:

- Menor impacto. 1 coluna nova, zero migração de tipos.
- RLS policies intactas — risco baixo de quebrar isolamento entre tenants.
- Lookup extra (Logto ID → UUID) é trivial em performance (1 row Tenant).
- Permite migração gradual de outros consumidores no futuro.
- Aceita que "Tenant.id UUID" é detalhe interno; "logtoOrgId" é o identifier
  externo/SSO.

Opção Y é conceitualmente mais bonita mas o blast radius (24 tabelas + RLS)
não vale a economia de uma query.

## Plano de execução (Opção X)

### Passo 1 — Schema (Prisma)

```prisma
model Tenant {
  id          String  @id @default(uuid(7)) @db.Uuid  // unchanged
  logtoOrgId  String? @unique @map("logto_org_id")    // NEW
  ...
}
```

Por que `String?` (nullable): tenants legados (dados de teste) sem org
correspondente no Logto continuam válidos. Novo tenant criado via Logto
flow recebe valor.

### Passo 2 — Prisma migrate

```bash
pnpm prisma migrate dev --name add_logto_org_id
```

Gera SQL:

```sql
ALTER TABLE tenants ADD COLUMN logto_org_id TEXT;
CREATE UNIQUE INDEX tenants_logto_org_id_key ON tenants(logto_org_id);
```

Sem mudar RLS, sem mudar FKs.

### Passo 3 — Seed Tenant pra org Pekiart (dev)

Script pontual ou seed.ts:

```ts
await prisma.tenant.create({
  data: {
    logtoOrgId: "o49qdbq0demc",
    nomeFantasia: "Pekiart",
    razaoSocial: "Pekiart Consulting",
    slug: makeUniqueTenantSlug("Pekiart"),
    status: "active",
    // outros campos obrigatórios...
  },
});
```

### Passo 4 — Atualizar `active-tenant.ts`

```ts
export async function listAccountMemberships(orgIds: string[]) {
  if (orgIds.length === 0) return [];
  const tenants = await prismaAdmin.tenant.findMany({
    where: { logtoOrgId: { in: orgIds } }, // ← mudança aqui
    select: { id: true, slug: true, nomeFantasia: true, status: true, logtoOrgId: true },
  });
  // ...
}
```

### Passo 5 — Atualizar cookie/active-tenant pra usar UUID interno

```ts
// rbac/index.ts
const activeTenantUuid = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value;
// Valida: existe Tenant com esse UUID E o user é membro da org Logto correspondente?
const tenant = await prismaAdmin.tenant.findUnique({
  where: { id: activeTenantUuid },
  select: { id: true, logtoOrgId: true },
});
const isValid = tenant && tenant.logtoOrgId && claims.organizations?.includes(tenant.logtoOrgId);
```

Cookie armazena UUID (Tenant.id), não Logto org ID. Mapping acontece no
boot do request.

### Passo 6 — TenantPicker passa UUID na seleção

`choose-tenant-action.ts` recebe `tenantId: string (UUID)` do form → escreve
no cookie. Como já era assim, zero mudança aqui.

### Passo 7 — Validar

1. /tenants lista a org Pekiart (vem da query Tenant filtrada por logtoOrgId)
2. User clica → cookie seta UUID
3. /dashboard carrega — RLS funciona (UUID tudo)

## Riscos

| Risco                                               | Mitigação                                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Tenant sem logtoOrgId (legado) não aparece pra user | OK — `listAccountMemberships` filtra `where logtoOrgId IN orgIds`. Quem não tem mapping fica invisível, é esperado |
| User no Logto sem Tenant correspondente             | Picker mostra "0 tenants" → /choose-plan (cria tenant + popula logtoOrgId)                                         |
| Performance: lookup extra em assertSession          | Lookup é por UUID indexed, ~0.5ms. Aceitável. Pode cachear depois.                                                 |
| Migrations existentes precisam re-run?              | Não. ALTER TABLE ADD COLUMN é aditivo.                                                                             |

## Limpeza posterior (não nessa sprint)

- Tabelas `Account`, `Session`, `TenantMembership` ficam dormentes. Migration
  futura: `DROP TABLE` quando ninguém mais referenciar.
- `next-auth` + `@auth/prisma-adapter` no package.json: remover depois.
