-- Migration: Add address verification and account approval columns to users table
-- Run this in your Supabase SQL Editor

-- Add ID verification and account status columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS address_verification_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS id_document_url TEXT,
ADD COLUMN IF NOT EXISTS id_document_path TEXT,
ADD COLUMN IF NOT EXISTS required_barangay VARCHAR(255) DEFAULT 'Barangay Marulas, Valenzuela City',
ADD COLUMN IF NOT EXISTS address_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS address_rejection_reason TEXT;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(address_verification_status);

-- NOTE: Create the 'verification_ids' private storage bucket manually in the
-- Supabase dashboard (Storage → New Bucket → Name: verification_ids, Public: OFF)
-- or via the Supabase CLI before registering any new users.

-- Storage policies for verification_ids bucket (run in Supabase SQL Editor):
-- Allow any authenticated user to upload to the pending/ folder
-- CREATE POLICY "Allow upload to pending folder"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (bucket_id = 'verification_ids' AND (storage.foldername(name))[1] = 'pending');

-- Allow users to read their own verification IDs
-- CREATE POLICY "Users can read own IDs"
-- ON storage.objects FOR SELECT TO authenticated
-- USING (bucket_id = 'verification_ids' AND auth.uid()::text = (storage.foldername(name))[2]);

-- Allow service role (used by Edge Functions) full access - this is automatic for service_role key.

COMMENT ON COLUMN users.account_status IS 'Account approval status: pending (awaiting admin review), approved (can log in), rejected (denied)';
COMMENT ON COLUMN users.address_verification_status IS 'ID address check status: pending, verified, rejected';
COMMENT ON COLUMN users.id_document_url IS 'Public or signed URL of the uploaded government/barangay ID';
COMMENT ON COLUMN users.id_document_path IS 'Storage path of the uploaded ID document in verification_ids bucket';
COMMENT ON COLUMN users.required_barangay IS 'The barangay required for registration';
COMMENT ON COLUMN users.address_verified_at IS 'Timestamp when address was verified by admin';
COMMENT ON COLUMN users.address_rejection_reason IS 'Reason for rejection if ID verification failed';

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add GPS coordinate columns to complaints table
-- Stores precise Leaflet map pin coordinates captured during complaint submission.
-- Run this block in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Index for fast bounding-box queries used by the heatmap
CREATE INDEX IF NOT EXISTS idx_complaints_coords
  ON complaints (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON COLUMN complaints.latitude  IS 'WGS84 latitude of the complaint location (pinned via Leaflet map)';
COMMENT ON COLUMN complaints.longitude IS 'WGS84 longitude of the complaint location (pinned via Leaflet map)';

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add email verification column to users table
-- Used by the OTP email verification step during account creation.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Mark existing approved users as already verified (legacy data)
UPDATE users SET email_verified = true WHERE account_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_users_email_verified
  ON users (email_verified);

COMMENT ON COLUMN users.email_verified IS 'True after user verifies their email via OTP during registration';
