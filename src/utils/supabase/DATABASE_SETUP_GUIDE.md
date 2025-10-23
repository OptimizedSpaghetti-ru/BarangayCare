# BarangayCARE Database Setup Guide

This guide will help you set up the complaints database table in Supabase.

## Prerequisites
- A Supabase project (you should already have one connected)
- Access to the Supabase dashboard

## Setup Steps

### 1. Access the SQL Editor
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar

### 2. Run the Database Setup Script
1. Click "New Query" button
2. Copy the entire contents of the file `/utils/supabase/setup-database.sql`
3. Paste it into the SQL editor
4. Click "Run" to execute the script

### 3. Verify the Table Creation
1. Click on "Table Editor" in the left sidebar
2. You should see a new table called "complaints"
3. Click on the table to view its structure

### 4. Expected Table Structure

The `complaints` table should have the following columns:

| Column Name | Type | Description |
|-------------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| title | TEXT | Complaint title/quest |
| description | TEXT | Detailed description |
| category | TEXT | Category of complaint |
| location | TEXT | Location where issue occurred |
| photo | TEXT | URL to photo evidence (optional) |
| contact_info | TEXT | Contact information |
| status | TEXT | Current status (pending, in-progress, resolved, rejected) |
| priority | TEXT | Priority level (low, medium, high) |
| date_submitted | TIMESTAMPTZ | Date and time of submission |
| admin_notes | TEXT | Admin's notes (optional) |
| respondent | TEXT | Respondent name for civil disputes/crimes (optional) |
| user_id | UUID | User who submitted (foreign key to auth.users) |
| user_name | TEXT | Name of complainant |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### 5. Row Level Security (RLS) Policies

The following security policies are automatically created:

- **Users can view their own complaints**: Regular users can only see complaints they submitted
- **Users can insert their own complaints**: Users can create new complaints
- **Users can update their own complaints**: Users can modify their own complaints
- **Admins can view all complaints**: Admin users can see all complaints from all users
- **Admins can update all complaints**: Admins can modify any complaint (status, priority, notes)

### 6. Real-time Subscriptions

Real-time subscriptions are automatically enabled. This means:
- When a user submits a complaint, it instantly appears for admins
- When an admin updates a complaint status, the user sees it immediately
- All changes sync across devices in real-time

### 7. Enable Realtime (if not already enabled)

1. Go to "Database" → "Replication" in the Supabase dashboard
2. Find the "complaints" table in the list
3. Make sure the toggle is **ON** for realtime updates

### 8. Test the Setup

After running the script:
1. Log in to your application
2. Submit a test complaint as a regular user
3. Check the "Table Editor" in Supabase to verify the data is saved
4. Log in as an admin to verify you can see the complaint
5. Update the status as admin and verify it syncs back to the user

## Troubleshooting

### Error: relation "complaints" already exists
- The table was already created. You can drop it and re-run, or skip this error.

### Error: permission denied
- Make sure you're running the script as a database owner/admin
- Check your Supabase project permissions

### Complaints not appearing
1. Check the browser console for errors
2. Verify RLS policies are enabled
3. Make sure the user is logged in
4. Check that realtime is enabled for the table

### Data not syncing in real-time
1. Verify realtime is enabled in Database → Replication
2. Check browser console for subscription errors
3. Ensure your Supabase connection is active

## Migration from localStorage

If you have existing complaints in localStorage (from the old system):

1. The old system stored data in `localStorage` under the key `barangay-complaints`
2. This data will NOT automatically migrate to Supabase
3. Users will need to re-submit their complaints after the database is set up
4. Alternatively, you can create a one-time migration script to import the data

## Admin User Setup

Make sure at least one user has admin role:

1. Go to "Authentication" → "Users" in Supabase dashboard
2. Click on a user you want to make admin
3. Scroll to "User Metadata"
4. Add or edit the metadata to include: `{"role": "admin"}`
5. Save changes

## Need Help?

If you encounter any issues:
1. Check the Supabase logs in the dashboard
2. Review the RLS policies in Database → Policies
3. Verify your Supabase connection settings in `/utils/supabase/info.tsx`
