-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('active', 'disabled', 'locked');

-- CreateEnum
CREATE TYPE "tenant_status" AS ENUM ('trial', 'active', 'suspended', 'canceled');

-- CreateEnum
CREATE TYPE "membership_status" AS ENUM ('invited', 'active', 'disabled');

-- CreateEnum
CREATE TYPE "membership_role" AS ENUM ('tenant_owner', 'tenant_admin', 'department_supervisor', 'operator', 'auditor');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'pt-BR',
    "status" "account_status" NOT NULL DEFAULT 'active',
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret_ref" TEXT,
    "mfa_backup_codes_ref" TEXT,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "lockout_until" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "nome_fantasia" TEXT NOT NULL,
    "razao_social" TEXT,
    "cnpj" TEXT,
    "dominio_email_principal" TEXT,
    "default_locale" TEXT NOT NULL DEFAULT 'pt-BR',
    "status" "tenant_status" NOT NULL DEFAULT 'trial',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_memberships" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "status" "membership_status" NOT NULL DEFAULT 'invited',
    "global_role" "membership_role" NOT NULL,
    "joined_at" TIMESTAMPTZ(6),
    "last_active_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_cnpj_key" ON "tenants"("cnpj");

-- CreateIndex
CREATE INDEX "tenant_memberships_tenant_id_idx" ON "tenant_memberships"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_memberships_account_id_idx" ON "tenant_memberships"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_memberships_tenant_id_account_id_key" ON "tenant_memberships"("tenant_id", "account_id");

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- =============================================================================
-- PATCH PARA APLICAR EM:
--   prisma/migrations/20260427230525_init_account_tenant_membership/migration.sql
--
-- Por sandbox de Claude Code, nao pude editar arquivos em prisma/migrations/
-- diretamente. Anexar o trecho abaixo AO FINAL do arquivo migration.sql
-- (depois dos dois "AddForeignKey"), antes de aplicar com prisma migrate dev.
--
-- Comando exato:
--   cat prisma/RLS_PATCH_FOR_INIT_MIGRATION.sql >> \
--     prisma/migrations/20260427230525_init_account_tenant_membership/migration.sql
--   rm prisma/RLS_PATCH_FOR_INIT_MIGRATION.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Row Level Security (D002)
--
-- Pattern:
--   ENABLE + FORCE ROW LEVEL SECURITY em toda tabela com tenant_id.
--   FORCE garante que mesmo o owner da tabela (postgres) respeita a policy --
--   defesa contra acidentes futuros que mudem o ownership (ex.: ALTER OWNER).
--   O `true` em current_setting('app.current_tenant', true) faz a funcao
--   retornar NULL quando o setting nao existe (ao inves de erro 22023). Como
--   `NULL = uuid` resolve a NULL -> predicate falha -> 0 rows. Fail closed
--   sem ruido (tentar acessar fora de withTenantContext devolve "vazio",
--   nao stack trace).
--
-- Tabelas:
--   accounts            -> SEM RLS. Identidade global (D004), nao pertence a tenant.
--   tenants             -> policy USA `id` como discriminador (nao ha tenant_id).
--   tenant_memberships  -> policy padrao sobre tenant_id.
--
-- GRANTs pra app_user vem via ALTER DEFAULT PRIVILEGES no init script
-- (infra/postgres/init/01-app-role.sql). Nao precisa GRANT manual aqui.
-- ---------------------------------------------------------------------------

ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_tenants ON "tenants"
  USING (id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE "tenant_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_memberships" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_tenant_memberships ON "tenant_memberships"
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
