# Helpers de teste

Utilities compartilhadas pelas suítes `integration` e `rls`.

## Arquivos previstos

| Arquivo        | Função                                                                                                                      | Status                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `db-setup.ts`  | `globalSetup` do Vitest: sobe Postgres em testcontainers, aplica migrations Prisma, gera client                             | a criar com primeiras models     |
| `tenants.ts`   | `asTenant(tenantId, fn)` — roda função em transação Prisma com `SET LOCAL app.current_tenant`. **Essencial pra suite RLS.** | a criar com primeiras models     |
| `factories.ts` | Builders de fixtures (Account, Tenant, Membership, etc.)                                                                    | a criar com primeiras models     |
| `session.ts`   | Helpers pra mockar sessão NextAuth em testes de Server Action                                                               | a criar quando NextAuth integrar |

Ver `.claude/rules/testing-portal.md` pra padrões de teste e exemplos.
