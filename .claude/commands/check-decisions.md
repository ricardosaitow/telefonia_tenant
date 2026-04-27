---
description: Antes de propor mudança arquitetural, valida contra ADRs (cross-repo + portal-only)
---

Carregue, em ordem:

1. `/root/telefonia-ia/.claude/decisions.md` — ADRs platform-wide (D001-D012 e seguintes)
2. `/root/portal/.claude/decisions.md` — ADRs portal-only (P001+ se houver)

Revise a proposta abaixo (ou o tópico em discussão na conversa) contra todas as ADRs com status `DECIDED ✓ DO NOT REOPEN`.

Para cada ADR potencialmente conflitante:

1. Cite o ID da ADR (ex.: D002, P001).
2. Resuma a decisão original e o rationale.
3. Liste alternativas que foram explicitamente rejeitadas naquela ADR.
4. Avalie: a proposta atual repete uma alternativa rejeitada? Se sim, qual mudança de contexto justificaria reabrir?

Se a proposta não conflita: confirme explicitamente "Proposta consistente com ADRs existentes, segue".

Se conflita: diga "Proposta conflita com Dxxx/Pxxx" e exija justificativa antes de seguir. Se não houver justificativa robusta, recuse.

Proposta a avaliar: $ARGUMENTS
