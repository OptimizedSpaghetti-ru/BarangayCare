# Vercel Backend Deployment Guide for BarangayCare

## Overview

This guide will help you deploy both the frontend and backend of your BarangayCare system on Vercel with full account and database functionality.

## Prerequisites

- A Vercel account (sign up at https://vercel.com)
- Your Supabase project credentials
- Git repository with your code

## Step 1: Prepare Your Environment Variables

You need to set up the following environment variables in Vercel:

### Required Environment Variables:

1. **SUPABASE_URL** - Your Supabase project URL
   - Format: `https://tvbrotmctjiqvbknhtbl.supabase.co`
2. **SUPABASE_SERVICE_ROLE_KEY** - Your Supabase Service Role Key (IMPORTANT: Keep this secret!)
   - You can find this in your Supabase project settings under API
   - This is NOT the anon key - it's the service_role key

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended for first-time)

1. Go to https://vercel.com/new
2. Import your Git repository (GitHub, GitLab, or Bitbucket)
3. Configure the project:

   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. Add Environment Variables:

   - Click on "Environment Variables"
   - Add each variable from Step 1
   - Make sure to add them for **Production**, **Preview**, and **Development** environments

5. Click "Deploy"

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (this will prompt you for configuration)
vercel

# Add environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Deploy to production
vercel --prod
```

## Step 3: Configure Your Supabase Project

### 1. Get Your Service Role Key:

- Go to your Supabase project dashboard
- Navigate to Settings → API
- Copy the `service_role` key (NOT the `anon` key)
- This key should be kept SECRET and only used server-side

### 2. Update CORS Settings (if needed):

- In Supabase Dashboard, go to Settings → API
- Under "CORS Allowed Origins", add your Vercel domain
- Example: `https://your-app.vercel.app`

## Step 4: Verify Your Deployment

After deployment, test these endpoints:

1. **Health Check**:

   ```bash
   curl https://your-app.vercel.app/api/health
   ```

   Should return: `{"status":"ok","message":"BarangayCare API is running"}`

2. **Test Signup** (replace with your domain):
   ```bash
   curl -X POST https://your-app.vercel.app/api/make-server-fc40ab2c/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "securepassword123",
       "name": "Test User",
       "phoneNumber": "09123456789"
     }'
   ```

## Step 5: Update Frontend API Base URL

If your frontend is making API calls to a hardcoded URL, you may need to update it to use your Vercel domain.

### Create an environment variable for the API URL:

1. In your Vercel project settings, add:

   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-app.vercel.app/api`

2. In your code, reference it as:
   ```typescript
   const API_URL = import.meta.env.VITE_API_URL || "/api";
   ```

## Step 6: Configure Admin Users

Update the admin email addresses in your deployment:

The backend checks for admin access using hardcoded email addresses. To add your admin email:

1. Go to `api/index.ts` line 48
2. Update the `adminEmails` array:
   ```typescript
   const adminEmails = ["your-admin@email.com", "another-admin@email.com"];
   ```
3. Commit and push the changes
4. Vercel will automatically redeploy

## API Endpoints Available

All endpoints are prefixed with `/api/make-server-fc40ab2c`:

### Authentication Endpoints:

- `POST /api/make-server-fc40ab2c/auth/signup` - User registration
- `GET /api/make-server-fc40ab2c/auth/profile` - Get user profile
- `PUT /api/make-server-fc40ab2c/auth/profile` - Update user profile
- `DELETE /api/make-server-fc40ab2c/auth/profile` - Delete user account

### Admin Endpoints:

- `GET /api/make-server-fc40ab2c/admin/users` - Get all users (admin only)
- `PUT /api/make-server-fc40ab2c/admin/users/:userId` - Update user status (admin only)
- `DELETE /api/make-server-fc40ab2c/admin/users/:userId` - Delete user (admin only)

### Utility Endpoints:

- `GET /api/health` - Health check

## Troubleshooting

### Issue: API returns "Missing Supabase environment variables"

**Solution**: Make sure you've added `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel's environment variables and redeployed.

### Issue: "Invalid access token" errors

**Solution**: Ensure your frontend is properly passing the Supabase access token in the Authorization header:

```typescript
headers: {
  'Authorization': `Bearer ${accessToken}`
}
```

### Issue: CORS errors

**Solution**:

1. Check that your Vercel domain is added to Supabase CORS settings
2. The backend already has CORS enabled for all origins (`origin: "*"`)

### Issue: Functions are slow or timing out

**Solution**: Vercel Edge Functions have a timeout limit. If you're experiencing timeouts:

1. Optimize database queries
2. Add indexes to frequently queried columns in Supabase
3. Consider upgrading your Vercel plan for higher limits

### Issue: "Admin access required" but you are an admin

**Solution**:

1. Check that your email is listed in the `adminEmails` array in `api/index.ts`
2. Make sure the email matches exactly (case-sensitive)
3. Redeploy after making changes

## Security Best Practices

1. **Never commit your Service Role Key** to Git
2. **Use environment variables** for all sensitive data
3. **Regularly rotate** your Supabase keys
4. **Enable Row Level Security (RLS)** on your Supabase tables
5. **Monitor your logs** in Vercel dashboard for suspicious activity
6. **Limit admin access** to only necessary email addresses

## Monitoring and Logs

### View Deployment Logs:

1. Go to your Vercel project dashboard
2. Click on "Deployments"
3. Select a deployment to view its logs

### View Runtime Logs:

1. Go to your project in Vercel
2. Click on "Logs" in the sidebar
3. You can filter by endpoint, status code, or time range

## Next Steps

After successful deployment:

1. ✅ Test all authentication flows
2. ✅ Test admin functionality
3. ✅ Set up monitoring and alerts
4. ✅ Configure custom domain (optional)
5. ✅ Set up CI/CD for automatic deployments
6. ✅ Enable Vercel Analytics for usage insights

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Hono Documentation](https://hono.dev)

## Support

If you encounter any issues:

1. Check the Vercel deployment logs
2. Check the Supabase logs in your project dashboard
3. Review this guide's troubleshooting section
4. Check that all environment variables are correctly set

---

**Important Notes:**

- The backend uses Edge Runtime for fast, global performance
- All endpoints require proper authentication (except signup and health check)
- Admin endpoints require the user's email to be in the admin list
- The service role key gives full access to your Supabase project - keep it secure!
