ALTER TABLE user_social_destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_social_destinations_select_own" ON user_social_destinations;
DROP POLICY IF EXISTS "user_social_destinations_insert_own" ON user_social_destinations;
DROP POLICY IF EXISTS "user_social_destinations_update_own" ON user_social_destinations;
DROP POLICY IF EXISTS "user_social_destinations_delete_own" ON user_social_destinations;

REVOKE ALL ON TABLE user_social_destinations FROM anon;

CREATE POLICY "user_social_destinations_select_own"
ON user_social_destinations
FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "user_social_destinations_insert_own"
ON user_social_destinations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_social_destinations_update_own"
ON user_social_destinations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_social_destinations_delete_own"
ON user_social_destinations
FOR DELETE
TO authenticated
USING (user_id = auth.uid()::text);

ALTER TABLE poster_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "poster_posts_public_read" ON poster_posts;
DROP POLICY IF EXISTS "poster_posts_insert_any" ON poster_posts;

REVOKE ALL ON TABLE poster_posts FROM anon;

CREATE POLICY "poster_posts_select_own"
ON poster_posts
FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "poster_posts_insert_own"
ON poster_posts
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "poster_posts_update_own"
ON poster_posts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "poster_posts_delete_own"
ON poster_posts
FOR DELETE
TO authenticated
USING (user_id = auth.uid()::text);
