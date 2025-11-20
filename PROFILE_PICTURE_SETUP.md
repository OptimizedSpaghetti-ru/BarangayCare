# Profile Picture Setup Guide

This guide will help you set up the profile picture functionality in your BarangayCare application.

## Step 1: Run Database Migration

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Open and run the migration file: `src/utils/supabase/add-profile-picture.sql`
4. This will:
   - Add the `profile_picture_url` column to the `users` table
   - Create storage policies for the `profile_pictures` bucket

## Step 2: Create Storage Bucket

1. In your Supabase dashboard, navigate to **Storage**
2. Click **"New bucket"**
3. Configure the bucket:
   - **Name**: `profile_pictures`
   - **Public bucket**: Yes (check the box)
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`
4. Click **"Create bucket"**

## Step 3: Verify Storage Policies

The migration script should have created the following policies automatically:

1. **Users can upload their own profile pictures** (INSERT)
2. **Users can update their own profile pictures** (UPDATE)
3. **Users can delete their own profile pictures** (DELETE)
4. **Public can view profile pictures** (SELECT)

To verify these policies:

1. Go to **Storage** → Click on `profile_pictures` bucket
2. Click on **Policies** tab
3. Ensure all 4 policies are listed and enabled

If policies are missing, you can create them manually using the SQL from `add-profile-picture.sql`.

## Step 4: Deploy API Changes

The API endpoints have been updated to support profile pictures. Make sure to deploy the changes:

```bash
# If using Vercel
vercel --prod

# Or your preferred deployment method
```

## Step 5: Test the Feature

1. **Login** to the application
2. Navigate to **Profile Management** (click your avatar → Profile)
3. Click **"Change Picture"** or the camera icon
4. Select an image from your device (max 5MB)
5. Wait for the upload to complete
6. Verify the image appears:
   - On the Profile Management page
   - In the header avatar
   - In the profile menu
7. **Refresh the page** to verify persistence
8. **Logout and login again** to verify the image is still there

## Features Implemented

### 1. Profile Picture Upload

- Users can upload images up to 5MB
- Supported formats: JPEG, PNG, WebP, GIF
- Automatic validation of file size and type
- Loading states during upload

### 2. Storage in Supabase

- Images stored in `profile_pictures` bucket
- Unique filenames: `{userId}_{timestamp}.{ext}`
- Public URL generation for easy access
- Automatic cleanup of old pictures when uploading new ones

### 3. Database Integration

- Profile picture URL stored in `users.profile_picture_url`
- URL fetched with user profile
- Updates persist across sessions

### 4. UI Integration

Profile pictures appear in:

- **Profile Management page**: Large avatar with edit button
- **Header**: Small avatar in navigation bar
- **Profile Menu**: Medium avatar in slide-out menu
- **User Management (Admin)**: User list with avatars
- **User Details Dialog (Admin)**: Large avatar with user info

### 5. Fallback Handling

- If no profile picture: Shows user's initial
- If image fails to load: Falls back to initial
- Graceful error handling throughout

## Troubleshooting

### Upload fails with "Failed to upload image"

- Check that the `profile_pictures` bucket exists
- Verify bucket is set to public
- Check storage policies are enabled
- Ensure file is under 5MB and is an image

### Image doesn't appear after upload

- Check browser console for errors
- Verify the public URL is accessible
- Check that `profile_picture_url` column exists in database
- Ensure user is authenticated

### Image disappears after refresh

- Verify database column `profile_picture_url` is saved
- Check API endpoint `/auth/profile/picture` is working
- Ensure auth context `refreshProfile()` is working

### Old images not being deleted

- Check Supabase Storage permissions
- Verify DELETE policy is enabled on bucket
- Check browser console for cleanup errors

## API Endpoints

### Update Profile Picture

```
PUT /api/make-server-fc40ab2c/auth/profile/picture
Authorization: Bearer {access_token}
Content-Type: application/json

Body:
{
  "profilePictureUrl": "https://..."
}
```

### Get Profile (includes picture)

```
GET /api/make-server-fc40ab2c/auth/profile
Authorization: Bearer {access_token}
```

## Security Considerations

1. **File Size Limit**: 5MB per image prevents abuse
2. **File Type Validation**: Only images accepted
3. **Authentication Required**: Must be logged in to upload
4. **User-Specific Storage**: Each user can only upload to their own path
5. **Public Read Access**: Anyone can view uploaded pictures (by design)
6. **Old Image Cleanup**: Previous images are deleted when uploading new ones

## Next Steps

After setup, you may want to:

1. Add image cropping/resizing before upload
2. Add image compression to reduce file sizes
3. Add progress bar for uploads
4. Add ability to remove profile picture (set to null)
5. Add default avatar images for users without pictures
