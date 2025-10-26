# API Migration Guide - Supabase Functions to Vercel

## Overview

This guide helps you migrate from using Supabase Edge Functions URLs to the new Vercel-hosted API.

## What Changed?

### Old Way (Supabase Functions):

```typescript
const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-fc40ab2c`;
```

### New Way (Vercel API):

```typescript
import { getApiUrl } from "@/utils/api-config";
const serverUrl = getApiUrl("/auth/signup");
```

## Benefits of the New Approach

1. ✅ **Automatic Environment Detection** - Works in development and production
2. ✅ **Faster Response Times** - No cold starts with Vercel Edge Runtime
3. ✅ **Better Scaling** - Vercel handles global distribution automatically
4. ✅ **Simpler Configuration** - No need to construct URLs manually
5. ✅ **Type-Safe Endpoints** - Use `API_ENDPOINTS` constant for compile-time checking

## Step-by-Step Migration

### Step 1: Update auth-context.tsx

**Before:**

```typescript
const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-fc40ab2c`;

const response = await fetch(`${serverUrl}/auth/signup`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email, password, name, phoneNumber }),
});
```

**After:**

```typescript
import { apiRequest, API_ENDPOINTS } from "@/utils/api-config";

// Option 1: Use the helper function (recommended)
const data = await apiRequest(API_ENDPOINTS.AUTH.SIGNUP, {
  method: "POST",
  body: JSON.stringify({ email, password, name, phoneNumber }),
});

// Option 2: Manual fetch with getApiUrl
import { getApiUrl } from "@/utils/api-config";
const response = await fetch(getApiUrl("/auth/signup"), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email, password, name, phoneNumber }),
});
```

### Step 2: Update user-management.tsx

**Before:**

```typescript
const serverUrl = `https://${
  supabase.supabaseUrl.split("//")[1].split(".")[0]
}.supabase.co/functions/v1/make-server-fc40ab2c`;

const response = await fetch(`${serverUrl}/admin/users`, {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});
```

**After:**

```typescript
import { apiRequest, API_ENDPOINTS } from "@/utils/api-config";

// Using the helper (automatically handles auth token)
const data = await apiRequest(
  API_ENDPOINTS.ADMIN.USERS,
  { method: "GET" },
  session.access_token
);
```

### Step 3: Update All Other API Calls

Search for these patterns and replace them:

**Pattern 1: URL Construction**

```typescript
// Find:
const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-fc40ab2c`;

// Replace with import:
import { getApiUrl } from "@/utils/api-config";
```

**Pattern 2: Endpoint Calls**

```typescript
// Find:
fetch(`${serverUrl}/auth/profile`, ...)

// Replace with:
import { getApiUrl } from '@/utils/api-config';
fetch(getApiUrl('/auth/profile'), ...)

// Or even better:
import { apiRequest, API_ENDPOINTS } from '@/utils/api-config';
apiRequest(API_ENDPOINTS.AUTH.PROFILE, ..., accessToken)
```

## Complete Example: Profile Component

**Before:**

```typescript
import { supabase } from "@/utils/supabase/client";
import { projectId } from "@/utils/supabase/info";

export function ProfileComponent() {
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-fc40ab2c`;

  const loadProfile = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch(`${serverUrl}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load profile");
    }

    const data = await response.json();
    return data.profile;
  };

  // ... rest of component
}
```

**After:**

```typescript
import { supabase } from "@/utils/supabase/client";
import { apiRequest, API_ENDPOINTS } from "@/utils/api-config";

export function ProfileComponent() {
  const loadProfile = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const data = await apiRequest(
        API_ENDPOINTS.AUTH.PROFILE,
        { method: "GET" },
        session.access_token
      );
      return data.profile;
    } catch (error) {
      console.error("Failed to load profile:", error);
      throw error;
    }
  };

  // ... rest of component
}
```

## Available API Endpoints

All endpoints from `api-config.ts`:

```typescript
import { API_ENDPOINTS } from "@/utils/api-config";

// Health check
API_ENDPOINTS.HEALTH; // '/health'

// Authentication
API_ENDPOINTS.AUTH.SIGNUP; // '/auth/signup'
API_ENDPOINTS.AUTH.PROFILE; // '/auth/profile'

// Admin (requires admin access)
API_ENDPOINTS.ADMIN.USERS; // '/admin/users'
API_ENDPOINTS.ADMIN.USER_BY_ID("user-123"); // '/admin/users/user-123'
```

## Testing Your Migration

### 1. Test Locally (Development)

```bash
# Make sure dependencies are installed
npm install

# Start the dev server
npm run dev

# Test in browser - all API calls should work
```

### 2. Test on Vercel (Production)

```bash
# Deploy to Vercel
vercel --prod

# Test the API health endpoint
curl https://your-app.vercel.app/api/health

# Should return:
{"status":"ok","message":"BarangayCare API is running"}
```

### 3. Test Authentication Flow

1. Open your app in browser
2. Try to sign up a new user
3. Check browser Network tab - should see calls to `/api/make-server-fc40ab2c/...`
4. Verify no errors in console

## Troubleshooting

### Issue: "Failed to fetch" or Network Error

**Cause**: API might not be deployed or environment variables missing
**Solution**:

1. Check Vercel deployment status
2. Verify environment variables are set in Vercel
3. Check browser console for exact error

### Issue: CORS Error

**Cause**: CORS configuration might need adjustment
**Solution**: The API already has CORS enabled for all origins, but if issues persist:

1. Check Network tab for the exact error
2. Verify your domain is whitelisted in Supabase settings

### Issue: "Invalid access token"

**Cause**: Token not being passed correctly
**Solution**: Make sure you're using `apiRequest` with the access token:

```typescript
apiRequest(endpoint, options, session.access_token);
```

## Rollback Plan

If you need to rollback to Supabase Functions:

1. Revert your code changes
2. Redeploy the Supabase Edge Function
3. Use the old URL pattern:

```typescript
const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-fc40ab2c`;
```

Note: The `api-config.ts` utility also exports `getSupabaseFunctionUrl()` for backward compatibility.

## Files to Update

Search for these patterns in your codebase:

```bash
# Find all files using the old pattern
grep -r "supabase.co/functions/v1" src/

# Common files that need updates:
# - src/components/auth/auth-context.tsx
# - src/components/auth/user-management.tsx
# - src/components/auth/profile-management.tsx
# - Any other components making API calls
```

## Need Help?

If you encounter issues during migration:

1. Check the browser console for errors
2. Review Vercel deployment logs
3. Verify environment variables are set
4. Test the `/api/health` endpoint first
5. Refer to `VERCEL_DEPLOYMENT_GUIDE.md` for detailed deployment info

---

**Tip**: Migrate one component at a time and test thoroughly before moving to the next one!
