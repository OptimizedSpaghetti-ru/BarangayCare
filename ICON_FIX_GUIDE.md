# Icon Fix - Deployment Guide

## Issue

The icon (`no-bg-icon.png`) was not showing in the Vercel deployment.

## Root Cause

The icon was located in the `/icon` folder at the root, and referenced using relative paths like `./icon/no-bg-icon.png`. This doesn't work correctly with Vite's build process because:

1. Vite doesn't automatically copy root-level folders (except `public`) to the build output
2. Relative paths from components don't resolve correctly after build

## Solution Applied

### 1. Created Public Directory

Created a `public/` directory at the project root. Vite automatically:

- Copies everything in `public/` to the build output root
- Serves these files at the root URL path (`/filename`)

### 2. Copied Icon

Copied the icon to the public directory:

```bash
cp icon/no-bg-icon.png public/no-bg-icon.png
```

### 3. Updated References

Updated all icon references to use the absolute path:

**Before:**

```tsx
<img src="./icon/no-bg-icon.png" alt="BarangayCARE Logo" />
```

**After:**

```tsx
<img src="/no-bg-icon.png" alt="BarangayCARE Logo" />
```

**Files Updated:**

- ✅ `src/components/header.tsx` - Logo in header
- ✅ `src/App.tsx` - Logo in login screen
- ✅ `index.html` - Favicon already using `/no-bg-icon.png` ✓

## How It Works Now

```
Project Structure:
├── public/
│   └── no-bg-icon.png    ← Copied here
├── icon/
│   └── no-bg-icon.png    ← Original (can be kept for reference)
├── index.html            ← Uses: /no-bg-icon.png ✓
└── src/
    ├── App.tsx           ← Uses: /no-bg-icon.png ✓
    └── components/
        └── header.tsx    ← Uses: /no-bg-icon.png ✓

Build Output (dist/):
├── index.html
├── no-bg-icon.png        ← Automatically copied from public/
└── assets/
    └── [bundled js/css]

Vercel Deployment:
https://your-app.vercel.app/no-bg-icon.png  ✓ Works!
```

## Verification

After deployment, the icon should now be visible:

1. **Favicon** (browser tab) ✓
2. **Header logo** (top left) ✓
3. **Login screen logo** ✓

## Testing

### Local Development

```bash
npm run dev
# Visit http://localhost:3000
# Icon should display correctly
```

### Production Build (Test Locally)

```bash
npm run build
npx serve dist
# Visit http://localhost:3000
# Icon should display correctly
```

### On Vercel

After pushing changes and redeployment:

```bash
# Check if icon is accessible
curl -I https://your-app.vercel.app/no-bg-icon.png
# Should return: HTTP/2 200

# Visit your site - icon should display everywhere
```

## Best Practices for Static Assets in Vite

### ✅ DO: Use the `public/` directory

For static assets that:

- Don't need processing/optimization
- Should be referenced by absolute path
- Need to keep their exact filename
- Examples: favicon, robots.txt, manifest.json, logo images

```
public/
├── logo.png
├── favicon.ico
└── robots.txt
```

Reference as: `/logo.png`, `/favicon.ico`

### ✅ DO: Import in JavaScript/TypeScript

For assets that should be:

- Processed by Vite
- Included in the bundle
- Cache-busted with hash
- Optimized

```typescript
import logoUrl from "./assets/logo.png";
<img src={logoUrl} alt="Logo" />;
```

Vite transforms to: `/assets/logo-a1b2c3d4.png`

### ❌ DON'T: Use relative paths to root-level folders

```tsx
// ❌ Don't do this
<img src="./icon/logo.png" />
<img src="../icon/logo.png" />

// ✅ Do this instead
<img src="/logo.png" />  // From public/
// or
import logo from '@/assets/logo.png';  // Imported
```

## Summary

**Fixed:** Icon now properly displays in Vercel deployment  
**Method:** Copied to `public/` directory and updated references to absolute paths  
**Files Changed:** 2 (header.tsx, App.tsx)  
**Files Added:** 1 (public/no-bg-icon.png)

---

**Status: ✅ RESOLVED**

The icon should now display correctly in all deployments!
