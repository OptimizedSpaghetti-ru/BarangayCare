# BarangayCare - Vercel Backend Setup Summary

## 🎉 What's New?

Your BarangayCare system now has a **fully functional backend** that can be hosted on Vercel alongside your frontend!

## 📁 New Files Created

### Backend API

- **`api/index.ts`** - Main backend server with all authentication and admin endpoints
  - User signup, login, profile management
  - Admin user management
  - Built with Hono framework for Vercel Edge Runtime

### Configuration Files

- **`vercel.json`** - Updated with API routing configuration
- **`.env.example`** - Template for environment variables
- **`.gitignore`** - Protects sensitive files from being committed
- **`src/vite-env.d.ts`** - TypeScript definitions for Vite environment variables

### Utility Files

- **`src/utils/api-config.ts`** - Smart API configuration utility
  - Automatically detects production vs development
  - Helper functions for making API requests
  - Type-safe endpoint constants

### Documentation

- **`VERCEL_DEPLOYMENT_GUIDE.md`** - Complete deployment guide
- **`QUICK_DEPLOY.md`** - 5-minute quick start guide
- **`API_MIGRATION_GUIDE.md`** - How to update existing code to use new API

## 🚀 How to Deploy

### Quick Deploy (5 minutes)

1. **Get Supabase Service Role Key**

   - Go to https://app.supabase.com/project/tvbrotmctjiqvbknhtbl/settings/api
   - Copy the `service_role` key (NOT the anon key)

2. **Deploy to Vercel**

   - Go to https://vercel.com/new
   - Import your repository
   - Add environment variables:
     ```
     SUPABASE_URL = https://tvbrotmctjiqvbknhtbl.supabase.co
     SUPABASE_SERVICE_ROLE_KEY = [Your service role key]
     ```
   - Click "Deploy"

3. **Configure Admin Access**

   - Edit `api/index.ts` line 48
   - Add your admin email to the array:
     ```typescript
     const adminEmails = ["your-email@example.com"];
     ```
   - Commit and push (Vercel auto-redeploys)

4. **Test Your Deployment**
   ```bash
   curl https://your-app.vercel.app/api/health
   ```

**📖 See `QUICK_DEPLOY.md` for detailed steps!**

## 🔌 API Endpoints

All endpoints are available at: `https://your-app.vercel.app/api/make-server-fc40ab2c`

### Public Endpoints

- `GET /api/health` - Health check (no auth required)
- `POST /api/make-server-fc40ab2c/auth/signup` - User registration

### Authenticated Endpoints (Requires Bearer Token)

- `GET /api/make-server-fc40ab2c/auth/profile` - Get user profile
- `PUT /api/make-server-fc40ab2c/auth/profile` - Update profile
- `DELETE /api/make-server-fc40ab2c/auth/profile` - Delete account

### Admin Endpoints (Requires Admin Email)

- `GET /api/make-server-fc40ab2c/admin/users` - List all users
- `PUT /api/make-server-fc40ab2c/admin/users/:userId` - Update user
- `DELETE /api/make-server-fc40ab2c/admin/users/:userId` - Delete user

## 🔧 Frontend Integration

### Option 1: Use the Helper Functions (Recommended)

```typescript
import { apiRequest, API_ENDPOINTS } from "@/utils/api-config";

// Signup
const userData = await apiRequest(API_ENDPOINTS.AUTH.SIGNUP, {
  method: "POST",
  body: JSON.stringify({ email, password, name }),
});

// Get profile (with auth)
const profile = await apiRequest(
  API_ENDPOINTS.AUTH.PROFILE,
  { method: "GET" },
  accessToken // From Supabase session
);
```

### Option 2: Manual Fetch

```typescript
import { getApiUrl } from "@/utils/api-config";

const response = await fetch(getApiUrl("/auth/signup"), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email, password, name }),
});
```

**📖 See `API_MIGRATION_GUIDE.md` to update existing components!**

## 🏗️ Project Structure

