# Architecture Decision Records — telefonia_tenant (portal)

ADRs **específicas do portal**. Decisões cross-repo (que afetam data plane também) ficam em `/root/telefonia-ia/.claude/decisions.md`.

Critério: se a decisão muda algo só dentro de `/root/portal/` (escolha de lib interna, padrão de componente, organização de feature), entra aqui (prefixo `P`). Se muda contrato com o data plane, schema do banco compartilhado, ou modelo de produto, entra na canônica do telefonia-ia (prefixo `D`).

Formato fixo: ID, título, data, status, decisão, rationale, alternativas rejeitadas, impacto.

---

## P001 — Bootstrap com versões "latest" superiores ao alvo da spec (2026-04-27)

**Status:** DECIDED ✓ DO NOT REOPEN
**Decisão:** Bootstrap usou `pnpm dlx create-next-app@latest` + `pnpm add <pkg>` sem pinar versões, resultando em versões major superiores ao alvo originalmente registrado em `docs/stack.md`:

| Lib | Spec original | Instalado | Drift |
|---|---|---|---|
| Next.js | 15.x | 16.2.4 | major +1 |
| React | (não pinado) | 19.2.4 | — |
| Tailwind CSS | 3.x | 4.2.4 | major +1 (CSS-first, sem `tailwind.config.ts`) |
| Prisma | 5.x | 7.8.0 | major +2 |
| Zod | 3.x | 4.3.6 | major +1 |
| Vitest | 2.x | 4.1.5 | major +2 |
| next-intl | 3.x | 4.9.2 | major +1 |
| date-fns | 3.x | 4.1.0 | major +1 |
| pino | 9.x | 10.3.1 | major +1 |
| next-auth | 5 (beta) | 5.0.0-beta.31 | OK (alinhado) |
| pnpm | 9+ | 10.33.2 | major +1 |

**Rationale:** ecosistema Next.js evoluiu rápido. Manter versões "atrasadas" pra alinhar com spec antiga teria custo de migração futura próximo de zero ganho. Spec era um plano; o bootstrap real é a verdade. Vamos com latest stable de tudo.

**Alternativas rejeitadas:** rebaixar manualmente cada dep pra match da spec antiga (tempo perdido reproduzindo versões que vão ficar obsoletas em 6 meses).

**Impacto:**
- **Tailwind 4 é mudança estrutural:** sem `tailwind.config.ts`; configuração via `@theme` directive em CSS. shadcn/ui requer abordagem TW4 quando for adicionado.
- **Prisma 7:** generate por padrão para `src/generated/prisma` (não mais `node_modules/@prisma/client`). Esse path foi adicionado a `.gitignore`.
- **Zod 4:** algumas APIs mudaram em relação a Zod 3. Conferir docs ao usar.
- **Next.js 16:** o `AGENTS.md` injetado pelo create-next-app instrui Claude a ler `node_modules/next/dist/docs/` antes de usar APIs (porque Next 16 quebrou várias coisas vs 15). Importante: confiar no AGENTS.md, não em memória de versões antigas.
- `docs/stack.md` foi atualizado com seção "Versões realmente instaladas" pra evitar referenciar versões fantasma.

**Não-impacto:** decisões arquiteturais (D001-D012) seguem todas válidas. As libs foram só uma versão acima do esperado, mas as escolhas (Prisma vs Drizzle, Conform vs RHF, Vitest vs Jest, etc.) seguem firmes.

---

## Como adicionar nova ADR

1. Decisão tomada no chat? Cria entrada aqui imediatamente.
2. Próxima sessão de Claude já não reabre.
3. Se mudar de ideia depois: **não edita** a ADR antiga; cria nova ADR com `Status: SUPERSEDES Pxxx` + rationale do que mudou no contexto.
4. Se a decisão é cross-repo (afeta data plane): registrar em `/root/telefonia-ia/.claude/decisions.md` com prefixo `D`, não aqui.
