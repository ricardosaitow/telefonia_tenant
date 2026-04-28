-- CreateTable
CREATE TABLE "usage_records" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "conversation_id" UUID,
    "agent_id" UUID,
    "tipo" TEXT NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "unit_cost_usd" DECIMAL(12,8) NOT NULL,
    "total_cost_usd" DECIMAL(14,6) NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usage_records_tenant_id_recorded_at_idx" ON "usage_records"("tenant_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "usage_records_tenant_id_tipo_recorded_at_idx" ON "usage_records"("tenant_id", "tipo", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "usage_records_conversation_id_idx" ON "usage_records"("conversation_id");

-- CreateIndex
CREATE INDEX "usage_records_agent_id_idx" ON "usage_records"("agent_id");

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row Level Security (D002)
--
-- usage_records tem tenant_id NOT NULL — policy padrão (igual audit_logs).
-- Runtime escreve via prismaAdmin (BYPASSRLS) ou setando contexto.
-- Portal só lê — RLS garante isolamento.
-- ---------------------------------------------------------------------------
ALTER TABLE "usage_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_usage_records ON "usage_records"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
