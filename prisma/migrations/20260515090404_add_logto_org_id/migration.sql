-- Fase 3 SSO Pekiart: bridge entre Tenant.id (UUID) e Logto Organization.id
-- (string curta). Ver docs/migration-logto-org-ids.md.
ALTER TABLE "tenants" ADD COLUMN "logto_org_id" TEXT;
CREATE UNIQUE INDEX "tenants_logto_org_id_key" ON "tenants"("logto_org_id");
