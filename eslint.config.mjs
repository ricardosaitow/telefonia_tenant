import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import security from "eslint-plugin-security";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Plugins customizados
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
      security,
    },
    rules: {
      // Imports organizados automaticamente
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // Plugin security: padrões perigosos
      "security/detect-object-injection": "off", // muito barulhento; ativar caso a caso
      "security/detect-non-literal-regexp": "warn",
      "security/detect-eval-with-expression": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "error",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-new-buffer": "error",
      "security/detect-pseudoRandomBytes": "error",
      "security/detect-unsafe-regex": "warn",

      // TypeScript: proibir any sem comentário
      "@typescript-eslint/no-explicit-any": ["warn", { ignoreRestArgs: false }],

      // React Server Actions: forçar uso explícito de "use server"
      // (lint rule custom seria ideal; por ora confiamos no padrão de pasta)
    },
  },

  // Design system enforcement — bloqueia cor numerada Tailwind em features/app.
  // Regra ancorada em ADR P003 + .claude/rules/design-portal.md.
  // Tokens semânticos só (bg-card, text-accent-light, border-glass-border, etc).
  // Componentes base em src/components/ui/ ainda podem ter cor numerada durante
  // transição inicial — o lint roda só nas pastas onde features moram.
  {
    files: ["src/features/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}", "src/components/composed/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/\\b(bg|text|border|ring|from|via|to|shadow|fill|stroke|outline|decoration|divide|placeholder|caret|accent)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d+\\b/]",
          message:
            "Cor Tailwind numerada proibida em src/features, src/app e composed (regra design-portal.md, ADR P003). Use tokens semânticos: bg-card, text-foreground, border-border, text-accent-light, bg-glass-bg, etc. Lista completa em docs/design.md §4.",
        },
        {
          selector:
            "TemplateElement[value.raw=/\\b(bg|text|border|ring|from|via|to|shadow|fill|stroke|outline|decoration|divide|placeholder|caret|accent)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d+\\b/]",
          message:
            "Cor Tailwind numerada proibida em template string (regra design-portal.md, ADR P003). Use tokens semânticos.",
        },
        {
          selector: "Literal[value=/\\brounded-full\\b/]",
          message:
            "rounded-full proibido em features/app/composed (P004 — sem pill). Use rounded-md ou rounded-lg. Exceção: status dots/spinners ficam em src/components/ui/.",
        },
        {
          selector: "TemplateElement[value.raw=/\\brounded-full\\b/]",
          message:
            "rounded-full proibido em template string (P004 — sem pill). Use rounded-md ou rounded-lg.",
        },
      ],
    },
  },

  // Desativa regras de format que conflitam com Prettier — DEVE vir por último
  prettier,

  // Ignores
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "src/generated/**",
    ".claude/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
