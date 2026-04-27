#!/usr/bin/env bash
# PostToolUse hook (matcher: Edit|Write) — type-check rápido após edição em TS/TSX.
# Roda só se há tsconfig (depois do bootstrap do projeto Next.js).
#
# Recebe via stdin um JSON com tool_input.

set -euo pipefail

input="$(cat)"
file_path="$(echo "$input" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("file_path","") or d.get("tool_input",{}).get("path",""))' 2>/dev/null || echo "")"

# Ignora se não é TS/TSX
if ! echo "$file_path" | grep -qE '\.(ts|tsx)$'; then
  exit 0
fi

# Ignora se não há tsconfig (projeto não bootstrapado ainda)
portal_dir="/root/portal"
if [ ! -f "$portal_dir/tsconfig.json" ]; then
  exit 0
fi

# Ignora se o arquivo editado não é dentro de portal/
if ! echo "$file_path" | grep -q "^$portal_dir"; then
  exit 0
fi

# Type-check rápido (skipLibCheck pra ser ágil)
cd "$portal_dir"
output=$(npx tsc --noEmit --pretty false --skipLibCheck 2>&1 || true)

# Se há erros, reporta as primeiras 20 linhas pro Claude considerar
if echo "$output" | grep -qE 'error TS[0-9]+:'; then
  echo "⚠️  TypeScript reportou erros após edição (mostrando primeiros 20):" >&2
  echo "$output" | grep -E 'error TS[0-9]+:' | head -20 >&2
fi

exit 0
