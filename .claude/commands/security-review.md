---
description: Invoca security-reviewer manualmente em escopo amplo (ex.: PR completa antes de release)
---

Use o subagent `security-reviewer` para revisar todos os arquivos modificados desde o último merge em main.

```bash
cd /root/portal
git diff main...HEAD --name-only
```

Submeta a lista ao subagent `security-reviewer` com instrução de aplicar todas as 5 categorias de validação:

1. Tenant isolation (D002).
2. Segredos (D009).
3. Auth (D008).
4. AuditLog/SecurityEvent.
5. CSRF/XSS/Validação.

Reporte resultado consolidado:

- **PASS** ✓ — sem problemas, OK pra mergear.
- **WARN** ⚠️ — lista de itens com sugestões; mergear é decisão sua mas tá registrado.
- **BLOCK** ❌ — lista de itens com correções obrigatórias antes de mergear.

Se você quer revisar arquivos específicos em vez de toda a branch, passe a lista após `/security-review`:
`/security-review src/lib/auth/login.ts src/lib/secrets/infisical.ts`

Arquivos passados explicitamente: $ARGUMENTS
