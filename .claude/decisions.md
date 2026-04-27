# Architecture Decision Records — telefonia_tenant (portal)

ADRs **específicas do portal**. Decisões cross-repo (que afetam data plane também) ficam em `/root/telefonia-ia/.claude/decisions.md`.

Critério: se a decisão muda algo só dentro de `/root/portal/` (escolha de lib interna, padrão de componente, organização de feature), entra aqui (prefixo `P`). Se muda contrato com o data plane, schema do banco compartilhado, ou modelo de produto, entra na canônica do telefonia-ia (prefixo `D`).

Formato fixo: ID, título, data, status, decisão, rationale, alternativas rejeitadas, impacto.

---

(Vazio — primeira decisão portal-only ainda não registrada. ADRs platform-wide D001-D012 estão em `/root/telefonia-ia/.claude/decisions.md`.)

---

## Como adicionar nova ADR

1. Decisão tomada no chat? Cria entrada aqui imediatamente.
2. Próxima sessão de Claude já não reabre.
3. Se mudar de ideia depois: **não edita** a ADR antiga; cria nova ADR com `Status: SUPERSEDES Pxxx` + rationale do que mudou no contexto.
4. Se a decisão é cross-repo (afeta data plane): registrar em `/root/telefonia-ia/.claude/decisions.md` com prefixo `D`, não aqui.
