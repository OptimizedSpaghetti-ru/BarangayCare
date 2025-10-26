# Quick Deployment Reference

## 🚀 Quick Start (5 minutes)

### 1. Get Your Supabase Service Role Key

```
1. Go to: https://app.supabase.com/project/tvbrotmctjiqvbknhtbl/settings/api
2. Copy the "service_role" key (NOT the anon key)
3. Keep it safe - you'll need it for Vercel
```

### 2. Deploy to Vercel

```bash
# Option A: Use Vercel Dashboard
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Add environment variables (see below)
4. Click Deploy

# Option B: Use Vercel CLI
npm install -g vercel
vercel login
vercel
```

### 3. Add Environment Variables in Vercel

```
SUPABASE_URL = https://tvbrotmctjiqvbknhtbl.supabase.co
SUPABASE_SERVICE_ROLE_KEY = [Your service role key from step 1]
```

### 4. Configure Admin Email

Update `api/index.ts` line 48:

```typescript
const adminEmails = ["your-email@example.com"];
```

## ✅ Test Your Deployment

### Health Check:

```bash
curl https://your-app.vercel.app/api/health
```

### Test Signup:

```bash
curl -X POST https://your-app.vercel.app/api/make-server-fc40ab2c/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
```

## 📋 Available Endpoints

Base URL: `https://your-app.vercel.app/api/make-server-fc40ab2c`

**Public:**

- `POST /auth/signup` - Create account
- `GET /health` - Check status

**Authenticated:**

- `GET /auth/profile` - Get profile
- `PUT /auth/profile` - Update profile
- `DELETE /auth/profile` - Delete account

**Admin Only:**

- `GET /admin/users` - List all users
- `PUT /admin/users/:userId` - Update user
- `DELETE /admin/users/:userId` - Delete user

## 🔑 Authentication Header

All authenticated endpoints require:

```typescript
headers: {
  'Authorization': 'Bearer YOUR_SUPABASE_ACCESS_TOKEN'
}
```

## 🔧 Common Issues

| Issue                                    | Solution                              |
| ---------------------------------------- | ------------------------------------- |
| "Missing Supabase environment variables" | Add env vars in Vercel and redeploy   |
| "Invalid access token"                   | Check Authorization header format     |
| "Admin access required"                  | Add your email to adminEmails array   |
| CORS errors                              | Domain should be in Supabase settings |

## 📝 Project Structure

```
BarangayCare/
├── api/
│   └── index.ts          # Backend API (Vercel Serverless)
├── src/
│   ├── components/       # React components
│   └── utils/
│       └── supabase/     # Supabase client config
├── dist/                 # Build output (frontend)
├── vercel.json           # Vercel configuration
├── .env.example          # Environment variables template
└── VERCEL_DEPLOYMENT_GUIDE.md  # Detailed guide
```

## 🎯 Next Steps After Deployment

1. [ ] Test all authentication flows
2. [ ] Configure custom domain (optional)
3. [ ] Set up monitoring
4. [ ] Enable Vercel Analytics
5. [ ] Configure CORS in Supabase (add your Vercel domain)
6. [ ] Review and enable Row Level Security (RLS) policies

## 📚 Full Documentation

See `VERCEL_DEPLOYMENT_GUIDE.md` for complete details.

---

**Need Help?** Check the logs:

- Vercel Logs: Dashboard → Your Project → Logs
- Supabase Logs: Dashboard → Your Project → Logs
