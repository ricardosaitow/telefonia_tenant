-- CreateEnum
CREATE TYPE "security_severity" AS ENUM ('info', 'low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "security_category" AS ENUM ('authn', 'authz', 'integration', 'upload', 'data_access', 'config_change', 'secret_access', 'rate_limit', 'anomaly');

-- CreateTable
CREATE TABLE "security_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "account_id" UUID,
    "severity" "security_severity" NOT NULL DEFAULT 'info',
    "category" "security_category" NOT NULL,
    "event_type" TEXT NOT NULL,
    "description" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "resolved_at" TIMESTAMPTZ(6),
    "resolution_note" TEXT,
    "linked_audit_log_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_events_tenant_id_created_at_idx" ON "security_events"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "security_events_account_id_idx" ON "security_events"("account_id");

-- CreateIndex
CREATE INDEX "security_events_severity_category_idx" ON "security_events"("severity", "category");

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row Level Security (D002)
--
-- tenant_id é nullable: eventos cross-tenant (login pré-tenant, signup
-- global) ficam com tenant_id=null. Policy filtra esses pra app_user
-- (tenant_id IS NOT NULL AND tenant_id = current_setting). Eventos null
-- só visíveis via prismaAdmin (admin Pekiart).
-- ---------------------------------------------------------------------------
ALTER TABLE "security_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "security_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_security_events ON "security_events"
  USING (
    tenant_id IS NOT NULL
    AND tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    tenant_id IS NULL
    OR tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid
  );
-- WITH CHECK aceita INSERT cross-tenant (null) também — permite app_user
-- gravar evento global se quiser (na prática, esses inserts vêm via prismaAdmin).
