-- Horário comercial per-tenant. Default seg-sex 8h-18h BRT (alinhado com
-- o que estava hardcoded no bridge-ia pre-multi-tenant).
ALTER TABLE "tenants"
  ADD COLUMN "business_open_hour"  INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN "business_close_hour" INTEGER NOT NULL DEFAULT 18,
  ADD COLUMN "business_days"       INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  ADD COLUMN "timezone"            TEXT NOT NULL DEFAULT 'America/Sao_Paulo';
