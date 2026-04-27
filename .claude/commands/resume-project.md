---
description: Recarrega contexto do projeto após pausa longa (dias/semanas)
---

Carregue, em ordem, e leia integralmente:

**Specs canônicos da plataforma (em /root/telefonia-ia/):**
1. `/root/telefonia-ia/.claude/decisions.md` (todas as ADRs platform-wide)
2. `/root/telefonia-ia/docs/ontologia.md` (modelo de dados)
3. `/root/telefonia-ia/docs/seguranca.md` (arquitetura de segurança)
4. `/root/telefonia-ia/.claude/rules/multi-tenant.md`
5. `/root/telefonia-ia/.claude/rules/security.md`
6. `/root/telefonia-ia/.claude/rules/database.md`

**Específicos do portal (este repo):**
7. `/root/portal/.claude/CLAUDE.md` (regras absolutas, comandos)
8. `/root/portal/.claude/decisions.md` (ADRs portal-only)
9. `/root/portal/docs/stack.md` (stack concreta)
10. `/root/portal/.claude/rules/architecture-portal.md`
11. `/root/portal/.claude/rules/testing-portal.md`

Depois execute:

```bash
cd /root/portal
git log --oneline -20 2>/dev/null || echo "(sem commits ainda)"
git status 2>/dev/null
ls -la
test -f package.json && echo "✓ Next.js inicializado" || echo "(Next.js ainda não foi bootstrapado — ver docs/stack.md §6)"
test -f prisma/schema.prisma && echo "✓ Prisma schema existe" || echo "(prisma/schema.prisma ainda não criado)"
```

Reporte:

- **Última feature em andamento** (do git log + status, ou do estado do diretório).
- **ADRs mais recentes** (últimas 3 entradas em `decisions.md` cross-repo + portal).
- **Pitfalls anotados** desde a última sessão (CLAUDE.md §pitfalls).
- **Estado do bootstrap**: package.json existe? prisma/ tem schema? testes RLS rodam?
- **Próximo passo planejado**: do TODO.md, PR aberto, ou último parágrafo da última conversa registrada.

Pergunte ao usuário se quer continuar de onde parou ou mudar de frente.
