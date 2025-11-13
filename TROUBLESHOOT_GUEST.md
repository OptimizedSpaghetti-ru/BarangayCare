# Guest Submission Troubleshooting Guide

## 🚨 Issue: Guest complaints not submitting

## 🔍 Diagnosis Steps

### Step 1: Check Browser Console

1. Open your browser DevTools (F12)
2. Go to Console tab
3. Try submitting a guest complaint
4. Look for error messages - they will tell us exactly what's wrong

**Common errors:**

- `"new row violates row-level security policy"` → RLS policy issue
- `"null value in column 'user_id' violates not-null constraint"` → Database schema issue
- `"Failed to submit complaint"` → Generic error, check network tab

### Step 2: Verify RLS Policy in Supabase

Run this in Supabase SQL Editor to check if the guest policy exists:

```sql
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE tablename = 'complaints'
AND policyname = 'Guests can insert complaints';
```

**Expected result:** Should return 1 row with the guest policy

**If empty:** Run the complete fix script in `FIX_GUEST_SUBMISSION.sql`

### Step 3: Test Manual Guest Insertion

Try inserting a guest complaint manually in Supabase SQL Editor:

```sql
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
    'Manual Test',
    'Testing guest submission',
    'Infrastructure',
    'Test Location',
    'test@test.com',
    'pending',
    'medium',
    NULL,
    'Anonymous999'
);
```

**If this fails:** The RLS policy is not working correctly
**If this succeeds:** The issue is in the frontend code

### Step 4: Check Network Tab

1. Open DevTools → Network tab
2. Try submitting a guest complaint
3. Look for the Supabase API call
4. Check the response status code:
   - **200/201** = Success
   - **400** = Bad request (missing fields)
   - **403** = Permission denied (RLS issue)
   - **500** = Server error

## 🔧 Quick Fix Solutions

### Solution 1: Recreate RLS Policies (Most Common)

Run this in Supabase SQL Editor:

```sql
-- Drop existing guest policy
DROP POLICY IF EXISTS "Guests can insert complaints" ON complaints;

-- Recreate it correctly
CREATE POLICY "Guests can insert complaints"
  ON complaints
  FOR INSERT
  WITH CHECK (user_id IS NULL);
```

### Solution 2: Ensure user_id Allows NULL

Check if user_id column allows NULL:

```sql
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'complaints'
AND column_name = 'user_id';
```

If `is_nullable` is 'NO', run:

```sql
ALTER TABLE complaints ALTER COLUMN user_id DROP NOT NULL;
```

### Solution 3: Disable/Re-enable RLS

Sometimes RLS needs to be refreshed:

```sql
-- Disable RLS
ALTER TABLE complaints DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
```

### Solution 4: Clear Browser Cache

Guest mode uses localStorage. Clear it:

1. Open DevTools → Application tab
2. Clear localStorage
3. Refresh the page
4. Try "Continue as Guest" again

## 📋 Complete SQL Fix Script

For a comprehensive fix, run the entire script in `FIX_GUEST_SUBMISSION.sql`

This script will:

1. Verify table structure
2. Drop and recreate all RLS policies
3. Test guest insertion
4. Provide verification queries

## 🧪 Test After Fixing

1. Visit your app
2. Click "Continue as Guest"
3. Fill out complaint form
4. Submit
5. Check browser console for errors
6. Login as admin
7. Verify complaint appears as "Anonymous001"

## 🎯 What Should Work

After applying the fix:

**Frontend:**

- ✅ "Continue as Guest" button works
- ✅ Guest mode activated (info banner shows)
- ✅ Complaint form submits successfully
- ✅ Success toast message appears

**Backend:**

- ✅ Complaint inserted with `user_id: NULL`
- ✅ user_name set as "Anonymous001", "Anonymous002", etc.
- ✅ No RLS policy violations

**Admin Panel:**

- ✅ Guest complaints visible
- ✅ Shows as "Anonymous###"
- ✅ Fully manageable like regular complaints

## 🆘 Still Not Working?

Share the exact error message from:

1. Browser console
2. Network tab response
3. Supabase SQL Editor when running test insert

This will help identify the specific issue!
