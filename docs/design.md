# Pekiart Design System — Portal

Documento canônico do design do portal `telefonia.ia`. Toda decisão visual sai daqui. Mudanças exigem ADR nova (não pode "porque essa tela ficou bonita assim"). Regras enforced em `.claude/rules/design-portal.md` e ESLint.

## 1. Princípios

1. **Identidade Pekiart é não-negociável.** Paleta, tipografia, logo e estética alinham com `pekiart.com.br` e o Meet (`/root/meet-inspect/meet/custom-overlay/custom.css`). Toda tela do portal tem que se parecer com o mesmo produto.
2. **Tokens semânticos > cores literais.** Nunca `bg-zinc-900` ou `text-blue-500` em `src/features/**` e `src/app/**`. Só `bg-card`, `text-accent-light`, `border-glass-border`, etc. ESLint bloqueia.
3. **Composição > criação.** Toda feature consome primitivos de `src/components/ui/` (shadcn refatorado) ou composições de `src/components/composed/`. Feature não cria primitivo próprio.
4. **Dual-theme desde o V1.** Dark default + light disponível via toggle. Cada componente é validado nos dois temas antes de merge.
5. **Densidade alta, hierarquia por borders e contraste de bg.** Sombras pesadas só em modais e botões primários (glow). Linear-style.
6. **Vibe Linear no comportamento, vibe Pekiart na pele.** Sidebar fixa + topbar + content denso (Linear) com paleta indigo+violet em deep blue-black + glass + glow (Pekiart).

## 2. Logo e marca

- Lockup principal: `/public/brand/logo.webp` (lobo gradient indigo→violet).
- Watermark: `/public/brand/watermark.png` (versão maior pra hero).
- Favicon: `/public/favicon.ico`.
- PWA icons: `/public/brand/icon192.png`, `/public/brand/icon512.png`.
- Texto da marca: **Pekiart** (empresa) + **telefonia.ia** (produto). Em interface, a forma canônica é `telefonia.ia` com `.ia` em `text-accent-light`.

## 3. Tipografia

- **Inter** — body. Peso 400 (regular) / 500 (medium) / 600 (semibold) conforme contexto.
- **Plus Jakarta Sans** — display (h1-h6, títulos de cards, botões, números grandes). Peso 600/700/800.
- Letter-spacing: `-0.02em` em headings (Pekiart-vibe), `0` em body.
- Carregadas via `next/font/google` em `src/app/layout.tsx` (variáveis `--font-inter`, `--font-jakarta`).

Classes Tailwind disponíveis: `font-sans` (Inter), `font-display` (Plus Jakarta).

## 4. Paleta

### Brand (igual em dark e light — preserva identidade)

| Token                             | Valor                                     | Uso                                        |
| --------------------------------- | ----------------------------------------- | ------------------------------------------ |
| `--accent-color-base` (`primary`) | `#6366f1` (indigo-500)                    | Botão primário, links em hover, CTAs       |
| `--accent-light`                  | `#818cf8`                                 | Estado focado, accent textual, hover sutil |
| `--accent-purple`                 | `#8b5cf6`                                 | Gradients pra avatares, accent secundário  |
| `--accent-glow`                   | `rgba(99,102,241,0.18 dark / 0.12 light)` | Box-shadow glow em hover                   |

### Tema Dark (default)

| Token              | Valor                    | Mapeia pra                                             |
| ------------------ | ------------------------ | ------------------------------------------------------ |
| `--bg-primary`     | `#050810`                | `bg-background`                                        |
| `--bg-secondary`   | `#0a0f1a`                | `bg-muted`                                             |
| `--bg-card-solid`  | `#0d1221`                | `bg-card`, `bg-popover`                                |
| `--text-primary`   | `#f0f4ff`                | `text-foreground`, `text-card-foreground`              |
| `--text-secondary` | `#94a3b8`                | (uso direto)                                           |
| `--text-muted`     | `#64748b`                | `text-muted-foreground`                                |
| `--glass-bg`       | `rgba(255,255,255,0.03)` | `bg-input`, `bg-secondary`, `bg-accent`, `bg-glass-bg` |
| `--glass-border`   | `rgba(255,255,255,0.08)` | `border-border`, `border-glass-border`                 |
| `--divider`        | `rgba(255,255,255,0.06)` | divisores sutis                                        |
| `--divider-strong` | `rgba(255,255,255,0.10)` | divisor forte (header de card)                         |

### Tema Light

