#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash) — bloqueio adicional de comandos perigosos
# não cobertos por permissions.deny.
#
# Recebe via stdin um JSON com o tool_input. Sai 0 = permite, 2 = bloqueia.
# Saída em stderr aparece pro Claude considerar.

set -euo pipefail

input="$(cat)"
cmd="$(echo "$input" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("command",""))' 2>/dev/null || echo "")"

# Padrões adicionais de bloqueio (defesa em profundidade contra permissions.deny)
if echo "$cmd" | grep -qiE '(DROP[[:space:]]+DATABASE|TRUNCATE[[:space:]]+TABLE|DELETE[[:space:]]+FROM[[:space:]]+(accounts|tenants|tenant_memberships|audit_log|security_event))'; then
  echo "❌ Comando contém padrão destrutivo crítico em tabela sensível. Bloqueado." >&2
  exit 2
fi

# Bloqueia tentativa de echo/cat de chaves do Infisical
if echo "$cmd" | grep -qiE '(infisical[[:space:]]+secrets[[:space:]]+get|cat[[:space:]]+.*\.env(\.production)?$)'; then
  echo "❌ Tentativa de exfiltração de segredo. Bloqueado." >&2
  exit 2
fi

# Aviso pra qualquer chamada a curl/wget — possível exfiltração ou download não validado
if echo "$cmd" | grep -qE '^(curl|wget) '; then
  echo "⚠️  curl/wget detectado. Confirme que destino é confiável e que não está exfiltrando dado sensível." >&2
fi

# Aviso se o comando muda permissão de arquivos do .claude/
if echo "$cmd" | grep -qE 'chmod.*\.claude'; then
  echo "⚠️  chmod em arquivo do .claude/ detectado. Confirme intencional." >&2
fi

exit 0
