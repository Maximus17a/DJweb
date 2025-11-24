-- Migration: Add auth_uid and token columns to users
-- Run this in Supabase SQL Editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_uid UUID NULL,
  ADD COLUMN IF NOT EXISTS access_token TEXT NULL,
  ADD COLUMN IF NOT EXISTS refresh_token TEXT NULL,
  ADD COLUMN IF NOT EXISTS token_expiry BIGINT NULL;

-- Create indexes for lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_uid ON users(auth_uid);

-- Recommended RLS policy adjustments: allow users to select/insert/update their own row by auth_uid
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if present then create them (Postgres doesn't support CREATE POLICY IF NOT EXISTS)
DROP POLICY IF EXISTS "Users: select own by auth_uid" ON users;
CREATE POLICY "Users: select own by auth_uid" ON users
  FOR SELECT USING (auth.uid()::uuid = auth_uid);

DROP POLICY IF EXISTS "Users: insert own by auth_uid" ON users;
CREATE POLICY "Users: insert own by auth_uid" ON users
  FOR INSERT WITH CHECK (auth.uid()::uuid = auth_uid);

DROP POLICY IF EXISTS "Users: update own by auth_uid" ON users;
CREATE POLICY "Users: update own by auth_uid" ON users
  FOR UPDATE USING (auth.uid()::uuid = auth_uid);

-- Note: If you use spotify_id mapping instead of auth_uid, adjust policies accordingly.
