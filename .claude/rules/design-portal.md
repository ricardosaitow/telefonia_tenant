# Regras de design do portal

**Escopo:** `src/**`, `tailwind` config, CSS global.

Documento canônico de design: `docs/design.md`. ADR ancorada: P003. Estas regras são o resumo operacional de proibições e enforcement diário.

## Tokens semânticos

- **Proibido** usar cor numerada em `src/features/**` e `src/app/**`: `bg-zinc-900`, `text-blue-500`, `border-red-300`, `ring-purple-400`, etc. Ferramenta: ESLint rule custom (`eslint.config.mjs`).
- **Permitido** usar tokens semânticos: `bg-background`, `bg-card`, `bg-primary`, `bg-glass-bg`, `text-foreground`, `text-muted-foreground`, `text-accent-light`, `border-border`, `border-glass-border`, `border-divider-strong`, `ring-ring`, `shadow-glow`, etc. Lista completa: `docs/design.md` §4-6.
- Componentes em `src/components/ui/**` PODEM usar cor literal só no caso de estados muito específicos do primitivo (ex.: `border-l-destructive`); preferir token sempre que possível.
- Tipografia: usar `font-sans` (Inter, body) ou `font-display` (Plus Jakarta, headings/buttons). **Proibido** carregar outras fontes ad-hoc em features.

## Composição > criação

- **Proibido** feature criar primitivo (Button, Input, Card, Alert custom) em `src/features/**` ou `src/app/**`.
- Feature consome de `src/components/ui/` (shadcn primitivos refatorados) ou `src/components/composed/` (composições reutilizáveis).
- Se faltar componente:
  1. **Primeiro** adicionar em `src/components/composed/` (validado isolado, nos 2 temas).
  2. **Depois** consumir na feature.
- **Proibido** inline de comportamento que repete em ≥2 lugares (ex.: form-field com label + input + erro). Vira composição.

## Dual-theme

- Toda mudança visual deve ser validada **nos 2 temas (dark + light)** antes de merge. Toggle no avatar menu (passo 8c) facilita teste manual.
- **Proibido** referência a tema ("dark", "light") em CSS de feature. Se um valor diferir entre temas, é um token novo no `globals.css`.
- Se uma feature precisar de visual SÓ em dark (raro — auth pages, talvez), aplicar `class="dark"` no container e documentar no PR.

## Layout shell

- Layout shell pós-login (sidebar + topbar) é **fixo** (`docs/design.md` §8.2). Feature renderiza dentro do shell, não cria shell próprio.
- Shell de auth (`(auth)/layout.tsx`) é **fixo**: dark deep + radial gradient + logo central + card glass.
- **Proibido** feature inserir `<header>`, `<aside>`, ou wrappers que conflitem com o shell.

## Componentes shadcn

- Primitivos são **copiados** pro repo (`src/components/ui/`). Atualizações via `pnpm dlx shadcn add` são **revisadas**: se o template novo trouxe sotaque shadcn (cor numerada, classes não-token), refatorar antes de comitar.
- **Proibido** reverter customização Pekiart de primitivo durante update do shadcn.

## Densidade

- Sizes default: `Button h-10`, `Input h-10`. Ações compactas: `xs/sm`. Não inflar pra `lg` exceto em hero.
- Spacing: preferir `gap-2`, `p-3`, `p-4`. Reservar `p-6+` pra cards isolados / hero.
- **Proibido** padding/spacing arbitrário tipo `pt-7`, `gap-9`. Sempre escala (1/2/3/4/5/6/8/10/12/16).

## Sombras

- Hierarquia visual usa **border** + **contraste de bg**. Sombra cinza padrão é **proibida** em features.
- Sombras permitidas: `shadow-glow` (hover de Button default), `shadow-modal` (dialog/popover/glass card), `shadow-card` (Card solid border).

## Ícones

- Lib única: `lucide-react`. Tamanho default `size-4` (16px). Em ícones decorativos: `size-5` (20px). Em ícones de hero: `size-6` (24px).
- **Proibido** trazer outras libs de ícone (heroicons, react-icons, etc).

## Acessibilidade

- **Proibido** remover `focus-visible` ring de qualquer interactive.
- **Proibido** `outline-none` sem substitute focus styling.
- Form: `aria-invalid` sempre quando há erro (Conform faz). Erros associados via `aria-describedby`.

## Anti-padrões (NUNCA)

- `<div className="bg-[#0d1221]">...` — cor hex inline.
- `<div className="bg-zinc-900">...` — cor numerada.
- `style={{ color: '#fff' }}` — style inline com cor.
- `className="hover:shadow-2xl"` — sombra grossa.
- `<button>...</button>` em vez de `<Button>` — ignorar primitivo.
- Inline de form: `<input>` direto em feature em vez de `<Input>`.
- Tema condicional em feature: `theme === 'dark' ? 'bg-black' : 'bg-white'`. **Use tokens.**

## Como pedir review

- Subagent `design-reviewer` será criado quando mudanças visuais ficarem frequentes (V1.5).
- Por enquanto: PR autor verifica visualmente nos 2 temas + roda `pnpm lint` (ESLint pega cor numerada).

## Como propor mudança no design system

1. Abrir nova ADR em `.claude/decisions.md` com prefixo `P`, status `DECIDED`.
2. Atualizar `docs/design.md` na mesma PR.
3. Atualizar este arquivo se a mudança altera regras operacionais.
4. Validar que componentes existentes seguem (refator coordenado se preciso).
