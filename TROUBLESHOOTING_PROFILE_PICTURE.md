# Profile Picture Upload Troubleshooting

## Common Errors and Solutions

### Error: "Network error during image upload"

This typically means one of the following issues:

## 1. Storage Bucket Not Created

**Check if bucket exists:**

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/tvbrotmctjiqvbknhtbl
2. Navigate to **Storage** in the left sidebar
3. Look for a bucket named `profile_pictures`

**If bucket doesn't exist, create it:**

1. Click **"New bucket"**
2. Set **Name**: `profile_pictures`
3. **IMPORTANT**: Check **"Public bucket"** ✅
4. Click **"Create bucket"**

## 2. Storage Policies Not Set

After creating the bucket, you need to add policies:

### Quick Fix - Disable RLS (Testing Only)

1. Go to **Storage** → `profile_pictures` bucket
2. Click **Configuration** tab
3. Find **"Row Level Security"**
4. Toggle **OFF** (for testing only)

### Proper Fix - Add Policies (Recommended)

1. Go to **Storage** → `profile_pictures` bucket
2. Click **Policies** tab
3. Click **"New Policy"**

Add these 4 policies:

#### Policy 1: Allow Uploads (INSERT)

```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile_pictures');
```

#### Policy 2: Allow Updates (UPDATE)

```sql
CREATE POLICY "Allow authenticated updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'profile_pictures');
```

#### Policy 3: Allow Deletes (DELETE)

```sql
CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'profile_pictures');
```

#### Policy 4: Allow Public Read (SELECT)

```sql
CREATE POLICY "Allow public reads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile_pictures');
```

## 3. Check Browser Console

Open the browser console (F12) and look for:

- Red error messages
- Failed network requests to Supabase
- CORS errors
- Authentication errors

The detailed logging will now show:

- "Starting profile picture upload for user: {userId}"
- "Uploading to path: {filename}"
- "Upload successful: {data}"
- Or specific error messages

## 4. Database Column Missing

Verify the `profile_picture_url` column exists:

1. Go to **SQL Editor** in Supabase Dashboard
2. Run this query:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name = 'profile_picture_url';
```

If it returns no results, run the migration:

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
```

## 5. API Endpoint Not Deployed

Make sure the API changes are deployed to Vercel:

```bash
vercel --prod
```

Or check that the endpoint exists at:
`https://your-domain.vercel.app/api/make-server-fc40ab2c/auth/profile/picture`

## Testing Steps

1. **Open Browser Console (F12)**
2. **Click "Change Picture"**
3. **Select an image**
4. **Watch the console for detailed logs**

You should see:

```
Starting profile picture upload for user: [your-user-id]
Uploading to path: [filename]
Upload successful: [data]
Public URL generated: [url]
Profile updated successfully: [data]
```

If you see an error, it will now be more specific:

- "Storage bucket not configured. Please contact admin."
- "Storage permissions not configured. Please contact admin."
- "Upload failed: [specific error]"

## Quick Test - Check if Bucket Works

Run this in browser console while logged in:

```javascript
// Get Supabase instance
const { supabase } = await import("/src/utils/supabase/client.tsx");

// Try to list buckets
const { data, error } = await supabase.storage.listBuckets();
console.log("Buckets:", data, "Error:", error);

// Try to get profile_pictures bucket
const { data: files, error: listError } = await supabase.storage
  .from("profile_pictures")
  .list();
console.log("Files:", files, "Error:", listError);
```

## Expected Results

### Success:

- Upload completes in 2-5 seconds
- Toast shows: "Profile picture updated successfully!"
- Image appears immediately in profile
- Image persists after refresh

### Failure:

- Toast shows specific error message
- Console shows detailed error logs
- Fix the issue based on the error message

## Need More Help?

Check these:

1. Supabase project status (not paused)
2. Storage quota not exceeded
3. Image file is valid (PNG, JPG, WebP, GIF)
4. Image size under 5MB
5. User is authenticated (logged in)
