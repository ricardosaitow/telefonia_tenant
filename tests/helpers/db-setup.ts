/**
 * globalSetup do Vitest pras suites `integration` e `rls`.
 *
 * - Sobe Postgres 16 ephemeral via testcontainers (mesma versao do dev).
 * - Roda o init script (infra/postgres/init/01-app-role.sql) pra criar
 *   `app_user` (NOSUPERUSER, NOBYPASSRLS) com mesmos GRANTs do dev.
 * - Aplica todas as migrations Prisma (incl. RLS) via `prisma migrate deploy`.
 * - Expoe DATABASE_URL (app_user) e DATABASE_URL_MIGRATE (postgres) pros
 *   helpers (tests/helpers/test-client.ts, tests/helpers/tenants.ts).
 *
 * Vitest 4 globalSetup: arquivo deve exportar `setup` e `teardown` (ou
 * default function). Roda 1x por suite, antes de qualquer test file.
 *
 * Por que globalSetup e nao setupFiles:
 *   setupFiles roda por test file (3-5s de overhead em cada). Container
 *   custa ~5s pra subir, ~2s pra `prisma migrate deploy` -- caro demais
 *   pra repetir. globalSetup faz 1x e compartilha.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const INIT_SQL_PATH = resolve(REPO_ROOT, "infra/postgres/init/01-app-role.sql");

let container: StartedPostgreSqlContainer | undefined;

function buildAppUserUrl(c: StartedPostgreSqlContainer, password: string): string {
  // Reescreve a URI do container substituindo user/pwd por app_user.
  // Mesma host/port/db.
  const host = c.getHost();
  const port = c.getMappedPort(5432);
  const db = c.getDatabase();
  return `postgresql://app_user:${encodeURIComponent(password)}@${host}:${port}/${db}?schema=public`;
}

export async function setup(): Promise<void> {
  // 1. Subir container.
  // Importante: username='postgres' explicito. Default do testcontainers e
  // 'test', e nosso init SQL faz `ALTER DEFAULT PRIVILEGES FOR ROLE postgres`,
  // que exige que o role postgres seja o owner das migrations.
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withUsername("postgres")
    .withPassword("test_password")
    .withDatabase("portal_test")
    .start();

  const migrateUrl = container.getConnectionUri();

  // 2. Rodar init script (cria app_user + GRANTs).
  // Substitui 'portal_dev' por 'portal_test' no GRANT CONNECT (init script
  // foi escrito pro DB do dev). Resto do SQL eh DB-agnostico.
  const initSqlRaw = readFileSync(INIT_SQL_PATH, "utf-8");
  const appUserPassword = `tpwd_${crypto.randomUUID()}`;
  const initSql = initSqlRaw
    .replace(/'dev_password'/g, `'${appUserPassword}'`)
    .replace(/portal_dev/g, "portal_test");

  const adminClient = new Client({ connectionString: migrateUrl });
  await adminClient.connect();
  try {
    await adminClient.query(initSql);
  } finally {
    await adminClient.end();
  }

  const appUrl = buildAppUserUrl(container, appUserPassword);

  // 3. Expor envs antes do migrate (prisma.config.ts le DATABASE_URL_MIGRATE).
  process.env["DATABASE_URL_MIGRATE"] = migrateUrl;
  process.env["DATABASE_URL"] = appUrl;

  // 4. Aplicar migrations.
  // `prisma migrate deploy` aplica TODAS as migrations pendentes sem prompts.
  execSync("pnpm exec prisma migrate deploy", {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: process.env,
  });
}

export async function teardown(): Promise<void> {
  if (container) {
    await container.stop();
    container = undefined;
  }
}
