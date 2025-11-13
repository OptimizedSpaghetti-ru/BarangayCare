-- QUICK FIX: Run this single command in Supabase SQL Editor
-- This is the most likely fix for your guest submission issue

-- Create the guest insertion policy (if it doesn't exist)
DO $$ 
BEGIN
    -- Drop the policy if it exists
    DROP POLICY IF EXISTS "Guests can insert complaints" ON complaints;
    
    -- Create the policy fresh
    CREATE POLICY "Guests can insert complaints"
      ON complaints
      FOR INSERT
      WITH CHECK (user_id IS NULL);
    
    RAISE NOTICE 'Guest policy created successfully!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error: %', SQLERRM;
END $$;

-- Verify the policy was created
SELECT 
    'Guest policy exists: ' || 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'complaints' 
            AND policyname = 'Guests can insert complaints'
        ) 
        THEN 'YES ✓' 
        ELSE 'NO ✗' 
    END as status;
