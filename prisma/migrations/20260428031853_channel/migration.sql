-- CreateEnum
CREATE TYPE "channel_type" AS ENUM ('voice_did', 'whatsapp', 'email', 'webchat');

-- CreateEnum
CREATE TYPE "channel_status" AS ENUM ('provisioning', 'active', 'error', 'disabled');

-- CreateTable
CREATE TABLE "channels" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" "channel_type" NOT NULL,
    "identificador" TEXT NOT NULL,
    "nome_amigavel" TEXT NOT NULL,
    "status" "channel_status" NOT NULL DEFAULT 'active',
    "provisioning_metadata" JSONB,
    "default_routing_rule_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "channels_tenant_id_idx" ON "channels"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "channels_tenant_id_tipo_identificador_key" ON "channels"("tenant_id", "tipo", "identificador");

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row Level Security (D002)
-- ---------------------------------------------------------------------------

ALTER TABLE "channels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "channels" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_channels ON "channels"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