| Token              | Valor                                 |
| ------------------ | ------------------------------------- |
| `--bg-primary`     | `#fafbff` (off-white com tint indigo) |
| `--bg-secondary`   | `#f1f3fa`                             |
| `--bg-card-solid`  | `#ffffff`                             |
| `--text-primary`   | `#0a0f1a`                             |
| `--text-secondary` | `#475569` (slate-600)                 |
| `--text-muted`     | `#64748b`                             |
| `--glass-bg`       | `rgba(10,15,26,0.02)`                 |
| `--glass-border`   | `rgba(10,15,26,0.08)`                 |
| `--divider`        | `rgba(10,15,26,0.06)`                 |
| `--divider-strong` | `rgba(10,15,26,0.10)`                 |

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

## 6. Sombras e glow

| Token              | Uso                                     |
| ------------------ | --------------------------------------- |
| `--shadow-card`    | Card solid (border + 1px shadow)        |
| `--shadow-glow`    | Hover de Button default, focus de Input |
| `--shadow-glow-lg` | Active de Button default                |
| `--shadow-modal`   | Dialog, Card variant=glass              |

**Regra:** sombra grossa NÃO é hierarquia padrão. Cards do portal usam border. Glow é reservado pra estados interativos (hover/focus) em elementos primários.

## 7. Spacing

Escala Tailwind padrão (4px-base): `0.5/1/1.5/2/3/4/5/6/8/10/12/16/20/24` etc. Densidade alta (Linear): preferir `gap-2`, `p-3`, `p-4`. Reservar `p-6+` pra cards isolados / hero.

## 8. Layout shells

### 8.1 Auth (não logado) — `(auth)/layout.tsx`

- Sempre **dark** (override visual de marca, independente do tema do user no portal).
- Background: `bg-background` (deep blue-black) + radial gradient indigo+violet sobreposto.
- Logo Pekiart centralizada acima do card.
- Card glass (`<Card variant="glass">`) max-w-md.
- Sem header/sidebar.

### 8.2 Portal (logado) — pendente passo 8c

Linear-style:

```
┌───────────────────────────────────────────────┐
│ [Logo] [Tenant ▾]    [⌘K Search]   [Avatar ▾] │  ← topbar 48px
├──┬────────────────────────────────────────────┤
│  │                                            │
│ S│  Página corrente · breadcrumb              │
│ I│  ───────────────────────                   │
│ D│                                            │
│ E│  conteúdo denso                            │
│ B│                                            │
└──┴────────────────────────────────────────────┘
```

- **Sidebar 240px** (collapsable 56px). Items: Dashboard, Departamentos, Agentes, Conhecimento, Canais, Roteamento, Conversas, Integrações, Auditoria, Configurações.
- **Topbar 48px** com tenant switcher (esquerda), command palette trigger (centro), avatar+menu (direita).
- **Conteúdo** sem Card externo wrapping tudo. Apenas padding-x consistente. Hierarquia por title/description + divider.

## 9. Componentes (`src/components/ui/*`)

Inventário atual (refatorados pra tokens Pekiart):

| Componente | Variants                                                                                           | Notas                                                           |
| ---------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `Button`   | `default` (rounded-md+glow), `outline` (glass border), `secondary`, `ghost`, `destructive`, `link` | font-display, sizes xs/sm/default/lg/icon. **Sem pill** (P004). |
| `Card`     | `solid` (default), `glass`                                                                         | paddings: none/sm/default/lg                                    |
| `Input`    | —                                                                                                  | h-10, glass bg, focus glow                                      |
| `Label`    | —                                                                                                  | font-medium, text-foreground                                    |
| `Alert`    | `default`, `destructive`, `success`                                                                | glass-panel + border-l accent                                   |

### Composição (futura)

`src/components/composed/` (criada conforme demanda):

- `PageHeader` — título + descrição + actions
- `EmptyState` — icon + título + CTA
- `DataTable` — wrap consistente sobre tanstack-table
- `FormField` — Label + Input + erros (consolida Conform pattern)

**Quando precisar de algo que não existe:** PRIMEIRO adiciona em `composed/`, valida nos 2 temas, **depois** consome na feature. Nunca inline.

## 10. Motion

- Transições: `150-200ms` `ease-out`. Nunca animação decorativa.
- Hover de Button default: `-translate-y-px` + `shadow-glow` (200ms).
- Focus de Input: `border-color` + `shadow-glow` (150ms).
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

- **Linear** (https://linear.app) — densidade, sidebar, command palette, atalhos, bordas.
- **Pekiart Meet** (`/root/meet-inspect/meet/`) — paleta, glassmorphism, radial gradients, glow.
- **pekiart.com.br** — identidade da marca.

## 14. Mudanças

Toda mudança nesse documento exige **nova ADR** em `.claude/decisions.md` (prefixo `P`, status `DECIDED`). Documento é versionado em git. Mudança mecânica (typo, link quebrado) não exige ADR.
