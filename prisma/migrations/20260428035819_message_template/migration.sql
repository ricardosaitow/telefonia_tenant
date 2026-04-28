-- CreateEnum
CREATE TYPE "message_template_scope" AS ENUM ('tenant', 'department', 'channel', 'routing_rule', 'agent');

-- CreateTable
CREATE TABLE "message_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "scope" "message_template_scope" NOT NULL,
    "scope_ref_id" UUID,
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_templates_tenant_id_idx" ON "message_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "message_templates_scope_scope_ref_id_idx" ON "message_templates"("scope", "scope_ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_tenant_id_scope_scope_ref_id_key_locale_key" ON "message_templates"("tenant_id", "scope", "scope_ref_id", "key", "locale");

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row Level Security (D002)
-- ---------------------------------------------------------------------------
ALTER TABLE "message_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "message_templates" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_message_templates ON "message_templates"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
