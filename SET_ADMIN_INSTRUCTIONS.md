# How to Set Admin Role Without Editing Raw JSON

Since you cannot edit raw JSON in the Supabase dashboard, here are alternative methods to set a user as an admin:

---

## Option 1: Use Supabase Dashboard (No JSON Editing)

### Method A: Using the SQL Editor (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Click **"New Query"**
4. Copy and paste this SQL query:

```sql
-- Replace 'user@example.com' with your actual email address
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'user@example.com';
```

5. **Replace `'user@example.com'`** with your actual email address
6. Click **"Run"** or press `Ctrl+Enter`
7. You should see "Success. No rows returned" message
8. **Log out and log back in** to the application for changes to take effect

### Method B: Using SQL Editor to Check Current Metadata

To verify if the admin role was set correctly:

```sql
-- Check user metadata
SELECT email, raw_user_meta_data
FROM auth.users
WHERE email = 'user@example.com';
```

---

## Option 2: Use Supabase API (via Browser Console)

If SQL Editor doesn't work, you can use your browser's developer console:

1. Open your application in the browser
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Paste this code (replace with your details):

```javascript
// Get the Supabase client from your app
const { getSupabaseClient } = await import("./src/utils/supabase/client.tsx");
const supabase = getSupabaseClient();

// Get your current session
const {
  data: { session },
} = await supabase.auth.getSession();

// Use the Management API to update user metadata
const response = await fetch(
  `https://YOUR_PROJECT_ID.supabase.co/auth/v1/admin/users/${session.user.id}`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bearer YOUR_SERVICE_ROLE_KEY`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_metadata: {
        role: "admin",
      },
    }),
  }
);

console.log(await response.json());
```

**Note:** You'll need your service role key from Supabase dashboard → Settings → API

---

## Option 3: Create a Self-Service Admin Setup (Built into App)

We can add a one-time admin setup screen to your application that allows the first user to become an admin. Would you like me to create this?

---

## Option 4: Set Admin via Environment Variable (Simplest)

We can modify the application to automatically make certain email addresses admins:

1. Add an admin email list to your environment
2. The app automatically grants admin access to those emails

This requires a small code change. Would you like me to implement this?

---

## Recommended Approach

**Use Option 1 (SQL Editor)** - It's the quickest and doesn't require any code changes.

Just run this SQL command in Supabase SQL Editor:

```sql
-- Set YOUR email as admin
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'YOUR_EMAIL@example.com';
```

Then **log out and log back in** to see the admin features!

---

## Need Help?

Let me know which option you'd prefer, or if you'd like me to:

1. Create a built-in admin setup screen
2. Add environment variable-based admin emails
3. Create a different solution
