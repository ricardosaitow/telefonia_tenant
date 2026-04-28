-- CreateEnum
CREATE TYPE "knowledge_scope" AS ENUM ('tenant', 'department', 'agent');

-- CreateEnum
CREATE TYPE "knowledge_source_type" AS ENUM ('upload_pdf', 'upload_docx', 'upload_xlsx', 'upload_txt', 'url_crawl', 'gdrive_folder', 'notion', 'manual_text');

-- CreateEnum
CREATE TYPE "knowledge_source_status" AS ENUM ('uploading', 'indexing', 'ready', 'error');

-- CreateTable
CREATE TABLE "knowledge_sources" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "scope" "knowledge_scope" NOT NULL,
    "scope_ref_id" UUID,
    "tipo" "knowledge_source_type" NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "language" TEXT,
    "status" "knowledge_source_status" NOT NULL DEFAULT 'uploading',
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "last_indexed_at" TIMESTAMPTZ(6),
    "source_metadata" JSONB,
    "storage_ref" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_knowledge" (
    "agent_id" UUID NOT NULL,
    "knowledge_source_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_knowledge_pkey" PRIMARY KEY ("agent_id","knowledge_source_id")
);

-- CreateTable
CREATE TABLE "agent_tools" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "tool_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "requires_integration_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "agent_tools_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_sources_tenant_id_idx" ON "knowledge_sources"("tenant_id");

-- CreateIndex
CREATE INDEX "knowledge_sources_scope_scope_ref_id_idx" ON "knowledge_sources"("scope", "scope_ref_id");

-- CreateIndex
CREATE INDEX "agent_knowledge_tenant_id_idx" ON "agent_knowledge"("tenant_id");

-- CreateIndex
CREATE INDEX "agent_knowledge_knowledge_source_id_idx" ON "agent_knowledge"("knowledge_source_id");

-- CreateIndex
CREATE INDEX "agent_tools_tenant_id_idx" ON "agent_tools"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_tools_agent_id_tool_key_key" ON "agent_tools"("agent_id", "tool_key");

-- AddForeignKey
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_knowledge" ADD CONSTRAINT "agent_knowledge_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_knowledge" ADD CONSTRAINT "agent_knowledge_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_knowledge" ADD CONSTRAINT "agent_knowledge_knowledge_source_id_fkey" FOREIGN KEY ("knowledge_source_id") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tools" ADD CONSTRAINT "agent_tools_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tools" ADD CONSTRAINT "agent_tools_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row Level Security (D002) — todas as 3 novas têm tenant_id (denormalizado
-- em agent_knowledge pra evitar JOIN na policy).
-- ---------------------------------------------------------------------------

ALTER TABLE "knowledge_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "knowledge_sources" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_knowledge_sources ON "knowledge_sources"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "agent_knowledge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_knowledge" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_agent_knowledge ON "agent_knowledge"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "agent_tools" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_tools" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_agent_tools ON "agent_tools"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
