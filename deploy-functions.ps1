#!/usr/bin/env pwsh
# deploy-functions.ps1
# Run from the project root: .\deploy-functions.ps1
# Copies the server code to the expected Supabase CLI folder and deploys.

Write-Host "🚀 Deploying Supabase Edge Functions..." -ForegroundColor Cyan

# Ensure destination folder exists
New-Item -ItemType Directory -Force -Path "supabase\functions\make-server-fc40ab2c" | Out-Null

# Copy latest server code (the CLI needs .ts, not .tsx)
Copy-Item "src\supabase\functions\server\index.tsx" "supabase\functions\make-server-fc40ab2c\index.ts" -Force
Write-Host "✅ Copied server/index.tsx → supabase/functions/make-server-fc40ab2c/index.ts" -ForegroundColor Green

# Deploy
npx supabase functions deploy make-server-fc40ab2c --no-verify-jwt

Write-Host "✅ Done!" -ForegroundColor Green
