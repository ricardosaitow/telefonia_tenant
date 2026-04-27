---
description: Roda suite anti-cross-tenant; obrigatório antes de commits que tocam schema/auth
---

Execute a suite RLS:

```bash
cd /root/portal && pnpm test:rls
```

Se passar: confirme "RLS suite ✓".

Se falhar: leia o teste que falhou, leia a model envolvida, leia a migration correspondente, identifique se é:
- (a) policy ausente na migration SQL,
- (b) middleware não setando `app.current_tenant`,
- (c) helper `asTenant` em `tests/helpers/tenants.ts` com bug,
- (d) teste com setup incorreto.

Reporte hipótese + correção sugerida. Se for (a) ou (b), invocar o subagent `prisma-migrator` ou `security-reviewer` conforme o caso.

Se o projeto Next.js ainda não foi inicializado (sem `package.json` ou `prisma/schema.prisma`), retorne mensagem clara: "Bootstrap pendente — rodar §6 de docs/stack.md primeiro."