```
BarangayCare/
├── api/                          # 🆕 Backend API
│   └── index.ts                  # Vercel serverless function
├── src/
│   ├── components/               # React components
│   │   └── auth/                 # Authentication components
│   ├── utils/
│   │   ├── api-config.ts         # 🆕 API configuration utility
│   │   └── supabase/
│   │       ├── client.tsx        # Supabase client
│   │       └── info.tsx          # Supabase credentials
│   └── vite-env.d.ts             # 🆕 TypeScript definitions
├── vercel.json                   # ✏️ Updated with API routing
├── .env.example                  # 🆕 Environment template
├── .gitignore                    # 🆕 Git ignore rules
├── VERCEL_DEPLOYMENT_GUIDE.md    # 🆕 Full deployment guide
├── QUICK_DEPLOY.md               # 🆕 Quick reference
└── API_MIGRATION_GUIDE.md        # 🆕 Migration instructions
```

## 🔐 Security Features

✅ **Service Role Key** - Kept secret on server-side only  
✅ **JWT Authentication** - All endpoints verify Supabase tokens  
✅ **Admin Authorization** - Email-based admin access control  
✅ **CORS Enabled** - Configured for all origins (can be restricted)  
✅ **Environment Variables** - Sensitive data never in code  
✅ **HTTPS Only** - Vercel provides SSL by default

## ⚡ Performance Benefits

- **Edge Runtime** - Deployed globally, low latency
- **No Cold Starts** - Vercel Edge Functions are always warm
- **Automatic Scaling** - Handles traffic spikes automatically
- **Fast Builds** - Optimized build process
- **CDN Distribution** - Static assets served from CDN

## 📊 Monitoring & Debugging

### View Logs in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Click "Logs" in sidebar
4. Filter by endpoint, status, or time

### Test Endpoints Locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Test health endpoint (if running locally with backend)
curl http://localhost:3000/api/health
```

## 🆘 Common Issues & Solutions

| Issue                                    | Solution                                                 |
| ---------------------------------------- | -------------------------------------------------------- |
| API returns 500 error                    | Check Vercel logs, verify environment variables          |
| "Missing Supabase environment variables" | Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel |
| CORS errors                              | Add your domain to Supabase CORS settings                |
| "Admin access required"                  | Add email to adminEmails array in api/index.ts           |
| Frontend can't reach API                 | Check vercel.json routing, ensure /api path is correct   |

## 📚 Documentation Links

- **Deployment Guide**: `VERCEL_DEPLOYMENT_GUIDE.md` - Complete deployment instructions
- **Quick Start**: `QUICK_DEPLOY.md` - 5-minute deployment checklist
- **Migration Guide**: `API_MIGRATION_GUIDE.md` - Update existing code
- **Database Setup**: `src/utils/supabase/DATABASE_SETUP_GUIDE.md` - Supabase setup

## 🎯 Next Steps

### Immediate (Required for functionality):

1. [ ] Deploy to Vercel
2. [ ] Add environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
3. [ ] Configure admin email in `api/index.ts`
4. [ ] Test all endpoints

### Optional (Recommended):

1. [ ] Update frontend components to use `api-config.ts` helpers
2. [ ] Set up custom domain in Vercel
3. [ ] Enable Vercel Analytics
4. [ ] Configure monitoring and alerts
5. [ ] Review and update Row Level Security (RLS) policies in Supabase
6. [ ] Add your Vercel domain to Supabase CORS settings

### Advanced (Nice to have):

1. [ ] Set up CI/CD pipeline
2. [ ] Add rate limiting
3. [ ] Implement request logging
4. [ ] Add more comprehensive error handling
5. [ ] Set up automated testing

## 💡 Tips

- **Keep Service Role Key Secret**: Never commit it to Git or expose it to frontend
- **Test Locally First**: Use `npm run dev` to test before deploying
- **Check Logs Often**: Vercel logs show detailed error messages
- **Use Helper Functions**: `apiRequest()` handles auth headers automatically
- **Monitor Usage**: Check Vercel dashboard for usage and performance metrics

## 🤝 Need Help?

1. Check the documentation files (especially `VERCEL_DEPLOYMENT_GUIDE.md`)
2. Review Vercel deployment logs
3. Test `/api/health` endpoint first
4. Verify all environment variables are set correctly
5. Check Supabase logs for database issues

---

**Your BarangayCare system is now ready for full-stack deployment on Vercel! 🎉**

Follow the `QUICK_DEPLOY.md` guide to get started in just 5 minutes.
