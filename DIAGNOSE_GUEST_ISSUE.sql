-- DIAGNOSTIC SCRIPT: Run this to see what's blocking guest submissions
-- Copy each section one at a time and check the results

-- ============================================================================
-- STEP 1: Check if RLS is enabled
-- ============================================================================
SELECT 
    tablename, 
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'complaints';

-- Expected: RLS Enabled = true
-- If false, run: ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- STEP 2: List ALL policies on complaints table
-- ============================================================================
SELECT 
    policyname as "Policy Name",
    cmd as "Command (SELECT/INSERT/UPDATE/DELETE)",
    CASE 
        WHEN with_check IS NOT NULL THEN 'YES' 
        ELSE 'NO' 
    END as "Has WITH CHECK clause"
FROM pg_policies 
WHERE tablename = 'complaints'
ORDER BY cmd, policyname;

-- You should see a policy named "Guests can insert complaints" with cmd = INSERT


-- ============================================================================
-- STEP 3: Check the exact guest policy definition
-- ============================================================================
SELECT 
    policyname,
    pg_get_expr(qual, 'complaints'::regclass) as "USING clause",
    pg_get_expr(with_check, 'complaints'::regclass) as "WITH CHECK clause"
FROM pg_policies 
WHERE tablename = 'complaints' 
AND policyname = 'Guests can insert complaints';

-- Expected WITH CHECK clause: (user_id IS NULL)


-- ============================================================================
-- STEP 4: Check if user_id column allows NULL
-- ============================================================================
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'complaints' 
AND column_name IN ('user_id', 'user_name');

-- user_id should show is_nullable = YES
-- If it shows NO, run: ALTER TABLE complaints ALTER COLUMN user_id DROP NOT NULL;


-- ============================================================================
-- STEP 5: Try manual test insert as guest
-- ============================================================================
-- This simulates what the frontend is trying to do
INSERT INTO complaints (
    title,
    description,
    category,
    location,
    contact_info,
    status,
    priority,
    user_id,
    user_name
) VALUES (
    'TEST - Manual Guest Insert',
    'Testing if guest submission works',
    'Infrastructure',
    'Test Location',
    'test@test.com',
    'pending',
    'medium',
    NULL,
    'AnonymousTEST'
);

-- If this FAILS, copy the EXACT error message
-- Common errors:
-- 1. "new row violates row-level security policy" = Policy issue
-- 2. "null value in column violates not-null constraint" = Schema issue
-- 3. "permission denied" = Permissions issue


-- ============================================================================
-- STEP 6: If insert succeeded, verify and clean up
-- ============================================================================
SELECT * FROM complaints WHERE user_name = 'AnonymousTEST';

-- Clean up test data:
-- DELETE FROM complaints WHERE user_name = 'AnonymousTEST';


-- ============================================================================
-- STEP 7: Check for conflicting policies
-- ============================================================================
-- Sometimes other policies can block guest inserts
SELECT 
    policyname,
    cmd,
    permissive,
    pg_get_expr(with_check, 'complaints'::regclass) as with_check_clause
FROM pg_policies 
WHERE tablename = 'complaints' 
AND cmd = 'INSERT';

-- You should see TWO INSERT policies:
-- 1. "Users can insert their own complaints" - with_check: (auth.uid() = user_id)
-- 2. "Guests can insert complaints" - with_check: (user_id IS NULL)
-- Both should have permissive = PERMISSIVE (not RESTRICTIVE)


-- ============================================================================
-- COMPLETE FIX (if needed)
-- ============================================================================
-- If any of the above failed, run this complete fix:

-- 1. Make sure user_id allows NULL
ALTER TABLE complaints ALTER COLUMN user_id DROP NOT NULL;

-- 2. Drop ALL INSERT policies
DROP POLICY IF EXISTS "Users can insert their own complaints" ON complaints;
DROP POLICY IF EXISTS "Guests can insert complaints" ON complaints;

-- 3. Recreate both INSERT policies
CREATE POLICY "Users can insert their own complaints"
  ON complaints
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Guests can insert complaints"
  ON complaints
  FOR INSERT
  WITH CHECK (user_id IS NULL);

-- 4. Verify both policies exist
SELECT policyname FROM pg_policies 
WHERE tablename = 'complaints' AND cmd = 'INSERT';

-- Expected result: 2 rows
-- "Users can insert their own complaints"
-- "Guests can insert complaints"
