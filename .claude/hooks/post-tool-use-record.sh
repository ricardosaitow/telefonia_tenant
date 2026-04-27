#!/usr/bin/env bash
# PostToolUse hook (matcher: Bash) — captura padrões de erro recorrentes
# e arquiva pra próxima sessão ler. Mitiga Dor #2 (mesmo erro repetido).
#
# Recebe via stdin um JSON com tool_input + tool_response.

set -euo pipefail

input="$(cat)"
output="$(echo "$input" | python3 -c 'import sys,json; d=json.load(sys.stdin); r=d.get("tool_response",{}); print((r.get("output") or r.get("error") or ""))' 2>/dev/null || echo "")"
cmd="$(echo "$input" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("command",""))' 2>/dev/null || echo "")"

# Caminhos de memória
mem_root="/root/.claude/projects/-root/memory"
date_str="$(date -Iseconds)"

# Detecta erros de RLS típicos
if echo "$output" | grep -qiE '(row-level security|RLS policy|new row violates row-level)'; then
  if [ -d "$mem_root" ]; then
    cat >> "$mem_root/MEMORY.md" <<EOF

## Erro RLS detectado em portal ($date_str)
- Comando: ${cmd:0:120}
- Output (primeiras 3 linhas):
$(echo "$output" | head -3 | sed 's/^/  /')
- Verificar: policy existe na tabela? withTenantContext setou app.current_tenant? sessão tem tenantId?
- Referência: D002 em /root/telefonia-ia/.claude/decisions.md

EOF
  fi
fi

# Detecta erros de schema sem tenantId
if echo "$output" | grep -qiE 'column .tenant_id. does not exist'; then
  echo "⚠️  Tabela sem coluna tenant_id detectada em erro. Conferir D002." >&2
fi

# Detecta erros típicos de auth
if echo "$output" | grep -qiE '(invalid signature|jwt malformed|UnauthorizedError)'; then
  echo "ℹ️  Erro de auth. Conferir AUTH_SECRET no Infisical e config NextAuth." >&2
fi

# Detecta gitleaks com positivo
if echo "$cmd" | grep -q "gitleaks" && echo "$output" | grep -qiE '(leaks found|secret detected)'; then
  echo "❌ gitleaks encontrou segredo. NÃO COMITTAR. Mover pro Infisical antes." >&2
fi

# Detecta erros típicos de Prisma
if echo "$output" | grep -qiE 'P2002|P2025'; then
  echo "ℹ️  Erro Prisma comum (P2002 unique violation, P2025 not found). Conferir constraint ou tenant context." >&2
fi

exit 0
