# Quick Start: Database Setup (5 Minutes)

Follow these steps to get your Supabase database running:

## ⚡ Quick Setup (Copy & Paste)

### 1. Open Supabase SQL Editor
- Go to: https://supabase.com/dashboard
- Select your project
- Click **"SQL Editor"** (left sidebar)
- Click **"New Query"**

### 2. Copy & Paste This SQL

Open the file `/utils/supabase/setup-database.sql` and copy ALL the contents, then paste into the SQL editor and click **"Run"**.

**IMPORTANT:** If you already ran the old SQL script and got permission errors, run `/utils/supabase/fix-policies.sql` instead to fix the policies.

### 3. Enable Realtime
- Go to **Database** → **Replication**
- Find `complaints` table
- Toggle **ON**

### 4. Make Yourself Admin
- Go to **Authentication** → **Users**
- Click your user
- In **"User Metadata"** section, paste:
```json
{"role": "admin", "name": "Your Name"}
```
- Click **Save**

### 5. Done! 🎉

Now:
- Log in to the app
- Submit a test complaint
- Check it appears in Supabase **Table Editor**
- Changes sync in real-time across devices

---

## ✅ What You Get

- ☁️ **Cloud storage** - All data in Supabase
- 🔄 **Real-time sync** - Instant updates across devices
- 👥 **Multi-user** - Users see their own, admins see all
- 🔒 **Secure** - Row Level Security enabled
- 💾 **Permanent** - Data never lost

---

## 🆘 Need Help?

See the full guide: `/utils/supabase/DATABASE_SETUP_GUIDE.md`

Common issues:
- **Can't submit complaints?** → Make sure you're logged in
- **Real-time not working?** → Enable in Database → Replication
- **Permission denied?** → Check RLS policies were created

---

## 📊 Verify Setup

After setup, verify:

1. ✅ Table `complaints` exists in Table Editor
2. ✅ 6 RLS policies are active (Database → Policies)
3. ✅ Realtime is ON (Database → Replication)
4. ✅ At least one admin user configured
5. ✅ Can submit and view complaints in the app

---

**That's it!** Your database is ready to use. 🚀
