-- Production Migration Script
-- Run this in the Supabase Dashboard SQL Editor
-- This creates the Prisma migrations table, baselines existing migrations,
-- and applies the latest migration.

-- 1. Create the _prisma_migrations table (Prisma's migration tracker)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    VARCHAR(36)  NOT NULL PRIMARY KEY,
    "checksum"              VARCHAR(64)  NOT NULL,
    "finished_at"           TIMESTAMPTZ,
    "migration_name"        VARCHAR(255) NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        TIMESTAMPTZ,
    "started_at"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "applied_steps_count"   INTEGER      NOT NULL DEFAULT 0
);

-- 2. Baseline existing migrations (already applied via supabase-init.sql)
INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count)
VALUES
  (gen_random_uuid()::text, '', '20260201224653_init', NOW(), 1),
  (gen_random_uuid()::text, '', '20260202000000_multi_dealer_session', NOW(), 1);

-- 3. Apply the new migration: add userId to UploadSession
ALTER TABLE "UploadSession" ADD COLUMN IF NOT EXISTS "userId" TEXT;
CREATE INDEX IF NOT EXISTS "UploadSession_userId_idx" ON "UploadSession"("userId");

-- 4. Record the new migration as applied
INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count)
VALUES
  (gen_random_uuid()::text, '', '20260226000000_add_user_id_to_upload_session', NOW(), 1);
