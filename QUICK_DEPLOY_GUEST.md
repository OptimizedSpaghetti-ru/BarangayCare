# Guest Account - Quick Deploy Guide

## ✅ Implementation Complete!

The Guest Account feature has been successfully implemented. Follow these steps to deploy:

## 📋 Pre-Deployment Checklist

- [x] Database schema updated to support NULL user_id
- [x] RLS policy created for guest submissions
- [x] Guest mode added to AuthContext
- [x] Login form updated with "Continue as Guest" button
- [x] Signup form updated with "Continue as Guest" button
- [x] Complaint submission logic handles guest users
- [x] App.tsx shows guest-only UI
- [x] Sequential anonymous numbering implemented (Anonymous001, Anonymous002, etc.)

## 🚀 Deployment Steps

### 1. Update Supabase Database (REQUIRED)

Run this SQL in your Supabase SQL Editor:

```sql
-- Add RLS policy for guest submissions
CREATE POLICY "Guests can insert complaints"
  ON complaints
  FOR INSERT
  WITH CHECK (user_id IS NULL);
```

**Where to run:**

- Go to: https://app.supabase.com/project/tvbrotmctjiqvbknhtbl/editor
- Click "SQL Editor" in left sidebar
- Paste the SQL above
- Click "Run"

### 2. Deploy to Vercel

```bash
# Commit changes
git add .
git commit -m "feat: Add guest account functionality with anonymous submissions"
git push

# Vercel will auto-deploy (if connected)
# Or manually deploy: vercel --prod
```

### 3. Test Guest Functionality

1. Visit your deployed site
2. Click "Continue as Guest" on login or signup page
3. Fill out and submit a complaint
4. Login as admin to verify complaint appears as "Anonymous001"
5. Submit another guest complaint to verify sequential numbering ("Anonymous002")

## 🎯 What Users Will See

### Guest Mode Interface

- **No sidebar** - Only complaint submission form visible
- **Info banner** - Explains guest limitations and encourages account creation
- **Simplified header** - Shows "BarangayCare - Guest Mode"
- **Post-submission** - Success toast with encouragement to create account

### Admin View

- Guest complaints show as "Anonymous001", "Anonymous002", etc.
- Fully searchable and manageable like regular complaints
- Clear distinction from registered user complaints

## 📝 Key Features Implemented

✅ **Anonymous Submissions** - No account required  
✅ **Sequential Numbering** - Anonymous001, Anonymous002, Anonymous003...  
✅ **Database Sync** - Guest complaints in same table as regular complaints  
✅ **Privacy Focused** - No tracking or viewing capability for guests  
✅ **Security Maintained** - RLS policies enforce proper access control  
✅ **Admin Integration** - Seamless management in existing admin panel

## 🔍 Files Modified

1. `src/utils/supabase/setup-database.sql` - Added guest RLS policy
2. `src/components/auth/auth-context.tsx` - Guest mode state & functions
3. `src/components/complaint-manager.tsx` - Guest submission handling
4. `src/App.tsx` - Guest UI rendering
5. `src/components/auth/login-form.tsx` - "Continue as Guest" button
6. `src/components/auth/signup-form.tsx` - "Continue as Guest" button

## 📚 Documentation

- **`GUEST_ACCOUNT_GUIDE.md`** - Complete implementation guide
- **`QUICK_DEPLOY_GUEST.md`** - This quick reference

## ⚠️ Important Notes

- Guest mode uses browser localStorage to persist state
- Guest submissions have `user_id: NULL` in database
- RLS policy MUST be applied in Supabase for guests to submit
- Guests cannot view dashboard or track their submissions

## 🧪 Testing Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🆘 Troubleshooting

**Problem:** "You must be logged in to submit a complaint"  
**Solution:** Apply the RLS policy in Supabase SQL Editor

**Problem:** Guest mode not activating  
**Solution:** Check browser console for errors, clear localStorage and try again

**Problem:** Anonymous numbers not sequential  
**Solution:** Check database ordering in complaint-manager.tsx addComplaint function

---

## ✨ Success!

Your BarangayCare system now supports Guest Account functionality!

Users can submit complaints anonymously while admins maintain full visibility and control.
