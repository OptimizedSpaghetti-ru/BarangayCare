-- Migration: Add address verification columns to users table
-- This migration adds columns to support the address verification feature during registration

-- Add address verification columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS address_verification_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS id_document_url TEXT,
ADD COLUMN IF NOT EXISTS id_document_path TEXT,
ADD COLUMN IF NOT EXISTS required_barangay VARCHAR(255) DEFAULT 'Barangay NBBS, Navotas',
ADD COLUMN IF NOT EXISTS address_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS address_rejection_reason TEXT;

-- Create index for faster queries on verification status
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(address_verification_status);

-- Create storage bucket for verification IDs (run this in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('verification_ids', 'verification_ids', false)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies for verification_ids bucket
-- These need to be run in the Supabase dashboard or via the management API

-- Policy: Allow authenticated users to upload their own verification IDs
-- CREATE POLICY "Users can upload their own verification IDs"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'verification_ids' 
--   AND auth.role() = 'authenticated'
-- );

-- Policy: Allow authenticated users to read their own verification IDs
-- CREATE POLICY "Users can read their own verification IDs"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'verification_ids' 
--   AND auth.uid()::text = (storage.foldername(name))[2]
-- );

-- Policy: Allow admins to read all verification IDs
-- This would require a custom function to check admin status

COMMENT ON COLUMN users.address_verification_status IS 'Status of address verification: pending, verified, rejected';
COMMENT ON COLUMN users.id_document_url IS 'Public URL of the uploaded ID document';
COMMENT ON COLUMN users.id_document_path IS 'Storage path of the uploaded ID document';
COMMENT ON COLUMN users.required_barangay IS 'The barangay required for registration (Barangay NBBS, Navotas)';
COMMENT ON COLUMN users.address_verified_at IS 'Timestamp when address was verified by admin';
COMMENT ON COLUMN users.address_rejection_reason IS 'Reason for rejection if address verification failed';
