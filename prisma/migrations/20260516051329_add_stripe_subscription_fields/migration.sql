-- Stripe per-tenant billing columns. NULL antes de o user passar pelo
-- checkout. Gate `requireActiveSubscription` aceita NULL durante trial
-- (TenantStatus='trial' + trialEndsAt no futuro).
ALTER TABLE "tenants"
  ADD COLUMN "stripe_customer_id"     TEXT,
  ADD COLUMN "stripe_subscription_id" TEXT,
  ADD COLUMN "subscription_status"    TEXT,
  ADD COLUMN "current_period_end"     TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "tenants_stripe_customer_id_key"     ON "tenants"("stripe_customer_id");
CREATE UNIQUE INDEX "tenants_stripe_subscription_id_key" ON "tenants"("stripe_subscription_id");
