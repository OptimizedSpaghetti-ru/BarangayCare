# BarangayCARE - Supabase Database Integration

## Overview

The BarangayCARE system now uses **Supabase** as the cloud database to store all complaints permanently. This ensures:

✅ **Multi-user access** - All users can access their complaints from any device  
✅ **Admin visibility** - Admins can view and manage ALL complaints from all users  
✅ **Cloud synchronization** - Data is stored in Supabase and syncs across devices  
✅ **Real-time updates** - Changes appear instantly across all connected devices  
✅ **Permanent storage** - Data never gets deleted, even after refresh/restart  

---

## Files Modified & Created

### Modified Files:
1. **`/components/complaint-manager.tsx`**
   - Updated to use Supabase database instead of localStorage
   - Added real-time subscription for live updates
   - Implemented proper data transformation between camelCase and snake_case
   - Added user authentication checks

2. **`/App.tsx`**
   - Added MigrationHelper component to assist with localStorage migration

### New Files Created:

1. **`/utils/supabase/setup-database.sql`**
   - SQL script to create the complaints table
   - Defines table structure with all required columns
   - Sets up Row Level Security (RLS) policies
   - Creates indexes for performance
   - Includes helper functions

2. **`/utils/supabase/DATABASE_SETUP_GUIDE.md`**
   - Step-by-step guide to set up the database in Supabase
   - Troubleshooting tips
   - Admin setup instructions

3. **`/utils/supabase/migrate-localStorage.tsx`**
   - Utility function to migrate existing localStorage data to Supabase
   - One-time migration helper

4. **`/components/migration-helper.tsx`**
   - UI component that prompts users to migrate localStorage data
   - Shows migration status and results

5. **`/SUPABASE_DATABASE_README.md`** (this file)
   - Documentation and setup instructions

---

## Database Table Structure

### Table Name: `complaints`

| Column Name | Type | Description | Required |
|-------------|------|-------------|----------|
| `id` | UUID | Unique complaint ID (auto-generated) | Yes |
| `title` | TEXT | Quest/Complaint title | Yes |
| `description` | TEXT | Detailed description | Yes |
| `category` | TEXT | Category (infrastructure, health, etc.) | Yes |
| `location` | TEXT | Location of the issue | Yes |
| `photo` | TEXT | Photo URL (optional) | No |
| `contact_info` | TEXT | Contact information | Yes |
| `status` | TEXT | Status (pending, in-progress, resolved, rejected) | Yes |
| `priority` | TEXT | Priority (low, medium, high) | Yes |
| `date_submitted` | TIMESTAMPTZ | Date and time of submission | Yes (auto) |
| `admin_notes` | TEXT | Admin's notes | No |
| `respondent` | TEXT | Respondent name (for disputes/crimes) | No |
| `user_id` | UUID | User who submitted the complaint | Yes |
| `user_name` | TEXT | Name of complainant | Yes |
| `created_at` | TIMESTAMPTZ | Record creation timestamp | Yes (auto) |
| `updated_at` | TIMESTAMPTZ | Last update timestamp | Yes (auto) |

---

## Setup Instructions

### Step 1: Run the Database Setup Script

1. Open your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Click **"New Query"**
4. Copy and paste the contents of `/utils/supabase/setup-database.sql`
5. Click **"Run"** to execute

**Note:** If you already ran the old version and are getting permission errors, run `/utils/supabase/fix-policies.sql` to fix the RLS policies.

### Step 2: Enable Realtime

1. Go to **Database** → **Replication**
2. Find the `complaints` table
3. Toggle **ON** for realtime updates

### Step 3: Set Up Admin User

1. Go to **Authentication** → **Users**
2. Click on your admin user
3. Under **"User Metadata"**, add:
   ```json
   {
     "role": "admin",
     "name": "Admin Name"
   }
   ```
4. Save changes

### Step 4: Test the Integration

1. Log in to the application
2. Submit a test complaint
3. Check the Supabase **Table Editor** to verify the data is saved
4. Log in as admin to verify you can see all complaints
5. Update a complaint status and verify it syncs in real-time

