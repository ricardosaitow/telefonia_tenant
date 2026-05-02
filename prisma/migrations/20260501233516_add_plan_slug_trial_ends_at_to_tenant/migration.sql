-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "plan_slug" TEXT NOT NULL DEFAULT 'demo',
ADD COLUMN     "trial_ends_at" TIMESTAMPTZ(6);
