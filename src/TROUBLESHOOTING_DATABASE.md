# Database Troubleshooting Guide

## Error: "Multiple GoTrueClient instances detected"

### Problem
You're seeing this warning in the console:
```
Multiple GoTrueClient instances detected in the same browser context.
```

### Solution ✅ FIXED
This has been fixed by implementing a singleton Supabase client pattern.

**What was done:**
- Created `/utils/supabase/client.tsx` with a singleton client
- Updated all files to use `getSupabaseClient()` instead of creating new clients
- Files updated:
  - `/components/auth/auth-context.tsx`
  - `/components/complaint-manager.tsx`
  - `/components/auth/user-management.tsx`
  - `/utils/supabase/migrate-localStorage.tsx`

**No action needed** - the error should no longer appear.

---

## Error: "permission denied for table users"

### Problem
You're seeing this error when submitting complaints:
```json
{
  "code": "42501",
  "details": null,
  "hint": null,
  "message": "permission denied for table users"
}
```

### Cause
The original RLS policies tried to query the `auth.users` table directly, which is not allowed in RLS policy context.

### Solution ✅ FIXED

**Option 1: If you haven't run the SQL yet**
- Just run the updated `/utils/supabase/setup-database.sql`
- It now contains the correct policies

**Option 2: If you already ran the old SQL (RECOMMENDED)**
1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy and paste the contents of `/utils/supabase/fix-policies.sql`
4. Click "Run"

This will:
- Drop the old incorrect policies
- Create new correct policies using `auth.jwt()` instead

**Option 3: Manual fix via Dashboard**
1. Go to **Authentication** → **Policies**
2. Find table: `complaints`
3. Delete these two policies:
   - "Admins can view all complaints"
   - "Admins can update all complaints"
4. Create new policies:

**Admin View Policy:**
```sql
Policy name: Admins can view all complaints
Policy command: SELECT
Target roles: public

USING expression:
(auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
```

**Admin Update Policy:**
```sql
Policy name: Admins can update all complaints
Policy command: UPDATE
Target roles: public

USING expression:
(auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
```

---

## Error: "Cannot read properties of undefined (reading 'supabaseUrl')"

### Problem
The app crashes with an error about `supabaseUrl`.

### Solution
This happened because we tried to extract the URL from the client. Update has been made to use a simpler approach.

If you still see this error:
1. Check that `/utils/supabase/info.tsx` exists and has valid values
2. Verify your Supabase project is connected
3. Try refreshing the page

---

## Error: "No policy allowing row access"

### Problem
Users can't submit or view complaints, getting policy errors.

### Cause
RLS policies might not be set up correctly or user is not authenticated.

### Solution
1. **Verify you're logged in**
   - Check that you see your user info in the top right
   - Try logging out and back in

2. **Check RLS policies exist**
   - Go to Database → Policies → `complaints` table
   - You should see 6 policies:
     - Users can view their own complaints
     - Users can insert their own complaints
     - Users can update their own complaints
     - Admins can view all complaints
     - Admins can update all complaints

3. **Run the fix script**
   ```sql
   -- Copy from /utils/supabase/fix-policies.sql
   ```

---

## Error: "relation 'complaints' does not exist"

### Problem
The complaints table hasn't been created.

### Solution
1. Go to Supabase Dashboard → SQL Editor
2. Run the complete `/utils/supabase/setup-database.sql` script
3. Verify the table appears in Table Editor

---

## Complaints not syncing in real-time

### Problem
Changes made by admin don't appear for users, or new complaints don't show for admin.

### Solution
1. **Enable Realtime in Supabase**
   - Go to Database → Replication
   - Find `complaints` table
   - Toggle **ON**

2. **Check subscription in console**
   - Open browser console (F12)
   - Look for "Real-time update received" messages
   - If you don't see them, realtime might not be enabled

3. **Refresh the page**
   - Sometimes the subscription needs to reconnect

---

## Admin can't see all complaints

### Problem
Admin users only see their own complaints instead of all complaints.

### Solution
1. **Verify admin role is set correctly**
   - Go to Authentication → Users
   - Click on the admin user
   - Check User Metadata contains:
   ```json
   {
     "role": "admin",
     "name": "Admin Name"
   }
   ```

2. **Check admin policies**
   - Run `/utils/supabase/fix-policies.sql` to ensure correct policies

3. **Log out and back in**
   - Admin role is read from the JWT token
   - Logging out and back in refreshes the token

---

## Migration from localStorage failing

### Problem
The migration helper shows an error when trying to migrate.

### Possible Causes & Solutions

**Error: "User not logged in"**
- Make sure you're logged in before attempting migration

**Error: "Permission denied"**
- Run the policy fix script: `/utils/supabase/fix-policies.sql`
- Ensure you're logged in

**Error: "Duplicate key violation"**
- Some complaints may already exist
- This is safe to ignore if migration partially succeeded

**Migration shows 0 complaints**
- localStorage might be empty
- Check localStorage: `localStorage.getItem('barangay-complaints')`
- If empty, there's nothing to migrate

---

## Data not persisting after refresh

### Problem
Complaints disappear when you refresh the page.

### Cause
The app is still using localStorage instead of Supabase.

### Solution
1. **Verify table exists**
   - Check Supabase Table Editor for `complaints` table

2. **Check console for errors**
   - Open browser console (F12)
   - Look for red error messages
   - Most common: permission errors (see above)

3. **Verify connection**
   - Check `/utils/supabase/info.tsx` has correct values
   - Ensure you're connected to the right Supabase project

---

## Best Practices

### After fixing policies:
1. Clear browser cache
2. Log out and log back in
3. Test submitting a new complaint
4. Verify it appears in Supabase Table Editor

### For admins:
1. Always verify `role: "admin"` is in user metadata
2. Log out/in after changing role
3. Check you can see all users' complaints

### For developers:
1. Check browser console for errors
2. Monitor Supabase logs (Logs → Database)
3. Test with both admin and regular user accounts

---

## Quick Checklist

Use this checklist to verify your setup:

- [ ] Table `complaints` exists in Supabase
- [ ] 6 RLS policies are active (not 4!)
- [ ] Realtime is enabled for `complaints` table
- [ ] At least one user has admin role in metadata
- [ ] Can log in successfully
- [ ] Can submit complaint as regular user
- [ ] Complaint appears in Supabase Table Editor
- [ ] Admin can see all complaints
- [ ] Changes sync in real-time
- [ ] No errors in browser console
- [ ] No "Multiple GoTrueClient" warnings

---

## Still Having Issues?

1. **Check Supabase Logs**
   - Go to Logs → Database
   - Look for error messages

2. **Verify RLS Policies**
   - Database → Policies → complaints
   - Should have exactly 6 policies

3. **Test SQL Directly**
   - Go to SQL Editor
   - Run: `SELECT * FROM complaints;`
   - Should see your complaints

4. **Nuclear Option: Reset Everything**
   ```sql
   -- WARNING: This deletes all complaint data!
   DROP TABLE IF EXISTS complaints CASCADE;
   -- Then run /utils/supabase/setup-database.sql again
   ```

---

## Files Reference

- **Setup**: `/utils/supabase/setup-database.sql`
- **Fix Policies**: `/utils/supabase/fix-policies.sql`
- **Singleton Client**: `/utils/supabase/client.tsx`
- **Migration Tool**: `/utils/supabase/migrate-localStorage.tsx`
- **Quick Start**: `/QUICK_START_DATABASE.md`
- **Full Docs**: `/SUPABASE_DATABASE_README.md`
