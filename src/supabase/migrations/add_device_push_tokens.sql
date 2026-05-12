-- Store mobile device push tokens so backend jobs/functions can send FCM/APNS notifications.

CREATE TABLE IF NOT EXISTS device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  role TEXT NOT NULL CHECK (role IN ('admin', 'resident')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user_id
  ON device_push_tokens(user_id);

ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_push_tokens_select_own" ON device_push_tokens;
CREATE POLICY "device_push_tokens_select_own" ON device_push_tokens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "device_push_tokens_insert_own" ON device_push_tokens;
CREATE POLICY "device_push_tokens_insert_own" ON device_push_tokens
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "device_push_tokens_update_own" ON device_push_tokens;
CREATE POLICY "device_push_tokens_update_own" ON device_push_tokens
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "device_push_tokens_delete_own" ON device_push_tokens;
CREATE POLICY "device_push_tokens_delete_own" ON device_push_tokens
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "device_push_tokens_service_role" ON device_push_tokens;
CREATE POLICY "device_push_tokens_service_role" ON device_push_tokens
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_device_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_device_push_tokens_updated_at ON device_push_tokens;
CREATE TRIGGER trg_device_push_tokens_updated_at
BEFORE UPDATE ON device_push_tokens
FOR EACH ROW
EXECUTE FUNCTION set_device_push_tokens_updated_at();
