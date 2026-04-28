-- CreateEnum
CREATE TYPE "routing_rule_type" AS ENUM ('direct', 'business_hours', 'ivr_menu', 'ai_router');

-- CreateTable
CREATE TABLE "routing_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "tipo" "routing_rule_type" NOT NULL DEFAULT 'direct',
    "config" JSONB NOT NULL DEFAULT '{}',
    "prioridade" INTEGER NOT NULL DEFAULT 0,
    "prompt_template_key" TEXT,
    "target_department_id" UUID,
    "target_agent_id" UUID,
    "target_routing_rule_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "routing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routing_rules_tenant_id_idx" ON "routing_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "routing_rules_channel_id_idx" ON "routing_rules"("channel_id");

-- CreateIndex
CREATE INDEX "routing_rules_target_department_id_idx" ON "routing_rules"("target_department_id");

-- CreateIndex
CREATE INDEX "routing_rules_target_agent_id_idx" ON "routing_rules"("target_agent_id");

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_default_routing_rule_id_fkey" FOREIGN KEY ("default_routing_rule_id") REFERENCES "routing_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_target_department_id_fkey" FOREIGN KEY ("target_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_target_agent_id_fkey" FOREIGN KEY ("target_agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_target_routing_rule_id_fkey" FOREIGN KEY ("target_routing_rule_id") REFERENCES "routing_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Target XOR — exatamente UM dos 3 targets (department/agent/routing_rule)
-- precisa estar não-nulo. Garante a regra do schema na ontologia §12.
-- ---------------------------------------------------------------------------
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_target_xor"
  CHECK (
    (CASE WHEN target_department_id IS NULL THEN 0 ELSE 1 END +
     CASE WHEN target_agent_id IS NULL THEN 0 ELSE 1 END +
     CASE WHEN target_routing_rule_id IS NULL THEN 0 ELSE 1 END) = 1
  );

-- ---------------------------------------------------------------------------
-- Row Level Security (D002)
-- ---------------------------------------------------------------------------
ALTER TABLE "routing_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "routing_rules" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_routing_rules ON "routing_rules"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
