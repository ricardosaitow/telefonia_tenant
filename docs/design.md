# Pekiart Design System — Portal

Documento canônico do design do portal `telefonia.ia`. Toda decisão visual sai daqui. Mudanças exigem ADR nova (não pode "porque essa tela ficou bonita assim"). Regras enforced em `.claude/rules/design-portal.md` e ESLint.

## 1. Princípios

1. **Identidade Pekiart é não-negociável.** Paleta, tipografia, logo e estética alinham com `pekiart.com.br` e o Meet. Toda tela do portal tem que se parecer com o mesmo produto.
2. **Tokens semânticos > cores literais.** Nunca `bg-zinc-900` ou `text-blue-500` em `src/features/**` e `src/app/**`. Só `bg-card`, `text-accent-light`, `border-glass-border`, etc. ESLint bloqueia.
3. **Composição > criação.** Toda feature consome primitivos de `src/components/ui/` (shadcn refatorado) ou composições de `src/components/composed/`. Feature não cria primitivo próprio.
4. **Dual-theme desde o V1.** Dark default + light disponível via toggle. Cada componente é validado nos dois temas antes de merge.
5. **Densidade alta, hierarquia por borders e contraste de bg.** Sombras somente em modais. Sem glow (P005).
6. **Linear pure na estética, Pekiart na identidade (P005).** Superfícies sólidas + borders hairline + hierarquia por contraste de bg. Identidade Pekiart via paleta indigo/violet, tipografia e logo — não via glass/glow.

## 2. Logo e marca

- Lockup principal: `/public/brand/logo.webp` (lobo gradient indigo→violet).
- Watermark: `/public/brand/watermark.png` (versão maior pra hero).
- Favicon: `/public/favicon.ico`.
- PWA icons: `/public/brand/icon192.png`, `/public/brand/icon512.png`.
- Texto da marca: **Pekiart** (empresa) + **telefonia.ia** (produto). Em interface, a forma canônica é `telefonia.ia` com `.ia` em `text-accent-light`.

## 3. Tipografia

- **Inter** — body. Peso 400 (regular) / 500 (medium) / 600 (semibold) conforme contexto.
- **Plus Jakarta Sans** — display (h1-h6, títulos de cards, botões, números grandes). Peso 600/700/800.
- Letter-spacing: `-0.03em` em headings (P005), `0` em body.
- Carregadas via `next/font/google` em `src/app/layout.tsx` (variáveis `--font-inter`, `--font-jakarta`).

Classes Tailwind disponíveis: `font-sans` (Inter), `font-display` (Plus Jakarta).

## 4. Paleta

### Brand (igual em dark e light — preserva identidade)

| Token                             | Valor                  | Uso                                        |
| --------------------------------- | ---------------------- | ------------------------------------------ |
| `--accent-color-base` (`primary`) | `#6366f1` (indigo-500) | Botão primário, links em hover, CTAs       |
| `--accent-light`                  | `#818cf8`              | Estado focado, accent textual, hover sutil |
| `--accent-purple`                 | `#8b5cf6`              | Gradients pra avatares, accent secundário  |
| ~~`--accent-glow`~~               | `rgba(..., 0.0)`       | **Zerado (P005).** Mantido pra compat.     |

### Tema Dark (default)

| Token              | Valor                    | Mapeia pra                                |
| ------------------ | ------------------------ | ----------------------------------------- |
| `--bg-primary`     | `#010102`                | `bg-background`                           |
| `--bg-secondary`   | `#0f1011`                | `bg-muted`                                |
| `--bg-card-solid`  | `#141516`                | `bg-card`, `bg-popover`                   |
| `--surface-1`      | `#0f1011`                | `bg-surface-1` — layer 1                  |
| `--surface-2`      | `#141516`                | `bg-surface-2` — layer 2                  |
| `--surface-3`      | `#1a1b1e`                | `bg-surface-3` — layer 3                  |
| `--text-primary`   | `#e8e8e8`                | `text-foreground`, `text-card-foreground` |
| `--text-secondary` | `#8a8f98`                | (uso direto)                              |
| `--text-muted`     | `#64748b`                | `text-muted-foreground`                   |
| `--glass-bg`       | `rgba(255,255,255,0.03)` | `bg-input`, `bg-glass-bg`                 |
| `--glass-border`   | `rgba(255,255,255,0.08)` | `border-border`, `border-glass-border`    |
| `--divider`        | `rgba(255,255,255,0.06)` | divisores sutis                           |
| `--divider-strong` | `rgba(255,255,255,0.10)` | divisor forte (header de card)            |

### Tema Light

| Token              | Valor                 |
| ------------------ | --------------------- |
| `--bg-primary`     | `#ffffff`             |
| `--bg-secondary`   | `#f5f6f8`             |
| `--bg-card-solid`  | `#ffffff`             |
| `--surface-1`      | `#f5f6f8`             |
| `--surface-2`      | `#edeef1`             |
| `--surface-3`      | `#e5e6ea`             |
| `--text-primary`   | `#0a0f1a`             |
| `--text-secondary` | `#475569` (slate-600) |
| `--text-muted`     | `#64748b`             |
| `--glass-bg`       | `rgba(10,15,26,0.02)` |
| `--glass-border`   | `rgba(10,15,26,0.08)` |
| `--divider`        | `rgba(10,15,26,0.06)` |
| `--divider-strong` | `rgba(10,15,26,0.10)` |

### Funcionais

| Token           | Dark                  | Light                 | Uso          |
| --------------- | --------------------- | --------------------- | ------------ |
| `--destructive` | `oklch(0.65 0.22 25)` | `oklch(0.55 0.22 27)` | Erro, delete |
| `--ring`        | `--accent-light`      | `--accent-color-base` | Foco visível |

