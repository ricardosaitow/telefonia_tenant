-- Cora billing tables. Cora não tem subscription engine — cada ciclo gera
-- uma invoice via API. Quando paga (webhook), atualiza row + tenant.status.

CREATE TABLE "cora_invoices" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"           UUID NOT NULL,
  "cora_invoice_id"     TEXT NOT NULL UNIQUE,
  "status"              TEXT NOT NULL DEFAULT 'DRAFT',
  "amount_cents"        INTEGER NOT NULL,
  "paid_amount_cents"   INTEGER NOT NULL DEFAULT 0,
  "pix_emv"             TEXT,
  "paid_at"             TIMESTAMPTZ(6),
  "due_date"            TIMESTAMPTZ(6) NOT NULL,
  "period_start"        TIMESTAMPTZ(6),
  "period_end"          TIMESTAMPTZ(6),
  "raw_payload"         JSONB NOT NULL DEFAULT '{}',
  "created_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "cora_invoices_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX "cora_invoices_tenant_id_idx" ON "cora_invoices"("tenant_id");
CREATE INDEX "cora_invoices_status_idx"   ON "cora_invoices"("status");

-- Dedup webhooks Cora. event_id é PK; INSERT first com ON CONFLICT DO
-- NOTHING — se já processado, skipa.
CREATE TABLE "cora_webhook_events" (
  "event_id"     TEXT PRIMARY KEY,
  "trigger"      TEXT NOT NULL,
  "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX "cora_webhook_events_processed_at_idx"
  ON "cora_webhook_events"("processed_at");
