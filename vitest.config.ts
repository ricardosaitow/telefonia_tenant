import path from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Vitest 4 com `projects` — cada suíte com escopo e config próprios.
 *
 * Convenções:
 * - `unit`: rápido, sem DB, sem network. Roda em todo PR.
 * - `integration`: spinup de Postgres ephemeral via testcontainers, aplica migrations,
 *   permite testar flow Server Action → DB.
 * - `rls`: foco em isolamento cross-tenant. SUITE BLOQUEANTE — falha não merga.
 *   Usa o helper `asTenant()` em `tests/helpers/tenants.ts`.
 *
 * Setup files de integration/rls assumem que `tests/helpers/db-setup.ts` existe.
 * Esse arquivo é responsável por subir o container Postgres + aplicar migrations + seed.
 * Implementação concreta vem com as primeiras models.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          environment: "node",
          globals: false,
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.{ts,tsx}"],
          environment: "node",
          globals: false,
          // Sequencial por padrão pra não brigar pelo container Postgres compartilhado.
          fileParallelism: false,
          // globalSetup roda 1x por suite (sobe container + aplica migrations);
          // setupFiles rodaria por arquivo, custo proibitivo (5-10s/file).
          globalSetup: ["tests/helpers/db-setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "rls",
          include: ["tests/rls/**/*.test.{ts,tsx}"],
          environment: "node",
          globals: false,
          fileParallelism: false,
          globalSetup: ["tests/helpers/db-setup.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "node_modules/**",
        "src/generated/**",
        "tests/**",
        "**/*.config.{ts,js,mjs}",
        ".next/**",
      ],
      thresholds: {
        // Alvo MVP V1: 70% (registro em rules/testing-portal.md)
        // Subiremos pra 85% no V1.5
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
});
