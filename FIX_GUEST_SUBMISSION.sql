-- BarangayCare Guest Account - Database Setup & Troubleshooting
-- Run this complete script in Supabase SQL Editor to fix guest submission issues

-- ============================================================================
-- STEP 1: Verify and Fix the complaints table structure
-- ============================================================================

-- Check if user_id column allows NULL (it should for guests)
-- This query will show you the current column definition
SELECT 
    column_name, 
    is_nullable, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'complaints' 
    AND column_name = 'user_id';

-- If user_id is NOT NULL, run this to allow NULL values:
-- ALTER TABLE complaints ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================================
-- STEP 2: Drop and recreate RLS policies to ensure they're correct
-- ============================================================================

-- First, let's see what policies currently exist
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd,
    qual,
    with_check
FROM 
    pg_policies 
WHERE 
    tablename = 'complaints';

-- Drop existing policies (if they exist) to start fresh
DROP POLICY IF EXISTS "Users can view their own complaints" ON complaints;
DROP POLICY IF EXISTS "Users can insert their own complaints" ON complaints;
DROP POLICY IF EXISTS "Users can update their own complaints" ON complaints;
DROP POLICY IF EXISTS "Admins can view all complaints" ON complaints;
DROP POLICY IF EXISTS "Admins can update all complaints" ON complaints;
DROP POLICY IF EXISTS "Guests can insert complaints" ON complaints;

-- ============================================================================
-- STEP 3: Create correct RLS policies
-- ============================================================================

-- Policy 1: Users can view their own complaints
CREATE POLICY "Users can view their own complaints"
  ON complaints
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own complaints
CREATE POLICY "Users can insert their own complaints"
  ON complaints
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own complaints
CREATE POLICY "Users can update their own complaints"
  ON complaints
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Admins can view all complaints
CREATE POLICY "Admins can view all complaints"
  ON complaints
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Policy 5: Admins can update all complaints
CREATE POLICY "Admins can update all complaints"
  ON complaints
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Policy 6: **CRITICAL** - Allow guests to insert complaints (user_id is NULL)
CREATE POLICY "Guests can insert complaints"
  ON complaints
  FOR INSERT
  WITH CHECK (user_id IS NULL);

-- ============================================================================
-- STEP 4: Verify RLS is enabled
-- ============================================================================

-- Ensure RLS is enabled on the complaints table
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Test guest insertion manually
-- ============================================================================

-- Try inserting a test guest complaint to verify it works
INSERT INTO complaints (
    title,
    description,
    category,
    location,
    contact_info,
    status,
    priority,
    user_id,
    user_name,
    date_submitted
) VALUES (
    'Test Guest Complaint',
    'This is a test complaint submitted by a guest user',
    'Infrastructure',
    'Test Location',
    'test@example.com',
    'pending',
    'medium',
    NULL,  -- NULL user_id for guest
    'Anonymous001',
    NOW()
);

-- If the above INSERT fails, check the error message
-- Common issues:
-- 1. RLS policy not allowing NULL user_id
-- 2. user_id column doesn't allow NULL
-- 3. Missing required fields

-- ============================================================================
-- STEP 6: Verify the test complaint was inserted
-- ============================================================================

-- Check if the test guest complaint exists
SELECT 
    id,
    title,
    user_id,
    user_name,
    date_submitted
FROM 
    complaints
WHERE 
    user_name = 'Anonymous001'
ORDER BY 
    date_submitted DESC
LIMIT 1;

-- ============================================================================
-- STEP 7: Clean up test data (optional)
-- ============================================================================

-- If you want to remove the test complaint:
-- DELETE FROM complaints WHERE user_name = 'Anonymous001' AND title = 'Test Guest Complaint';

-- ============================================================================
-- TROUBLESHOOTING QUERIES
-- ============================================================================

-- Query 1: Check all policies on complaints table
SELECT * FROM pg_policies WHERE tablename = 'complaints';

-- Query 2: Check if RLS is enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM 
    pg_tables 
WHERE 
    tablename = 'complaints';

-- Query 3: View all guest complaints (user_id IS NULL)
SELECT 
    id,
    title,
    user_name,
    date_submitted,
    status
FROM 
    complaints
WHERE 
    user_id IS NULL
ORDER BY 
    date_submitted DESC;

-- Query 4: Count guest vs registered user complaints
SELECT 
    CASE 
        WHEN user_id IS NULL THEN 'Guest' 
        ELSE 'Registered User' 
    END AS user_type,
    COUNT(*) as complaint_count
FROM 
    complaints
GROUP BY 
    user_type;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

-- This should return TRUE if RLS is properly configured
SELECT 
    EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'complaints' 
        AND policyname = 'Guests can insert complaints'
    ) as guest_policy_exists,
    (
        SELECT rowsecurity 
        FROM pg_tables 
        WHERE tablename = 'complaints'
    ) as rls_enabled;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- guest_policy_exists: TRUE
-- rls_enabled: TRUE
-- If both are TRUE, guest submissions should work!

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- Common Error Messages and Solutions:
--
-- 1. "new row violates row-level security policy"
--    Solution: The guest policy is missing or incorrect. Rerun Step 3.
--
-- 2. "null value in column 'user_id' violates not-null constraint"
--    Solution: user_id doesn't allow NULL. Run: 
--    ALTER TABLE complaints ALTER COLUMN user_id DROP NOT NULL;
--
-- 3. "permission denied for table complaints"
--    Solution: Your database user might not have the right permissions.
--    Make sure you're using the service_role key in your backend.
--
-- 4. Guest complaints not appearing in admin panel
--    Solution: Check the admin SELECT policy includes NULL user_id entries.
--    The "Admins can view all complaints" policy should cover all rows.
--
-- ============================================================================
