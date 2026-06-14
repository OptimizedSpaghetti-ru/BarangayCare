-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add Performance Indexes
-- Adds indexes to speed up the fetching and sorting of complaints, especially
-- for the Admin Dashboard.
-- Run this in your Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- Speed up sorting complaints by date (used in Admin Dashboard default view)
CREATE INDEX IF NOT EXISTS idx_complaints_date_submitted 
  ON complaints(date_submitted DESC);

-- Speed up filtering complaints by user (used in user's own dashboard)
CREATE INDEX IF NOT EXISTS idx_complaints_user_id 
  ON complaints(user_id);

-- Speed up filtering complaints by status (used in admin filters)
CREATE INDEX IF NOT EXISTS idx_complaints_status 
  ON complaints(status);

-- Speed up admin user checks
CREATE INDEX IF NOT EXISTS idx_users_id_status 
  ON users(id, account_status) WHERE account_status = 'approved';
