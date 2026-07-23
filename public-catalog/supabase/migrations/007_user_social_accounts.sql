CREATE TABLE IF NOT EXISTS user_social_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_social_accounts_user_platform_unique UNIQUE (user_id, platform)
);

ALTER TABLE user_social_accounts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE user_social_accounts FROM anon;

CREATE POLICY "user_social_accounts_select_own"
ON user_social_accounts
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "user_social_accounts_insert_own"
ON user_social_accounts
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "user_social_accounts_update_own"
ON user_social_accounts
FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "user_social_accounts_delete_own"
ON user_social_accounts
FOR DELETE
USING (auth.uid()::text = user_id);
