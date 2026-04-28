-- CreateEnum
CREATE TYPE "conversation_status" AS ENUM ('active', 'ended', 'abandoned', 'escalated');

-- CreateEnum
CREATE TYPE "assistance_mode" AS ENUM ('ai_only', 'human_observing', 'human_assisted', 'human_takeover');

-- CreateEnum
CREATE TYPE "intervention_mode" AS ENUM ('observing', 'assisted', 'takeover');

-- CreateEnum
CREATE TYPE "turn_speaker" AS ENUM ('customer', 'agent', 'system', 'tool', 'human_operator');

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "status" "conversation_status" NOT NULL DEFAULT 'active',
    "current_agent_id" UUID,
    "current_department_id" UUID,
    "customer_identifier" TEXT,
    "customer_metadata" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summary" TEXT,
    "language_detected" TEXT,
    "duration_seconds" INTEGER,
    "cost_usd_total" DECIMAL(12,6),
    "assistance_mode" "assistance_mode" NOT NULL DEFAULT 'ai_only',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_voice_data" (
    "conversation_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "recording_ref" TEXT,
    "sip_call_id" TEXT,
    "caller_id_name" TEXT,
    "hangup_cause" TEXT,

    CONSTRAINT "conversation_voice_data_pkey" PRIMARY KEY ("conversation_id")
);

-- CreateTable
CREATE TABLE "conversation_email_data" (
    "conversation_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "subject" TEXT,
    "root_message_id" TEXT,
    "references" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "from_address" TEXT,

    CONSTRAINT "conversation_email_data_pkey" PRIMARY KEY ("conversation_id")
);

-- CreateTable
CREATE TABLE "conversation_whatsapp_data" (
    "conversation_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "wa_chat_id" TEXT,
    "business_initiated_window_until" TIMESTAMPTZ(6),
    "last_template_used_id" UUID,

    CONSTRAINT "conversation_whatsapp_data_pkey" PRIMARY KEY ("conversation_id")
);

-- CreateTable
CREATE TABLE "conversation_agent_history" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "from_agent_id" UUID,
    "to_agent_id" UUID NOT NULL,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "conversation_agent_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_intervention" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "operator_account_id" UUID NOT NULL,
    "mode_entered" "intervention_mode" NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "reason" TEXT,

    CONSTRAINT "conversation_intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turns" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "speaker" "turn_speaker" NOT NULL,
    "content_text" TEXT,
    "content_audio_ref" TEXT,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latency_ms" INTEGER,
    "tool_call" JSONB,
    "tool_result" JSONB,
    "tokens_in" INTEGER,
    "tokens_out" INTEGER,
    "actor_account_id" UUID,

    CONSTRAINT "turns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_tenant_id_started_at_idx" ON "conversations"("tenant_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "conversations_channel_id_idx" ON "conversations"("channel_id");

-- CreateIndex
CREATE INDEX "conversations_current_agent_id_idx" ON "conversations"("current_agent_id");

-- CreateIndex
CREATE INDEX "conversations_current_department_id_idx" ON "conversations"("current_department_id");

-- CreateIndex
CREATE INDEX "conversation_voice_data_tenant_id_idx" ON "conversation_voice_data"("tenant_id");

-- CreateIndex
CREATE INDEX "conversation_email_data_tenant_id_idx" ON "conversation_email_data"("tenant_id");

-- CreateIndex
CREATE INDEX "conversation_whatsapp_data_tenant_id_idx" ON "conversation_whatsapp_data"("tenant_id");

-- CreateIndex
CREATE INDEX "conversation_agent_history_tenant_id_idx" ON "conversation_agent_history"("tenant_id");

-- CreateIndex
CREATE INDEX "conversation_agent_history_conversation_id_idx" ON "conversation_agent_history"("conversation_id");

-- CreateIndex
CREATE INDEX "conversation_intervention_tenant_id_idx" ON "conversation_intervention"("tenant_id");

-- CreateIndex
CREATE INDEX "conversation_intervention_conversation_id_idx" ON "conversation_intervention"("conversation_id");

-- CreateIndex
CREATE INDEX "turns_tenant_id_idx" ON "turns"("tenant_id");

-- CreateIndex
CREATE INDEX "turns_conversation_id_timestamp_idx" ON "turns"("conversation_id", "timestamp");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_current_agent_id_fkey" FOREIGN KEY ("current_agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_current_department_id_fkey" FOREIGN KEY ("current_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_voice_data" ADD CONSTRAINT "conversation_voice_data_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_email_data" ADD CONSTRAINT "conversation_email_data_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_whatsapp_data" ADD CONSTRAINT "conversation_whatsapp_data_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_agent_history" ADD CONSTRAINT "conversation_agent_history_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_agent_history" ADD CONSTRAINT "conversation_agent_history_from_agent_id_fkey" FOREIGN KEY ("from_agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_agent_history" ADD CONSTRAINT "conversation_agent_history_to_agent_id_fkey" FOREIGN KEY ("to_agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_intervention" ADD CONSTRAINT "conversation_intervention_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_intervention" ADD CONSTRAINT "conversation_intervention_operator_account_id_fkey" FOREIGN KEY ("operator_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turns" ADD CONSTRAINT "turns_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turns" ADD CONSTRAINT "turns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turns" ADD CONSTRAINT "turns_actor_account_id_fkey" FOREIGN KEY ("actor_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row Level Security (D002) — 7 novas tabelas, todas com tenant_id
-- (denormalizado nas filhas pra evitar JOIN na policy).
-- ---------------------------------------------------------------------------

ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_conversations ON "conversations"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "conversation_voice_data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversation_voice_data" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_conversation_voice_data ON "conversation_voice_data"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "conversation_email_data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversation_email_data" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_conversation_email_data ON "conversation_email_data"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "conversation_whatsapp_data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversation_whatsapp_data" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_conversation_whatsapp_data ON "conversation_whatsapp_data"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "conversation_agent_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversation_agent_history" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_conversation_agent_history ON "conversation_agent_history"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "conversation_intervention" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversation_intervention" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_conversation_intervention ON "conversation_intervention"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "turns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "turns" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_turns ON "turns"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
