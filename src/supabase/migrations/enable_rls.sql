-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Enable Row Level Security (RLS) on users and complaints tables.
-- This is CRITICAL for security — without RLS, the anon key gives full access.
-- Run this in your Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════
-- 1. USERS TABLE RLS
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "users_select_own" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Allow users to update their own profile (name, phone only)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow service role (Edge Functions) full access — already implicit,
-- but explicit for clarity
CREATE POLICY "users_service_role" ON users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. COMPLAINTS TABLE RLS
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own complaints
CREATE POLICY "complaints_select_own" ON complaints
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin users can read ALL complaints
-- Uses jwt() to read role directly from the user's access token (faster, no table join)
CREATE POLICY "complaints_select_admin" ON complaints
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Authenticated users can insert complaints (their own)
CREATE POLICY "complaints_insert_own" ON complaints
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow anonymous/guest inserts (user_id is null)
CREATE POLICY "complaints_insert_guest" ON complaints
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Also allow authenticated users to insert guest complaints (user_id IS NULL)
CREATE POLICY "complaints_insert_guest_auth" ON complaints
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL);

-- Admin users can update any complaint (status, notes, etc.)
CREATE POLICY "complaints_update_admin" ON complaints
  FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Service role full access
CREATE POLICY "complaints_service_role" ON complaints
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Guest/anonymous users can SELECT complaints with NULL user_id (for realtime subscription)
CREATE POLICY "complaints_select_guest" ON complaints
  FOR SELECT TO anon
  USING (user_id IS NULL);
