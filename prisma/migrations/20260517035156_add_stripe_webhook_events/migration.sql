-- Dedup de webhooks Stripe. event_id é PK; webhook handler insere primeiro
-- (com ON CONFLICT DO NOTHING) e só processa se INSERT acertou.
CREATE TABLE "stripe_webhook_events" (
  "event_id"     TEXT PRIMARY KEY,
  "event_type"   TEXT NOT NULL,
  "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX "stripe_webhook_events_processed_at_idx"
  ON "stripe_webhook_events"("processed_at");
