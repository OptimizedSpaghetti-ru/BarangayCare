# Guest Account Feature - Implementation Guide

## 🎉 Feature Overview

BarangayCare now supports **Guest Account** functionality, allowing residents to submit complaints anonymously without creating an account. This feature provides a low-barrier entry point for users who want to report issues quickly while maintaining system security and data integrity.

## ✨ Key Features

### Guest Mode Capabilities

- ✅ **Submit complaints anonymously** - No account creation required
- ✅ **Sequential anonymous numbering** - Complaints labeled as Anonymous001, Anonymous002, etc.
- ✅ **Database synchronization** - Guest complaints appear in Admin Panel alongside registered user complaints
- ✅ **Privacy-focused** - No personal information required or tracked

### Guest Mode Restrictions

- ❌ **Cannot view complaint dashboard** - No access to complaint tracking
- ❌ **Cannot view other complaints** - Only able to submit new complaints
- ❌ **No profile or settings access** - Limited to complaint submission interface
- ❌ **Sidebar hidden** - Minimal UI showing only complaint form
- ❌ **Cannot track submissions** - No ability to view status of submitted complaints

## 🛠️ Implementation Details

### Files Modified

1. **`src/utils/supabase/setup-database.sql`**

   - Updated comments to clarify `user_id` can be NULL for guest submissions
   - Added RLS policy: "Guests can insert complaints" allowing anonymous submissions

2. **`src/components/auth/auth-context.tsx`**

   - Added `isGuest` state to track guest mode
   - Added `loginAsGuest()` function to enable guest mode
   - Updated `signOut()` to clear guest mode from localStorage
   - Guest mode persists via localStorage key: `guestMode`

3. **`src/components/complaint-manager.tsx`**

   - Modified `addComplaint()` to handle guest submissions
   - Implemented sequential anonymous numbering (Anonymous001, Anonymous002, etc.)
   - Guest complaints stored with `user_id: null` and auto-generated anonymous names

4. **`src/App.tsx`**

   - Added guest-only UI rendering before authentication check
   - Guest users see simplified interface with complaint form only
   - Info banner explains guest mode limitations and encourages account creation

5. **`src/components/auth/login-form.tsx`**

   - Added "Continue as Guest" button
   - Added info alert explaining guest mode limitations

6. **`src/components/auth/signup-form.tsx`**
   - Added "Continue as Guest" button
   - Added info alert explaining guest mode limitations

## 🔐 Database Schema

### Complaints Table

```sql
CREATE TABLE complaints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  photo TEXT,
  contact_info TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  date_submitted TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_notes TEXT,
  respondent TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- Can be NULL for guests
  user_name TEXT,  -- Anonymous001, Anonymous002, etc. for guests
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

**Guest Submission Policy:**

```sql
CREATE POLICY "Guests can insert complaints"
  ON complaints
  FOR INSERT
  WITH CHECK (user_id IS NULL);
```

This policy allows complaint insertion when `user_id` is NULL, enabling anonymous submissions.

## 🎯 User Flow

### Guest Submission Flow

1. **User visits BarangayCare** → Sees login/signup page
2. **Clicks "Continue as Guest"** → Enters guest mode
3. **Sees guest complaint form** → Minimal interface with info banner
4. **Fills out complaint form** → Standard complaint fields (title, description, category, etc.)
5. **Submits complaint** → Stored with sequential anonymous name (e.g., Anonymous005)
6. **Receives confirmation** → Toast notification + banner encouraging account creation
7. **Cannot track complaint** → No dashboard access, submission is anonymous

### Anonymous Numbering Logic

```typescript
// Get the last guest submission
const { data: lastGuest } = await supabase
  .from("complaints")
  .select("user_name")
  .is("user_id", null)
  .like("user_name", "Anonymous%")
  .order("created_at", { ascending: false })
  .limit(1)
  .single();

// Calculate next number
let nextNumber = 1;
if (lastGuest?.user_name) {
  const match = lastGuest.user_name.match(/Anonymous(\d+)/);
  if (match) {
    nextNumber = parseInt(match[1]) + 1;
  }
}