---

## How It Works

### For Regular Users:
- Users can **submit complaints** from any device
- Their complaints are **permanently stored** in Supabase
- They can **view their own complaints** across all devices
- **Real-time updates** show status changes immediately
- Data is **never lost**, even after clearing browser cache

### For Admins:
- Admins can **view ALL complaints** from all users
- They can **update status, priority, and add notes**
- Changes sync **instantly** to users
- Complete **history and audit trail** is maintained
- Can **filter and search** across all complaints

### Security (Row Level Security):
- Users can only see their own complaints
- Users can only create complaints for themselves
- Admins can see and modify all complaints
- All actions are tied to authenticated users
- Unauthorized access is automatically blocked

---

## Real-Time Synchronization

The system uses **Supabase Realtime** to sync data across devices:

- When a user submits a complaint → Admins see it **instantly**
- When admin updates status → User sees it **immediately**
- When priority is changed → All connected devices update **in real-time**
- No page refresh needed → Updates appear **automatically**

This is achieved through WebSocket subscriptions that listen for database changes.

---

## Data Migration (Optional)

If you have existing complaints in localStorage:

1. The **MigrationHelper** component will automatically appear
2. Click **"Migrate to Cloud"** to transfer data
3. All local complaints will be uploaded to Supabase
4. Data becomes accessible from any device

Alternatively, users can re-submit their complaints after database setup.

---

## Troubleshooting

### Problem: Complaints not appearing
**Solution:**
- Verify you're logged in
- Check browser console for errors
- Ensure RLS policies are set up correctly
- Verify your Supabase connection in `/utils/supabase/info.tsx`

### Problem: "Permission denied" errors
**Solution:**
- Check that RLS policies are created
- Verify user is authenticated
- For admins: Ensure `role: "admin"` is in user metadata

### Problem: Real-time not working
**Solution:**
- Enable Realtime in Database → Replication
- Check browser console for subscription errors
- Verify Supabase project settings allow realtime

### Problem: Can't submit complaints
**Solution:**
- Ensure table exists (check Table Editor)
- Verify user is logged in
- Check that INSERT policy is active
- Look for errors in browser console

---

## Database Maintenance

### Backup
- Supabase automatically backs up your database
- You can also export data from Table Editor

### Performance
- Indexes are automatically created for common queries
- Realtime subscriptions are optimized for low latency

### Monitoring
- Check **Database** → **Query Performance** in Supabase
- Monitor logs in **Logs** → **Database**

---

## API Usage

The complaint manager automatically handles all database operations:

```typescript
// Add a complaint
const { error } = await addComplaint({
  title: "Pothole on Main Street",
  description: "Large pothole needs repair",
  category: "infrastructure",
  location: "Main Street",
  contactInfo: "user@example.com",
  status: "pending",
  priority: "medium"
});

// Update a complaint (admin)
await updateComplaint(complaintId, {
  status: "in-progress",
  priority: "high",
  adminNotes: "Scheduled for repair next week"
});

// Fetch complaints (automatic)
// The system automatically fetches complaints on load
// and subscribes to real-time updates
```

---

## Next Steps

1. ✅ Run the database setup script in Supabase SQL Editor
2. ✅ Enable realtime for the complaints table
3. ✅ Set up at least one admin user
4. ✅ Test submitting a complaint
5. ✅ Verify data appears in Supabase Table Editor
6. ✅ Test admin viewing and updating complaints
7. ✅ Verify real-time sync works
8. ✅ (Optional) Migrate localStorage data if needed

---

## Support

For issues or questions:
1. Check the `/utils/supabase/DATABASE_SETUP_GUIDE.md` for detailed instructions
2. Review Supabase documentation: https://supabase.com/docs
3. Check the browser console for error messages
4. Verify your Supabase project settings

---

**Congratulations!** Your BarangayCARE system is now powered by a cloud database with real-time synchronization! 🎉
