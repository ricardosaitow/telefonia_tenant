# Claude Code entry point

Este arquivo é lido pelo Claude Code no início de cada sessão. Regras específicas do projeto estão divididas em dois lugares — ambos são carregados via @import:

@AGENTS.md
@.claude/CLAUDE.md

- `AGENTS.md`: instruções injetadas pelo Next.js — cuidados específicos de versão (Next 16+, breaking changes vs versões antigas).
- `.claude/CLAUDE.md`: regras absolutas, comandos, ADRs e referência aos specs canônicos da plataforma em `/root/telefonia-ia/`.

Não editar este arquivo a não ser pra ajustar imports.