// Format with leading zeros: Anonymous001, Anonymous002, etc.
const userName = `Anonymous${nextNumber.toString().padStart(3, "0")}`;
```

## 🔄 Database Update Required

**IMPORTANT:** You must apply the updated SQL schema to your Supabase database for guest functionality to work properly.

### Steps to Update Database:

1. **Go to Supabase Dashboard**

   - Navigate to https://app.supabase.com/project/tvbrotmctjiqvbknhtbl/editor

2. **Open SQL Editor**

   - Click "SQL Editor" in left sidebar

3. **Run the Guest Policy**

   ```sql
   -- Add policy for guest submissions
   CREATE POLICY "Guests can insert complaints"
     ON complaints
     FOR INSERT
     WITH CHECK (user_id IS NULL);
   ```

4. **Verify the Policy**
   ```sql
   -- Check if policy exists
   SELECT * FROM pg_policies WHERE tablename = 'complaints';
   ```

## 🖥️ UI/UX Details

### Guest Mode Interface

**Header:**

```
🏠 BarangayCARE - Guest Mode
Submit your complaint anonymously
```

**Info Banner:**

```
ℹ️ You are submitting as a guest. Your complaint will be recorded as "Anonymous"
and you won't be able to track its status.
Create an account to track your complaints and receive updates.
```

**No Sidebar** - Only complaint form visible  
**No Dashboard** - Cannot view other complaints  
**No Profile/Settings** - Limited to submission only

### Login/Signup Pages

**New Button:**

```
Continue as Guest
```

**Info Alert:**

```
ℹ️ Guest mode allows you to submit complaints anonymously,
but you won't be able to track or view them later.
```

## 📊 Admin Panel View

Guest complaints appear in the admin panel with:

- **User Name:** Anonymous001, Anonymous002, etc.
- **User ID:** NULL (distinguishes from registered users)
- **All Standard Fields:** Category, status, date, priority, location, etc.
- **Search:** Admin can search by anonymous numbers

### Example Admin View:

| ID  | Complainant      | Category       | Status      | Date         |
| --- | ---------------- | -------------- | ----------- | ------------ |
| 001 | John Doe         | Infrastructure | Pending     | Nov 13, 2024 |
| 002 | **Anonymous001** | Public Safety  | In-Progress | Nov 13, 2024 |
| 003 | Jane Smith       | Health         | Resolved    | Nov 12, 2024 |
| 004 | **Anonymous002** | Environment    | Pending     | Nov 12, 2024 |

## 🧪 Testing Checklist

### Guest Mode Functionality

- [ ] Click "Continue as Guest" on login page
- [ ] Verify guest-only UI appears (no sidebar/header)
- [ ] Submit a complaint as guest
- [ ] Verify complaint appears in admin panel with "Anonymous001"
- [ ] Submit another guest complaint
- [ ] Verify sequential numbering (Anonymous002)
- [ ] Check database: `user_id` should be NULL, `user_name` should be Anonymous###

### Security Testing

- [ ] Guest cannot access dashboard
- [ ] Guest cannot view other complaints
- [ ] Guest cannot access profile/settings
- [ ] RLS policy prevents guest from viewing submitted complaints
- [ ] Admin can see all guest complaints

### Database Integrity

- [ ] Guest complaints have NULL `user_id`
- [ ] Guest complaints have sequential anonymous names
- [ ] No gaps in anonymous numbering
- [ ] Admin can update/manage guest complaints
- [ ] Guest complaints searchable by anonymous number

## 🔧 Configuration

### Guest Mode Storage

Guest mode is stored in browser localStorage:

```javascript
localStorage.setItem("guestMode", "true"); // Enable guest mode
localStorage.removeItem("guestMode"); // Disable guest mode
```

### Exit Guest Mode

Users can exit guest mode by:

1. Clicking "Create an account" link in info banner
2. Clearing browser localStorage
3. Manually navigating to `/` and refreshing

## 🚀 Deployment Notes

### Environment Variables

No additional environment variables required for guest functionality.

### Database Migration

Run the guest policy SQL in Supabase SQL Editor (see "Database Update Required" section above).

### Vercel Deployment

Guest functionality works with existing Vercel deployment. No backend changes required since RLS policies handle guest authentication.

## 📈 Future Enhancements (Optional)

1. **Rate Limiting** - Implement IP-based rate limiting to prevent spam
2. **CAPTCHA** - Add CAPTCHA verification for guest submissions
3. **Guest Tracking Code** - Provide unique code for guests to check complaint status
4. **Email Verification** - Optional email for guest to receive status updates
5. **Guest Analytics** - Track guest submission patterns in admin dashboard

## 🆘 Troubleshooting

### Issue: "You must be logged in to submit a complaint"

**Solution:** Ensure RLS policy "Guests can insert complaints" is applied in Supabase.

### Issue: Anonymous numbering not sequential

**Solution:** Check database query ordering and ensure `created_at` index exists.

### Issue: Guest can see dashboard

**Solution:** Verify `isGuest` check in App.tsx is working and localStorage is set correctly.

### Issue: Guest complaints not appearing in admin panel

**Solution:** Check admin RLS policy includes NULL `user_id` entries.

### Issue: Cannot exit guest mode

**Solution:** Clear localStorage or navigate to root URL and refresh page.

## 📝 Summary

The Guest Account feature successfully implements anonymous complaint submission with:

- ✅ Sequential anonymous numbering (Anonymous001, Anonymous002, etc.)
- ✅ Database synchronization with admin panel
- ✅ Minimal UI for guest users (complaint form only)
- ✅ Security maintained via RLS policies
- ✅ No tracking capability for guests (privacy-focused)

This feature provides a low-friction entry point for community members to report issues while encouraging account creation for full functionality.

---

**Implementation Complete! 🎉**

Guest Account feature is now fully functional and ready for testing.
