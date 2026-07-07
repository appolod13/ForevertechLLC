CREATE TABLE IF NOT EXISTS user_social_destinations (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_social_destinations_user_platform_unique UNIQUE (user_id, platform)
);

ALTER TABLE user_social_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_social_destinations_select_own"
ON user_social_destinations
FOR SELECT
USING (true);

CREATE POLICY "user_social_destinations_insert_own"
ON user_social_destinations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "user_social_destinations_update_own"
ON user_social_destinations
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "user_social_destinations_delete_own"
ON user_social_destinations
FOR DELETE
USING (true);

CREATE TABLE IF NOT EXISTS poster_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
  title TEXT,
  canonical_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE poster_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poster_posts_public_read"
ON poster_posts
FOR SELECT
USING (true);

CREATE POLICY "poster_posts_insert_any"
ON poster_posts
FOR INSERT
WITH CHECK (true);
