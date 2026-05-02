/**
 * PrismaClient singleton para runtime.
 *
 * Prisma 7 nao aceita mais `url` no datasource. URL vem do env via adapter
 * @prisma/adapter-pg, que envolve um pool pg. Em runtime, DATABASE_URL aponta
 * pra `app_user` (NOSUPERUSER, NOBYPASSRLS) -- as policies de RLS
 * (tenant_isolation_*) so funcionam porque o usuario NAO bypassa RLS.
 *
 * Migrations rodam fora desse client (DATABASE_URL_MIGRATE em prisma.config.ts).
 *
 * Singleton via globalThis pra sobreviver hot-reload do Next em dev (cada
 * request criando um PrismaClient novo esgota pool e quebra ECONNREFUSED).
 *
 * Pool pg explícito (não string) evita warning de pg@8 "Calling client.query()
 * when already executing" — PrismaPg com string cria Pool interno a cada
 * connect() sem reutilizar, causando race em Next.js layout+page paralelos.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var __portalPrisma: PrismaClient | undefined;
  var __portalPgPool: pg.Pool | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL nao definida. Em runtime, deve apontar pro app_user " +
        "(NOSUPERUSER, NOBYPASSRLS); migrations usam DATABASE_URL_MIGRATE.",
    );
  }

  const pool = new pg.Pool({ connectionString, max: 10 });
  globalThis.__portalPgPool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalThis.__portalPrisma ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__portalPrisma = prisma;
}
