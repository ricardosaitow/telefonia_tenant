-- CreateTable
CREATE TABLE "email_signatures" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "cached_html" TEXT,
    "cached_text" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_signatures_membership_id_key" ON "email_signatures"("membership_id");

-- CreateIndex
CREATE INDEX "email_signatures_tenant_id_idx" ON "email_signatures"("tenant_id");

-- AddForeignKey
ALTER TABLE "email_signatures" ADD CONSTRAINT "email_signatures_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_signatures" ADD CONSTRAINT "email_signatures_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "tenant_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- MANUAL EDIT: Row Level Security (D002) for email_signatures.
-- Same pattern as all other tenant_id tables.
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON "email_signatures" TO app_user;

ALTER TABLE "email_signatures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_signatures" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_email_signatures ON "email_signatures"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
