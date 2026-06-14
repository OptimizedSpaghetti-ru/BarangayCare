# BarangayCare

A barangay service management system built with React, TypeScript, Vite, and Supabase. BarangayCare helps residents and guests submit complaints or assistance requests, while administrators manage submissions, verify accounts, review analytics, and monitor request locations in real time.

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![React](https://img.shields.io/badge/React-18.3.1-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)
![Supabase](https://img.shields.io/badge/Supabase-2.x-3ECF8E.svg)

## Features

### For Residents

- **Complaint Submission** - Report barangay concerns with required photo evidence, contact validation, and optional pinned map location.
- **Assistance Submission** - Request barangay support for health services, emergencies, financial aid, medical assistance, senior citizen support, PWD assistance, food assistance, disaster relief, burial assistance, and scholarship or educational assistance.
- **Unified Dashboard** - View complaints and assistance requests together with searchable, filterable request lists and combined status totals.
- **Status Tracking** - Track pending, in-progress, resolved, and rejected requests with admin notes.
- **In-App Notifications** - Receive complaint and assistance activity updates with unread/read tracking.
- **Profile and Settings** - Manage profile details, language preference, notifications, theme, and resident settings.

### For Guests

- **Anonymous Submission Mode** - Continue as guest and submit either a complaint or assistance request without creating an account.
- **Guest Request Labels** - Anonymous submissions are recorded with generated names such as `Anonymous001`.
- **Photo and Contact Requirements** - Guest submissions follow the same evidence and 11-digit contact number validation as resident submissions.

### For Administrators

- **Complaint and Assistance Management** - Review, filter, prioritize, update status, add admin notes, and delete eligible records.
- **Address Verification Workflow** - Approve or reject pending accounts after reviewing submitted ID documents.
- **Combined Heatmap Dashboard** - View geotagged complaints and assistance requests together, with category filtering.
- **Data Analytics** - Analyze complaint and assistance volume, status breakdowns, categories, trends, insights, and CSV exports.
- **User Management** - Manage resident accounts, permissions, and account verification state.
- **Native Notifications** - Send local notification updates on Android for important request activity.

### General Features

- **Role-Based Access Control** - Separate resident, guest, and admin capabilities.
- **Pending Approval Enforcement** - New verified registrations remain pending until admin approval.
- **Strict Contact Validation** - Contact numbers are normalized and validated as 11-digit numeric values.
- **Real-Time Sync** - Complaint and assistance records refresh through Supabase realtime subscriptions and periodic foreground refresh.
- **Multi-Language Support** - English and Filipino translations through i18next.
- **Responsive Interface** - Optimized for desktop and mobile layouts.
- **Android Support (Capacitor)** - Mobile-ready build with local notifications, filesystem access, and native sharing.

## Tech Stack

### Frontend

- **React 18.3.1** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite 6** - Build tool and development server
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **Recharts** - Analytics charts
- **Leaflet and leaflet.heat** - Mapping and heatmap visualization
- **React Hook Form** - Form validation and management
- **i18next / react-i18next** - Localization
- **Sonner** - Toast notifications

### Backend and Database

- **Supabase** - PostgreSQL database, authentication, realtime subscriptions, and storage-ready backend services
- **Supabase Edge Functions with Hono** - Registration and account management endpoints
- **Row Level Security (RLS)** - Database-level access policies for users, complaints, and assistance requests

### Mobile

- **Capacitor Android** - Native Android packaging and runtime integration
- **Capacitor Local Notifications** - Native notification delivery for request activity
- **Capacitor Filesystem and Share** - Native analytics export and sharing

## Prerequisites

- **Node.js** v16 or higher
- **npm**, **yarn**, or **pnpm**
- **Supabase project**
- **Android Studio** for Android builds

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/OptimizedSpaghetti-ru/BarangayCare.git
   cd BarangayCare
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a local environment file:

   ```bash
   cp .env.development.example .env.local
   ```

4. Add your Supabase frontend credentials:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   VITE_APP_MODE=development
   ```

   Supabase values are available in **Supabase Dashboard > Project Settings > API**.

## Database Setup

Run the SQL files that match your environment from the Supabase SQL Editor or your migration pipeline.

### Core Migrations

- `src/supabase/migrations/enable_rls.sql` - Enables RLS for users and complaints.
- `src/supabase/migrations/add_address_verification.sql` - Adds account approval and submitted ID verification fields.
- `src/supabase/migrations/add_complaints_delete_admin_policy.sql` - Allows admins to delete complaints.
- `src/supabase/migrations/add_device_push_tokens.sql` - Adds push notification token support.
- `src/supabase/migrations/add_performance_indexes.sql` - Adds indexes for request and account queries.

### Assistance Requests

Run the assistance migration before using the new assistance submission flow:

- `supabase/assistance_requests_migration.sql` - Creates the `assistance_requests` table, indexes, policies, and realtime publication entry.
- `src/supabase/migrations/add_assistance_requests_rls.sql` - Applies the RLS policy set for authenticated users, admins, service role, and guest submissions.

### Optional Data and Auth Utilities

- `supabase/mock_data.sql` - Seeds sample complaints and assistance requests for local testing.
- `supabase/toggle_otp_email.sql` - Helps switch OTP/email confirmation behavior for development or production.
- `docs/address-verification-setup.md` - Documents address verification setup and endpoint behavior.

### Realtime

Enable realtime replication for:

- `complaints`
- `assistance_requests`

## Running the Application

### Development

```bash
npm run dev
```

The app starts at `http://localhost:5173`.

### Production Build

```bash
npm run build
```

### Android

```bash
npm run android:sync
npm run android:open
```

To build a debug APK:

```bash
npm run android:build
```

To deploy Supabase edge function updates:

```powershell
.\deploy-functions.ps1
```

## Available Scripts

| Command                 | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `npm run dev`           | Start the Vite development server on port 5173  |
| `npm run build`         | Build the app for production                    |
| `npm run vercel-build`  | Install clean dependencies and build for Vercel |
| `npm run android:add`   | Add the Android Capacitor platform              |
| `npm run android:sync`  | Build web assets and sync them to Android       |
| `npm run android:open`  | Open the Android project in Android Studio      |
| `npm run android:build` | Build a debug Android APK                       |
| `deploy-functions.ps1`  | Deploy Supabase edge function updates           |

## Project Structure

```text
BarangayCare/
|-- android/                         # Capacitor Android project
|-- docs/
|   `-- address-verification-setup.md
|-- public/                          # Static public assets
|-- src/
|   |-- components/
|   |   |-- auth/                    # Auth, profile, and user management
|   |   |-- ui/                      # Reusable Radix/shadcn-style UI components
|   |   |-- admin-panel.tsx          # Admin complaint and assistance management
|   |   |-- assistance-form.tsx      # Assistance request submission
|   |   |-- assistance-manager.tsx   # Assistance request state and Supabase sync
|   |   |-- complaint-form.tsx       # Complaint submission
|   |   |-- complaint-manager.tsx    # Complaint state and Supabase sync
|   |   |-- data-analytics.tsx       # Complaint and assistance analytics
|   |   |-- heatmap-dashboard.tsx    # Combined heatmap page
|   |   |-- heatmap-panel.tsx        # Leaflet heatmap rendering
|   |   |-- language-toggle.tsx      # Language switcher
|   |   |-- map-picker.tsx           # Location picker
|   |   `-- unified-dashboard.tsx    # Resident dashboard
|   |-- config/
|   |   |-- auth-mode.ts
|   |   `-- categories.ts            # Complaint and assistance categories
|   |-- i18n/
|   |   |-- config.ts
|   |   `-- locales/                 # English and Filipino translations
|   |-- supabase/
|   |   |-- functions/               # Edge function source
|   |   `-- migrations/              # SQL migrations
|   |-- utils/
|   |   `-- supabase/                # Supabase client and project info
|   |-- App.tsx
|   `-- main.tsx
|-- supabase/
|   |-- assistance_requests_migration.sql
|   |-- mock_data.sql
|   `-- toggle_otp_email.sql
|-- package.json
|-- capacitor.config.json
|-- vite.config.ts
`-- README.md
```

## User Roles

### Guest

- Submit anonymous complaints.
- Submit anonymous assistance requests.
- Cannot track request status after leaving guest mode.

### Resident

- Register with OTP and submit account verification requirements.
- Submit and view own complaints.
- Submit and view own assistance requests.
- Track request status and admin responses.
- Receive in-app and supported native notifications.
- Update profile and settings.

### Admin

- View all complaints and assistance requests.
- Update status, priority, and admin notes.
- Delete eligible complaint and assistance records.
- Review and verify pending registrations.
- Access combined analytics and heatmap dashboards.
- Manage users and account permissions.

To make a user an admin, open **Supabase Dashboard > Authentication > Users**, select the user, and add this metadata:

```json
{
  "role": "admin",
  "name": "Admin Name"
}
```

## Troubleshooting

### Assistance requests do not submit

- Confirm `assistance_requests` exists.
- Run `supabase/assistance_requests_migration.sql`.
- Run `src/supabase/migrations/add_assistance_requests_rls.sql`.
- Check that the form has a title, category, description, address, required photo/document, and valid 11-digit contact number.

### Requests do not update in real time

- Enable realtime replication for `complaints` and `assistance_requests`.
- Confirm Supabase credentials in `.env.local`.
- Restart the development server after changing environment variables.

### Permission denied errors

- Confirm RLS policies have been applied for users, complaints, and assistance requests.
- Confirm admin users have `role: "admin"` in auth metadata.
- Check Supabase logs for policy or JWT metadata issues.

### Android notifications do not appear

- Confirm notification permission is granted on the device.
- Rebuild and sync Android after dependency or configuration changes.
- Check the app notification settings in Android system settings.

### Build errors

- Delete `node_modules` and `package-lock.json`.
- Run `npm install`.
- Confirm Node.js is v16 or higher.

## Customization

- Theme provider: `src/components/theme-provider.tsx`
- Global styles: `src/styles/globals.css`
- Shared categories: `src/config/categories.ts`
- Translations: `src/i18n/locales/en.ts` and `src/i18n/locales/fil.ts`
- Supabase client: `src/utils/supabase/client.tsx`

## Roadmap

- [x] Android app packaging with Capacitor
- [x] In-app notification center with unread badge
- [x] Native Android local notifications
- [x] Complaint and assistance heatmap dashboard
- [x] Assistance request submission and admin management
- [x] Guest complaint and assistance submission
- [x] Email OTP registration flow with pending approval
- [x] Multi-language support
- [x] Analytics export for web and Android

## License

This project is private and proprietary.

---

Current Branch: Active Development
