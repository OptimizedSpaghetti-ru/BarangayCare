# BarangayCare Vercel Deployment Checklist

## Pre-Deployment Checklist

### ✅ Step 1: Verify Files

- [ ] `api/index.ts` exists
- [ ] `vercel.json` is updated with API routing
- [ ] `.env.example` exists (for reference)
- [ ] `.gitignore` includes `.env` files
- [ ] `src/utils/api-config.ts` exists

### ✅ Step 2: Get Supabase Credentials

- [ ] Login to Supabase: https://app.supabase.com
- [ ] Navigate to: Project → Settings → API
- [ ] Copy **Project URL**: `https://tvbrotmctjiqvbknhtbl.supabase.co`
- [ ] Copy **service_role key** (NOT anon key!)
- [ ] ⚠️ Keep service_role key SECRET!

### ✅ Step 3: Configure Admin Access

- [ ] Open `api/index.ts`
- [ ] Find line 48: `const adminEmails = [...]`
- [ ] Add your email address
- [ ] Save the file
- [ ] Commit changes (if using Git)

## Deployment Steps

### ✅ Option A: Deploy via Vercel Dashboard (Recommended)

1. **Login to Vercel**

   - [ ] Go to https://vercel.com
   - [ ] Sign in or create account
   - [ ] Connect your GitHub/GitLab/Bitbucket account

2. **Import Project**

   - [ ] Click "Add New..." → "Project"
   - [ ] Select your BarangayCare repository
   - [ ] Click "Import"

3. **Configure Build Settings**

   - [ ] Framework Preset: **Vite** (should auto-detect)
   - [ ] Build Command: `npm run build`
   - [ ] Output Directory: `dist`
   - [ ] Install Command: `npm install`
   - [ ] Leave Root Directory as `.`

4. **Add Environment Variables**

   - [ ] Click "Environment Variables"
   - [ ] Add `SUPABASE_URL`:
     ```
     https://tvbrotmctjiqvbknhtbl.supabase.co
     ```
   - [ ] Add `SUPABASE_SERVICE_ROLE_KEY`:
     ```
     [Paste your service_role key here]
     ```
   - [ ] Select environments: ✅ Production ✅ Preview ✅ Development
   - [ ] Click "Add" for each variable

5. **Deploy**
   - [ ] Click "Deploy"
   - [ ] Wait for deployment to complete (2-5 minutes)
   - [ ] Copy your deployment URL (e.g., `https://your-app.vercel.app`)

### ✅ Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**

   ```bash
   npm install -g vercel
   ```

   - [ ] CLI installed successfully

2. **Login**

   ```bash
   vercel login
   ```

   - [ ] Logged in successfully

3. **Deploy**

   ```bash
   vercel
   ```

   - [ ] Follow prompts to link project
   - [ ] Deployment successful

4. **Add Environment Variables**

   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   ```

   - [ ] Variables added for Production
   - [ ] Variables added for Preview
   - [ ] Variables added for Development

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```
   - [ ] Production deployment successful

## Post-Deployment Testing

### ✅ Step 1: Test Health Endpoint

```bash
curl https://your-app.vercel.app/api/health
```

**Expected Response:**

```json
{ "status": "ok", "message": "BarangayCare API is running" }
```

- [ ] Health check successful
- [ ] Returns correct JSON response

### ✅ Step 2: Test Signup Endpoint

