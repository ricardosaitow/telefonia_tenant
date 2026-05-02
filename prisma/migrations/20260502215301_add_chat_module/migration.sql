-- CreateEnum
CREATE TYPE "chat_type" AS ENUM ('internal', 'whatsapp');

-- CreateEnum
CREATE TYPE "chat_status" AS ENUM ('triage', 'waiting', 'in_service', 'finished');

-- CreateEnum
CREATE TYPE "chat_priority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "chat_message_type" AS ENUM ('text', 'image', 'audio', 'video', 'document', 'location', 'contact', 'voice_note', 'system');

-- CreateTable
CREATE TABLE "chats" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" "chat_type" NOT NULL,
    "titulo" TEXT,
    "protocol" TEXT,
    "channel_id" UUID,
    "customer_phone" TEXT,
    "customer_name" TEXT,
    "customer_avatar_url" TEXT,
    "status" "chat_status" NOT NULL DEFAULT 'triage',
    "assigned_to_id" UUID,
    "department_id" UUID,
    "priority" "chat_priority" NOT NULL DEFAULT 'normal',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "last_message_id" UUID,
    "last_activity_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "finished_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "chat_id" UUID NOT NULL,
    "sender_membership_id" UUID,
    "content" TEXT NOT NULL,
    "tipo" "chat_message_type" NOT NULL DEFAULT 'text',
    "wa_message_id" TEXT,
    "ack_level" INTEGER,
    "from_customer" BOOLEAN NOT NULL DEFAULT false,
    "media_url" TEXT,
    "media_name" TEXT,
    "media_mime_type" TEXT,
    "media_size" INTEGER,
    "location_lat" DOUBLE PRECISION,
    "location_lng" DOUBLE PRECISION,
    "location_name" TEXT,
    "quoted_message_id" UUID,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_participants" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "chat_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "last_read_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_notes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "chat_id" UUID NOT NULL,
    "author_membership_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chat_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_replies" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "shortcut" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "media_url" TEXT,
    "media_mime_type" TEXT,
    "department_id" UUID,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "quick_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chats_last_message_id_key" ON "chats"("last_message_id");

-- CreateIndex
CREATE INDEX "chats_tenant_id_last_activity_at_idx" ON "chats"("tenant_id", "last_activity_at" DESC);

-- CreateIndex
CREATE INDEX "chats_tenant_id_tipo_status_idx" ON "chats"("tenant_id", "tipo", "status");

-- CreateIndex
CREATE INDEX "chats_tenant_id_assigned_to_id_idx" ON "chats"("tenant_id", "assigned_to_id");

-- CreateIndex
CREATE INDEX "chats_customer_phone_idx" ON "chats"("customer_phone");

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_wa_message_id_key" ON "chat_messages"("wa_message_id");

-- CreateIndex
CREATE INDEX "chat_messages_tenant_id_idx" ON "chat_messages"("tenant_id");

-- CreateIndex
CREATE INDEX "chat_messages_chat_id_created_at_idx" ON "chat_messages"("chat_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_wa_message_id_idx" ON "chat_messages"("wa_message_id");

-- CreateIndex
CREATE INDEX "chat_participants_tenant_id_idx" ON "chat_participants"("tenant_id");

-- CreateIndex
CREATE INDEX "chat_participants_membership_id_idx" ON "chat_participants"("membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_participants_chat_id_membership_id_key" ON "chat_participants"("chat_id", "membership_id");

-- CreateIndex
CREATE INDEX "chat_notes_tenant_id_idx" ON "chat_notes"("tenant_id");

-- CreateIndex
CREATE INDEX "chat_notes_chat_id_created_at_idx" ON "chat_notes"("chat_id", "created_at");

-- CreateIndex
CREATE INDEX "quick_replies_tenant_id_idx" ON "quick_replies"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "quick_replies_tenant_id_shortcut_department_id_key" ON "quick_replies"("tenant_id", "shortcut", "department_id");

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "tenant_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_finished_by_id_fkey" FOREIGN KEY ("finished_by_id") REFERENCES "tenant_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_last_message_id_fkey" FOREIGN KEY ("last_message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_membership_id_fkey" FOREIGN KEY ("sender_membership_id") REFERENCES "tenant_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_quoted_message_id_fkey" FOREIGN KEY ("quoted_message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "tenant_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_notes" ADD CONSTRAINT "chat_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_notes" ADD CONSTRAINT "chat_notes_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_notes" ADD CONSTRAINT "chat_notes_author_membership_id_fkey" FOREIGN KEY ("author_membership_id") REFERENCES "tenant_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- MANUAL EDIT: Row Level Security (D002) for 5 new tenant-scoped tables.
-- Same pattern as all other tenant_id tables: ENABLE + FORCE RLS, policy uses
-- nullif(current_setting('app.current_tenant', true), '')::uuid.
--
-- GRANTs for app_user — Prisma migrations run as postgres superuser, so we
-- need explicit GRANTs for tables the app_user role must access.
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON "chats" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "chat_messages" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "chat_participants" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "chat_notes" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "quick_replies" TO app_user;

-- chats
ALTER TABLE "chats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chats" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_chats ON "chats"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

-- chat_messages
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_messages" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_chat_messages ON "chat_messages"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

-- chat_participants
ALTER TABLE "chat_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_participants" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_chat_participants ON "chat_participants"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

-- chat_notes
ALTER TABLE "chat_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_notes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_chat_notes ON "chat_notes"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

-- quick_replies
ALTER TABLE "quick_replies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quick_replies" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_quick_replies ON "quick_replies"
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
