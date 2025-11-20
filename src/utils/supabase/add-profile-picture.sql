-- Add profile_picture_url column to users table
-- Run this migration in your Supabase SQL editor

-- Add the profile_picture_url column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Create storage bucket for profile pictures
-- Note: This needs to be done in the Supabase Dashboard under Storage
-- Bucket name: profile_pictures
-- Public bucket: Yes
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- Create storage policies for profile_pictures bucket
-- These policies allow users to manage their own profile pictures

-- Policy: Allow users to upload their own profile pictures
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile_pictures' 
  AND (storage.foldername(name))[1] = 'profile_pictures'
);

-- Policy: Allow users to update their own profile pictures
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile_pictures' 
  AND (storage.foldername(name))[1] = 'profile_pictures'
)
WITH CHECK (
  bucket_id = 'profile_pictures' 
  AND (storage.foldername(name))[1] = 'profile_pictures'
);

-- Policy: Allow users to delete their own profile pictures
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile_pictures' 
  AND (storage.foldername(name))[1] = 'profile_pictures'
);

-- Policy: Allow public read access to profile pictures
CREATE POLICY "Public can view profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile_pictures');

-- Update existing users to have NULL profile_picture_url (no action needed, default is NULL)
-- The column will be populated as users upload their profile pictures

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_profile_picture_url 
ON users(profile_picture_url) 
WHERE profile_picture_url IS NOT NULL;
