-- CreateEnum
CREATE TYPE "email_folder_type" AS ENUM ('inbox', 'sent', 'drafts', 'trash', 'spam', 'archived', 'custom');

-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "inbound_host" TEXT,
ADD COLUMN     "inbound_pass_enc" TEXT,
ADD COLUMN     "inbound_port" INTEGER,
ADD COLUMN     "inbound_proto" TEXT,
ADD COLUMN     "inbound_security" TEXT,
ADD COLUMN     "inbound_user" TEXT,
ADD COLUMN     "last_poll_at" TIMESTAMPTZ(6),
ADD COLUMN     "last_poll_error" TEXT,
ADD COLUMN     "smtp_host" TEXT,
ADD COLUMN     "smtp_pass_enc" TEXT,
ADD COLUMN     "smtp_port" INTEGER,
ADD COLUMN     "smtp_security" TEXT,
ADD COLUMN     "smtp_user" TEXT;

-- CreateTable
CREATE TABLE "email_folders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "tipo" "email_folder_type" NOT NULL,
    "nome" TEXT NOT NULL,
    "imap_path" TEXT,
    "total_emails" INTEGER NOT NULL DEFAULT 0,
    "unread_emails" INTEGER NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_messages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "folder_id" UUID NOT NULL,
    "message_id" TEXT,
    "uid" INTEGER,
    "thread_id" TEXT,
    "from_address" TEXT NOT NULL,
    "from_name" TEXT,
    "to_addresses" TEXT NOT NULL,
    "cc_addresses" TEXT,
    "bcc_addresses" TEXT,
    "reply_to" TEXT,
    "subject" TEXT,
    "body_text" TEXT,
    "body_html" TEXT,
    "preview" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "received_at" TIMESTAMPTZ(6),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_important" BOOLEAN NOT NULL DEFAULT false,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "in_reply_to" TEXT,
    "references" TEXT,
    "size_bytes" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_attachments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "content_id" TEXT,
    "is_inline" BOOLEAN NOT NULL DEFAULT false,
    "storage_path" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_folders_tenant_id_idx" ON "email_folders"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_folders_channel_id_tipo_key" ON "email_folders"("channel_id", "tipo");

-- CreateIndex
CREATE INDEX "email_messages_tenant_id_idx" ON "email_messages"("tenant_id");

-- CreateIndex
CREATE INDEX "email_messages_folder_id_idx" ON "email_messages"("folder_id");

-- CreateIndex
CREATE INDEX "email_messages_channel_id_uid_idx" ON "email_messages"("channel_id", "uid");

-- CreateIndex
CREATE INDEX "email_messages_thread_id_idx" ON "email_messages"("thread_id");

-- CreateIndex
CREATE INDEX "email_messages_sent_at_idx" ON "email_messages"("sent_at");

-- CreateIndex
CREATE INDEX "email_messages_is_read_idx" ON "email_messages"("is_read");

-- CreateIndex
CREATE UNIQUE INDEX "email_messages_channel_id_message_id_key" ON "email_messages"("channel_id", "message_id");

-- CreateIndex
CREATE INDEX "email_attachments_tenant_id_idx" ON "email_attachments"("tenant_id");

-- CreateIndex
CREATE INDEX "email_attachments_email_id_idx" ON "email_attachments"("email_id");

-- AddForeignKey
ALTER TABLE "email_folders" ADD CONSTRAINT "email_folders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_folders" ADD CONSTRAINT "email_folders_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "email_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "email_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- MANUAL EDIT (2026-05-02): Row Level Security (D002) for 3 new tenant-scoped
-- tables. Same pattern as all other tenant_id tables in this schema:
--   ENABLE + FORCE RLS, policy uses nullif(current_setting(...), '')::uuid
--   to handle absent/empty/set states (see fix migration 20260427232634).
--
-- GRANTs for app_user — ALTER DEFAULT PRIVILEGES only covers tables created
-- by the role that issued it. Prisma migrations run as postgres, so we need
-- explicit GRANTs for tables the app_user role must access.
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON "email_folders" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "email_messages" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "email_attachments" TO app_user;

ALTER TABLE "email_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_folders" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_email_folders ON "email_folders"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "email_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_messages" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_email_messages ON "email_messages"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "email_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_attachments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_email_attachments ON "email_attachments"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
