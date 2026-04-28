-- Tenants: nova coluna pbx_domain_uuid (FK lógica pra v_domains.domain_uuid no
-- FusionPBX, cross-DB; nullable até provisioning concluir; @unique pra impedir
-- 2 tenants apontarem pro mesmo Domain do PBX).
-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "pbx_domain_uuid" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "tenants_pbx_domain_uuid_key" ON "tenants"("pbx_domain_uuid");

-- ---------------------------------------------------------------------------
-- Extension — ramal SIP interno do tenant. Provisionado no FusionPBX (tabela
-- v_extensions). Portal é fonte de verdade lógica; FusionPBX é o data plane
-- que serve registers/calls.
--
-- Senha SIP NUNCA em claro (D009): password_ref aponta pra path Infisical.
-- pbx_extension_uuid é FK lógica pra v_extensions.extension_uuid (cross-DB).
-- extension é único PER tenant — 2 tenants podem ter "1001".
-- ---------------------------------------------------------------------------
-- CreateTable
CREATE TABLE "extensions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "extension" TEXT NOT NULL,
    "display_name" TEXT,
    "password_ref" TEXT NOT NULL,
    "pbx_extension_uuid" UUID,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "extensions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "extensions_pbx_extension_uuid_key" ON "extensions"("pbx_extension_uuid");

-- CreateIndex
CREATE INDEX "extensions_tenant_id_idx" ON "extensions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "extensions_tenant_id_extension_key" ON "extensions"("tenant_id", "extension");

-- AddForeignKey
ALTER TABLE "extensions" ADD CONSTRAINT "extensions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row Level Security (D002)
--
-- Mesma policy padrao das outras tabelas tenant-scoped. nullif(...) protege
-- contra app.current_tenant nao-setado (retorna 0 rows em vez de erro).
-- ---------------------------------------------------------------------------
ALTER TABLE "extensions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "extensions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_extensions ON "extensions"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