## 5. Radius

| Token          | Valor        | Uso                                                                              |
| -------------- | ------------ | -------------------------------------------------------------------------------- |
| `--radius-sm`  | `6px`        | Badges, status pills compactos                                                   |
| `--radius-md`  | `10px`       | **Default** — buttons, inputs, dropdowns, avatares                               |
| `--radius-lg`  | `14px`       | Cards, alerts, popovers                                                          |
| `--radius-xl`  | `18px`       | Dialogs                                                                          |
| `--radius-2xl` | `24px`       | Hero cards, command palette                                                      |
| ~~Pill~~       | ~~`9999px`~~ | **Banido** em UI elements (P004). Só status dots / spinners em `components/ui/`. |

## 6. Sombras

| Token            | Valor                             | Uso                        |
| ---------------- | --------------------------------- | -------------------------- |
| `--shadow-card`  | `0 0 0 1px var(--divider-strong)` | Card solid (hairline only) |
| `--shadow-modal` | `0 30px 80px rgba(0,0,0,0.6)`     | Dialog, popover            |
| ~~shadow-glow~~  | `none`                            | **Removido (P005)**        |

**Regra (P005):** sem glow, sem backdrop-blur. Hierarquia visual vem de border + contraste de bg (surface ladder). Sombra reservada pra modais.

## 7. Spacing

Escala Tailwind padrão (4px-base): `0.5/1/1.5/2/3/4/5/6/8/10/12/16/20/24` etc. Densidade alta (Linear): preferir `gap-2`, `p-3`, `p-4`. Reservar `p-6+` pra cards isolados / hero.

## 8. Layout shells

### 8.1 Auth (não logado) — `(auth)/layout.tsx`

- Sempre **dark** (override visual de marca, independente do tema do user no portal).
- Background: `bg-background` (canvas puro, sem gradient — P005).
- Logo Pekiart centralizada acima do card.
- Card solid (`<Card variant="solid">`) max-w-md.
- Sem header/sidebar.

### 8.2 Portal (logado)

Linear-style:

```
┌───────────────────────────────────────────────┐
│ [Logo] [Tenant ▾]    [⌘K Search]   [Avatar ▾] │  ← topbar 56px
├──┬────────────────────────────────────────────┤
│  │                                            │
│ S│  Página corrente · breadcrumb              │
│ I│  ───────────────────────                   │
│ D│                                            │
│ E│  conteúdo denso                            │
│ B│                                            │
└──┴────────────────────────────────────────────┘
```

- **Sidebar 240px** (collapsable 56px). bg sólido, sem backdrop-blur.
- **Topbar 56px** com tenant switcher (esquerda), command palette trigger (centro), avatar+menu (direita). bg sólido, sem backdrop-blur.
- **Conteúdo** sem Card externo wrapping tudo. Apenas padding-x consistente. Hierarquia por title/description + divider.

## 9. Componentes (`src/components/ui/*`)

Inventário atual (tokens semânticos, Linear pure — P005):

| Componente | Variants                                                                                                  | Notas                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `Button`   | `default` (hover:opacity-90), `outline` (hover:bg-surface-1), `secondary`, `ghost`, `destructive`, `link` | font-display, sizes xs/sm/default/lg/icon. **Sem pill** (P004). |
| `Card`     | `solid` (default), `glass` (bg-surface-2 sólido)                                                          | paddings: none/sm/default/lg                                    |
| `Input`    | —                                                                                                         | h-10, focus ring-1 ring-ring/20                                 |
| `Label`    | —                                                                                                         | font-medium, text-foreground                                    |
| `Alert`    | `default`, `destructive`, `success`                                                                       | border + border-l accent                                        |

### Composição (futura)

`src/components/composed/` (criada conforme demanda):

- `PageHeader` — título + descrição + actions
- `EmptyState` — icon + título + CTA
- `DataTable` — wrap consistente sobre tanstack-table
- `FormField` — Label + Input + erros (consolida Conform pattern)

**Quando precisar de algo que não existe:** PRIMEIRO adiciona em `composed/`, valida nos 2 temas, **depois** consome na feature. Nunca inline.

## 10. Motion

- Transições: `150ms` `ease-out`. Nunca animação decorativa.
- Hover de Button default: `opacity-90` (150ms). Sem translate, sem glow (P005).
- Focus de Input: `border-ring` + `ring-1 ring-ring/20` (150ms).
- Modais: fade-in + scale 0.96→1 (Radix default, OK).

## 11. Acessibilidade (não-negociável)

- Todo primitivo herda a11y de Radix por construção (foco, ARIA, navegação por teclado).
- Contraste mínimo AA (WCAG 2.1) nos dois temas — auditável com axe-core no V1.5.
- Nunca remover `focus-visible` ring.
- `aria-invalid="true"` sempre acompanha erro de form (Conform faz por default).

## 12. Toolkit

- **shadcn/ui** (Radix por baixo) — toolkit de a11y + base de primitivos. **Não estética.** Refatoramos pra perder o sotaque shadcn.
- **Tailwind CSS 4** — engine de styling. `@theme inline` em `globals.css`.
- **next-themes** — toggle dark/light, persistência localStorage.
- **lucide-react** — biblioteca única de ícones. Tamanho default `size-4` (16px).

## 13. Referências visuais

- **Linear** (https://linear.app) — densidade, sidebar, command palette, atalhos, bordas, superfícies sólidas.
- **pekiart.com.br** — identidade da marca (paleta, tipografia, logo).

## 14. Mudanças

Toda mudança nesse documento exige **nova ADR** em `.claude/decisions.md` (prefixo `P`, status `DECIDED`). Documento é versionado em git. Mudança mecânica (typo, link quebrado) não exige ADR.
