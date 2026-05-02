import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * !!! USO RESTRITO !!!
 *
 * Cliente Prisma "admin" — conecta com DATABASE_URL_MIGRATE (postgres
 * superuser → BYPASSRLS implícito). Usado APENAS em fluxos administrativos
 * que precisam INSERT em tabelas com RLS sem contexto de tenant prévio:
 *
 *   - Signup (cria Account + Tenant + Membership atomicamente).
 *   - Onboarding programático (jobs de bootstrap).
 *   - Migrations rodando dentro da app (não devem; CI cuida).
 *
 * **Não usar pra leitura/escrita normal.** O runtime padrão usa `prisma`
 * de `client.ts` (app_user, RLS ativa).
 *
 * Ancora: D002 (RLS) + D009 (segredos só refs). Vazar uso deste client em
 * Server Actions normais REVERTE TODO o invariante de tenant isolation —
 * code review obrigatório em qualquer import deste módulo fora de
 * src/features/auth/signup* e src/features/onboarding/**.
 *
 * Singleton via globalThis (mesma razão do prisma normal — hot reload).
 * Pool pg explícito — mesma razão do client.ts.
 */

declare global {
  var __portalPrismaAdmin: PrismaClient | undefined;
  var __portalPgPoolAdmin: pg.Pool | undefined;
}

function createAdminClient(): PrismaClient {
  const connectionString = process.env["DATABASE_URL_MIGRATE"];
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL_MIGRATE não definida. prismaAdmin precisa de credenciais " +
        "superuser (postgres) — separado do app_user usado pelo runtime.",
    );
  }

  const pool = new pg.Pool({ connectionString, max: 5 });
  globalThis.__portalPgPoolAdmin = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prismaAdmin: PrismaClient = globalThis.__portalPrismaAdmin ?? createAdminClient();

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__portalPrismaAdmin = prismaAdmin;
}
