# Address Verification Setup Guide

This guide explains how to set up the address verification feature for BarangayCare.

## Overview

The address verification feature requires users to upload a valid government or barangay-issued ID during registration. The ID must show that the user's address is **Barangay NBBS, Navotas**.

## Database Setup

Run the migration script to add the required columns to the `users` table:

```sql
-- Run this in your Supabase SQL Editor
ALTER TABLE users
ADD COLUMN IF NOT EXISTS address_verification_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS id_document_url TEXT,
ADD COLUMN IF NOT EXISTS id_document_path TEXT,
ADD COLUMN IF NOT EXISTS required_barangay VARCHAR(255) DEFAULT 'Barangay NBBS, Navotas',
ADD COLUMN IF NOT EXISTS address_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS address_rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(address_verification_status);
```

## Storage Bucket Setup

1. Go to your Supabase Dashboard
2. Navigate to **Storage** section
3. Click **New Bucket**
4. Create a bucket named `verification_ids`
5. Set the bucket to **Private** (uncheck "Public bucket")

### Storage Policies

Add the following RLS policies to the `verification_ids` bucket:

#### Allow uploads (for registration)

```sql
CREATE POLICY "Allow public uploads to pending folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification_ids'
  AND (storage.foldername(name))[1] = 'pending'
);
```

#### Allow authenticated users to read their own IDs

```sql
CREATE POLICY "Users can read their own verification IDs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification_ids'
  AND auth.uid()::text = (storage.foldername(name))[2]
);
```

#### Allow service role to manage files

The service role key (used by the server) already has full access to storage.

## How It Works

### Registration Flow

1. User fills out registration form with personal details
2. User uploads a government or barangay-issued ID
3. User clicks "Verify Address" to confirm the upload
4. ID is uploaded to `verification_ids/pending/` folder
5. User account is created with `address_verification_status: 'pending'`
6. Upon successful account creation, ID is moved to `verification_ids/verified/{userId}/`

### Admin Review Flow

1. Admin views pending verifications at `/admin/pending-verifications`
2. Admin reviews the uploaded ID document
3. Admin verifies that the address shows "Barangay NBBS, Navotas"
4. Admin approves or rejects the verification
5. If rejected, the user account is deactivated

### API Endpoints

| Endpoint                              | Method | Description                         |
| ------------------------------------- | ------ | ----------------------------------- |
| `/auth/signup-with-verification`      | POST   | Create account with ID verification |
| `/admin/pending-verifications`        | GET    | Get all pending verifications       |
| `/admin/users/:userId/verify-address` | PUT    | Approve/reject verification         |

### Request/Response Examples

#### Signup with Verification

```json
POST /auth/signup-with-verification
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "Juan Dela Cruz",
  "phoneNumber": "+639123456789",
  "idDocumentUrl": "https://..../verification_ids/pending/...",
  "idDocumentPath": "pending/filename.jpg"
}
```

#### Verify Address (Admin)

```json
PUT /admin/users/:userId/verify-address
{
  "status": "verified"
}
// or
{
  "status": "rejected",
  "rejectionReason": "ID address does not show Barangay NBBS, Navotas"
}
```

## Accepted ID Types

- Philippine National ID
- UMID (Unified Multi-Purpose ID)
- Driver's License
- Passport
- Voter's ID
- PhilHealth ID
- Barangay Certificate/ID
- Postal ID
- SSS ID
- GSIS ID
- PRC ID

## File Requirements

- **Accepted formats**: JPEG, PNG, WebP, PDF
- **Maximum file size**: 10MB
- **Requirements**: ID must clearly show the resident's name and address

## Error Messages

| Error                                                       | Meaning                     |
| ----------------------------------------------------------- | --------------------------- |
| "ID document is required for address verification"          | User didn't upload an ID    |
| "Please upload a valid image (JPEG, PNG, WebP) or PDF file" | Invalid file format         |
| "File size must be less than 10MB"                          | File too large              |
| "Address on ID does not match Barangay NBBS, Navotas"       | Address verification failed |

## Security Considerations

1. IDs are stored in a private bucket, not publicly accessible
2. Only the user and admins can view uploaded IDs
3. IDs are organized by user ID for easy management
4. Pending uploads are stored separately from verified documents
5. Rejected users have their accounts deactivated
