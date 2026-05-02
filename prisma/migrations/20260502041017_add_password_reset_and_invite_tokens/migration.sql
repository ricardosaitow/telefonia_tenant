-- ---------------------------------------------------------------------------
-- MANUAL EDIT (2026-05-02): Intentional NO RLS on both tables.
--
-- password_reset_tokens:
--   Global table, no tenant_id. Same pattern as accounts/sessions.
--   Used pre-auth in "forgot password" flow. No tenant context exists.
--
-- invite_tokens:
--   Has tenant_id as FK reference (metadata: which tenant the invite is for),
--   but is intentionally NOT RLS-protected. Rationale:
--     1. Consumed pre-auth: the invitee may not have an account yet, so there
--        is no session and no app.current_tenant to set.
--     2. Lookups are by token_hash (opaque, unguessable), not by tenant_id.
--     3. RLS would make the accept-invite flow impossible without prismaAdmin,
--        adding complexity for zero security gain (token is the auth factor).
--   This matches the architecture-portal.md rule: prismaAdmin is allowed in
--   src/features/auth/** for pre-auth flows.
-- ---------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_tokens" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "membership_role" NOT NULL,
    "invited_by_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_hash_idx" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_account_id_idx" ON "password_reset_tokens"("account_id");

-- CreateIndex
CREATE INDEX "invite_tokens_token_hash_idx" ON "invite_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "invite_tokens_email_idx" ON "invite_tokens"("email");

-- CreateIndex
CREATE INDEX "invite_tokens_tenant_id_idx" ON "invite_tokens"("tenant_id");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
