/**
 * Clientes Prisma dedicados aos testes.
 *
 * - `appPrisma`: conecta como `app_user` (NOSUPERUSER, NOBYPASSRLS). Usado
 *   pra validar comportamento de RLS na otica do runtime real.
 * - `migratorPrisma`: conecta como `postgres` (superuser, BYPASSRLS implicito).
 *   Usado em factories pra criar dados sem precisar setar tenant context --
 *   simula a posicao da migration / de um job admin de bootstrap.
 *
 * Ambos lazy: sao instanciados na primeira chamada e cacheados no
 * globalThis pra sobreviver re-imports entre test files.
 *
 * URLs vem do globalSetup (tests/helpers/db-setup.ts) via process.env.
 */

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var __testAppPrisma: PrismaClient | undefined;

  var __testMigratorPrisma: PrismaClient | undefined;
}

function build(connectionString: string | undefined, role: string): PrismaClient {
  if (!connectionString) {
    throw new Error(
      `Variavel de ambiente da ${role} nao definida. ` +
        "Os helpers exigem que tests/helpers/db-setup.ts tenha rodado " +
        "(globalSetup do vitest project integration/rls).",
    );
  }
  const adapter = new PrismaPg(connectionString);
  return new PrismaClient({ adapter });
}

export function appPrisma(): PrismaClient {
  if (!globalThis.__testAppPrisma) {
    globalThis.__testAppPrisma = build(process.env["DATABASE_URL"], "app_user (DATABASE_URL)");
  }
  return globalThis.__testAppPrisma;
}

export function migratorPrisma(): PrismaClient {
  if (!globalThis.__testMigratorPrisma) {
    globalThis.__testMigratorPrisma = build(
      process.env["DATABASE_URL_MIGRATE"],
      "postgres (DATABASE_URL_MIGRATE)",
    );
  }
  return globalThis.__testMigratorPrisma;
}