```bash
curl -X POST https://your-app.vercel.app/api/make-server-fc40ab2c/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

**Expected Response:**

```json
{
  "message": "User created successfully",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

- [ ] Signup successful
- [ ] User created in Supabase
- [ ] Check Supabase dashboard → Authentication → Users

### ✅ Step 3: Test Frontend

1. **Open Your App**

   - [ ] Visit `https://your-app.vercel.app`
   - [ ] Page loads successfully

2. **Test Authentication**

   - [ ] Click "Sign Up" (if available)
   - [ ] Try to create a new account
   - [ ] Check for any console errors (F12 → Console)
   - [ ] Verify signup works or check errors

3. **Test Login** (if you have existing users)

   - [ ] Try to login with test credentials
   - [ ] Verify login successful
   - [ ] Check user profile loads

4. **Test Admin Panel** (if applicable)
   - [ ] Login with admin email
   - [ ] Access admin panel
   - [ ] Verify you can see user list
   - [ ] Test admin functions

## Configuration Updates

### ✅ Update Supabase Settings

1. **Add CORS Origin**

   - [ ] Go to Supabase Dashboard
   - [ ] Settings → API → CORS
   - [ ] Add: `https://your-app.vercel.app`
   - [ ] Save changes

2. **Verify Database Tables**
   - [ ] Table `users` exists
   - [ ] Columns: `id`, `email`, `name`, `phone_number`, `is_active`, `created_at`, `updated_at`
   - [ ] Row Level Security (RLS) enabled (optional but recommended)

### ✅ Update Frontend Code (Optional)

If you want to use the new API helper functions:

1. **Update auth-context.tsx**

   - [ ] Import `apiRequest` from `@/utils/api-config`
   - [ ] Replace hardcoded URLs with helper functions
   - [ ] Test authentication flow

2. **Update user-management.tsx**
   - [ ] Import `apiRequest` from `@/utils/api-config`
   - [ ] Replace hardcoded URLs with helper functions
   - [ ] Test admin functionality

**See `API_MIGRATION_GUIDE.md` for detailed instructions**

## Troubleshooting Checklist

### ❌ Deployment Failed

- [ ] Check Vercel build logs for errors
- [ ] Verify `package.json` has correct dependencies
- [ ] Ensure `vercel.json` is valid JSON
- [ ] Try deploying again

### ❌ API Returns 500 Error

- [ ] Check Vercel function logs
- [ ] Verify environment variables are set correctly
- [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` is the service_role key (not anon)
- [ ] Check Supabase is accessible

### ❌ "Missing Supabase environment variables"

- [ ] Go to Vercel project settings
- [ ] Environment Variables section
- [ ] Verify both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` exist
- [ ] Redeploy: Deployments → Three dots → "Redeploy"

### ❌ CORS Errors

- [ ] Add Vercel domain to Supabase CORS settings
- [ ] Clear browser cache
- [ ] Check browser console for exact error
- [ ] Verify `api/index.ts` has CORS middleware enabled

### ❌ "Admin access required" Error

- [ ] Verify your email is in `adminEmails` array in `api/index.ts`
- [ ] Email must match exactly (case-sensitive)
- [ ] Redeploy after updating `api/index.ts`
- [ ] Clear browser cache and try again

### ❌ Frontend Can't Reach API

- [ ] Check Network tab in browser dev tools
- [ ] Verify API URLs use `/api/` prefix
- [ ] Test `/api/health` endpoint directly
- [ ] Check `vercel.json` has correct routing

## Final Verification

### ✅ Everything Works

- [ ] Health endpoint returns OK
- [ ] User signup works
- [ ] User login works
- [ ] Profile loading works
- [ ] Admin panel accessible (if admin)
- [ ] No console errors
- [ ] No CORS errors
- [ ] Database updates properly

### ✅ Security Check

- [ ] Service role key NOT in frontend code
- [ ] Service role key NOT in Git repository
- [ ] Environment variables set in Vercel only
- [ ] `.env` files in `.gitignore`
- [ ] HTTPS enabled (automatic with Vercel)

### ✅ Performance Check

- [ ] Frontend loads quickly
- [ ] API responds in < 1 second
- [ ] No timeout errors
- [ ] Check Vercel Analytics (if enabled)

## Next Steps After Successful Deployment

### Immediate

- [ ] Share deployment URL with team
- [ ] Test all features thoroughly
- [ ] Monitor Vercel logs for errors
- [ ] Document any custom configurations

### Short Term (This Week)

- [ ] Set up custom domain (optional)
- [ ] Enable Vercel Analytics
- [ ] Review and optimize RLS policies
- [ ] Add more admin emails if needed
- [ ] Update frontend to use API helpers

### Long Term (This Month)

- [ ] Set up automated backups
- [ ] Implement monitoring/alerts
- [ ] Add rate limiting (if needed)
- [ ] Review security audit
- [ ] Plan for scaling

## Resources

- **Deployment Guide**: `VERCEL_DEPLOYMENT_GUIDE.md`
- **Quick Deploy**: `QUICK_DEPLOY.md`
- **Migration Guide**: `API_MIGRATION_GUIDE.md`
- **Backend Setup**: `BACKEND_SETUP_README.md`

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Support**: Check Vercel Dashboard → Support

---

## ✨ Congratulations!

Once all items are checked, your BarangayCare system is fully deployed with:

- ✅ Frontend (Static)
- ✅ Backend API (Serverless)
- ✅ Database (Supabase)
- ✅ Authentication (Supabase Auth)
- ✅ Admin Panel

**Your deployment is complete! 🎉**

**Deployment URL**: **************\_\_\_\_**************

**Deployed on**: **************\_\_\_\_**************

**Deployed by**: **************\_\_\_\_**************
