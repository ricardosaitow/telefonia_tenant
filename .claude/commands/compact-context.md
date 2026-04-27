---
description: Compacta contexto preservando decisões e estado atual de feature
---

Antes de rodar `/compact`, garanta que:

1. **ADRs novas** desta sessão estão registradas:
   - Se cross-repo (afeta data plane): `/root/telefonia-ia/.claude/decisions.md` (`D` prefix).
   - Se só portal: `/root/portal/.claude/decisions.md` (`P` prefix).
   Se houve decisão arquitetural fechada e ainda não tá em arquivo: PARE, registre primeiro, depois compacte.

2. **Pitfalls aprendidos** estão em `/root/portal/.claude/CLAUDE.md` na seção "Pitfalls conhecidos". Se a sessão teve erro instrutivo recorrente: documente.

3. **Estado atual da feature em andamento** está documentado em comentário no código, em PR description, ou em `TODO.md`. Não confiar na memória do chat.

Depois de garantir os 3 itens acima, rode:

```
/compact preservar foco em: ADRs (cross-repo + portal), regras em rules/, feature em andamento, pitfalls aprendidos
```

Após compactação, confirme que `CLAUDE.md` e `decisions.md` foram recarregados (são lidos do disco em todo boot). Faça uma pergunta de teste:
"Qual foi a decisão D002?"

Se o Claude não souber, há problema no carregamento — investigar antes de continuar.
