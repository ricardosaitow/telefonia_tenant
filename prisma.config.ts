import "dotenv/config";

import { defineConfig } from "prisma/config";

/**
 * Migrate roda como superuser (DATABASE_URL_MIGRATE) — precisa criar shadow DB,
 * extensões, GRANTs.
 *
 * Runtime usa DATABASE_URL (app_user, NOSUPERUSER, NOBYPASSRLS) via adapter-pg
 * passado ao PrismaClient em src/lib/db/client.ts. Nunca misturar.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL_MIGRATE"],
  },
});
