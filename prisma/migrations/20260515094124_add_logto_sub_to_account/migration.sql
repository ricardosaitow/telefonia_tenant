-- Fase 3 SSO Pekiart: bridge Logto user (claims.sub) → Account.id local.
-- Ver docs/migration-logto-org-ids.md (estende o padrão pra Account).

ALTER TABLE "accounts" ADD COLUMN "logto_sub" TEXT;
CREATE UNIQUE INDEX "accounts_logto_sub_key" ON "accounts"("logto_sub");

-- passwordHash vira nullable: users autenticados via Logto não têm hash local.
ALTER TABLE "accounts" ALTER COLUMN "password_hash" DROP NOT NULL;
