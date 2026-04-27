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
