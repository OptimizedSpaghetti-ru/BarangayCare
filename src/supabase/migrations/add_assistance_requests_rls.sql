-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Enable Row Level Security (RLS) on assistance_requests table.
-- Mirrors the complaint policies so guest assistance submissions can be stored
-- safely while keeping admin access available for the dashboard.
-- Run this in the Supabase SQL Editor or apply through your migration pipeline.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE assistance_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own assistance requests
DROP POLICY IF EXISTS "assistance_select_own" ON assistance_requests;
CREATE POLICY "assistance_select_own" ON assistance_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin users can read all assistance requests
DROP POLICY IF EXISTS "assistance_select_admin" ON assistance_requests;
CREATE POLICY "assistance_select_admin" ON assistance_requests
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Guests can read anonymous rows when needed for insert-return / realtime flows
DROP POLICY IF EXISTS "assistance_select_guest" ON assistance_requests;
CREATE POLICY "assistance_select_guest" ON assistance_requests
  FOR SELECT TO anon
  USING (user_id IS NULL);

-- Authenticated users can insert their own assistance requests
DROP POLICY IF EXISTS "assistance_insert_own" ON assistance_requests;
CREATE POLICY "assistance_insert_own" ON assistance_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Guests can insert anonymous assistance requests
DROP POLICY IF EXISTS "assistance_insert_guest" ON assistance_requests;
CREATE POLICY "assistance_insert_guest" ON assistance_requests
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Allow authenticated users to submit anonymous assistance requests too
DROP POLICY IF EXISTS "assistance_insert_guest_auth" ON assistance_requests;
CREATE POLICY "assistance_insert_guest_auth" ON assistance_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL);

-- Admin users can update any assistance request
DROP POLICY IF EXISTS "assistance_update_admin" ON assistance_requests;
CREATE POLICY "assistance_update_admin" ON assistance_requests
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Admin users can delete any assistance request
DROP POLICY IF EXISTS "assistance_delete_admin" ON assistance_requests;
CREATE POLICY "assistance_delete_admin" ON assistance_requests
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Service role full access for edge functions and backend jobs
DROP POLICY IF EXISTS "assistance_service_role" ON assistance_requests;
CREATE POLICY "assistance_service_role" ON assistance_requests
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);