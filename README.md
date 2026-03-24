# BarangayCare

A comprehensive barangay management system built with React, TypeScript, and Supabase. This application enables residents to submit complaints and barangay administrators to manage and respond to community issues in real-time.

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![React](https://img.shields.io/badge/React-18.3.1-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)
![Supabase](https://img.shields.io/badge/Supabase-2.x-3ECF8E.svg)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)
- [Available Scripts](#available-scripts)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

### For Residents

- **OTP Registration Flow** - Register using email OTP verification and complete profile with ID submission
- **Complaint Submission** - Report barangay issues with required photo evidence and pinned map location
- **Status Tracking** - Monitor complaint progress in real-time
- **In-App Notifications** - Receive complaint activity updates with unread/read tracking
- **Profile Management** - Update personal information and account settings

### For Administrators

- **Complaint Management** - Review, prioritize, filter, and respond to complaints
- **Address Verification Workflow** - Approve or reject pending accounts after ID review
- **Heatmap Dashboard** - View a dedicated complaints heatmap page with category filtering
- **Data Analytics** - Visualize trends and export analytics as CSV
- **User Management** - Manage resident accounts and permissions

### General Features

- **Role-Based Access Control** - Separate resident and admin capabilities
- **Pending Approval Enforcement** - New verified registrations remain pending until admin approval
- **Strict Contact Validation** - Contact numbers are validated as 11-digit numeric values
- **Real-Time Sync** - Automatic updates without page refresh
- **Responsive Interface** - Optimized for desktop and mobile layouts
- **Android Support (Capacitor)** - Mobile-ready build with local notifications and native file sharing

## Tech Stack

### Frontend

- **React 18.3.1** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icon set
- **Recharts** - Charting library for analytics
- **Leaflet** - Mapping and heatmap visualization
- **React Hook Form** - Form validation and management
- **Sonner** - Toast notifications

### Backend & Database

- **Supabase** - Backend-as-a-Service (PostgreSQL database, authentication, real-time subscriptions)
- **Supabase Edge Functions (Hono)** - Server-side registration and account management endpoints
- **Row Level Security (RLS)** - Database-level access control

### Mobile

- **Capacitor Android** - Native Android packaging and runtime integration
- **Capacitor Local Notifications** - Native notification delivery for in-app events
- **Capacitor Filesystem and Share** - Native analytics export and sharing on Android

### UI Components

- Custom component library built with Radix UI primitives
- Shadcn/ui inspired design system
- Fully accessible and keyboard navigable

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16.x or higher)
- **npm** or **yarn** or **pnpm**
- **Supabase Account** (free tier available at [supabase.com](https://supabase.com))

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/OptimizedSpaghetti-ru/BarangayCare.git
   cd BarangayCare
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   You can find these credentials in your Supabase project settings:
   - Go to [supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project
   - Navigate to **Settings** → **API**
   - Copy **Project URL** and **anon/public key**

## Database Setup

### Quick Setup (5 Minutes)

1. **Open Supabase SQL Editor**
   - Go to your [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

2. **Run the setup script**
   - Open `src/utils/supabase/setup-database.sql` in your project
   - Copy all contents
   - Paste into the SQL editor
   - Click **Run**

   > **Note:** If you encounter permission errors and already ran an old script, use `src/utils/supabase/fix-policies.sql` instead.

3. **Enable Real-time**
   - Go to **Database** → **Replication**
   - Find the `complaints` table
   - Toggle **Replication** ON

4. **Create an Admin User**
   - Go to **Authentication** → **Users**
   - Sign up through the app first
   - Find your user in the dashboard
   - Click on the user
   - In the **User Metadata** section, add:
     ```json
     {
       "role": "admin",
       "name": "Your Name"
     }
     ```
   - Click **Save**

5. **Verify Setup**
   - Table `complaints` exists in Table Editor
   - RLS policies are active (Database → Policies)
   - Real-time replication is enabled
   - At least one admin user is configured

### Detailed Documentation

For comprehensive database setup instructions, migration guides, and troubleshooting:

- [Quick Start Guide](src/QUICK_START_DATABASE.md)
- [Complete Database Setup](src/utils/supabase/DATABASE_SETUP_GUIDE.md)
- [Troubleshooting](src/TROUBLESHOOTING_DATABASE.md)
- [Migration from localStorage](src/utils/supabase/migrate-localStorage.tsx)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these values:**

1. Log into [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** and **anon/public** key

## Running the Application

### Development Mode

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

The application will start at `http://localhost:5173` (or another port if 5173 is busy).

### Android (Capacitor)

```bash
npm run build
npx cap sync android
npx cap open android
```

To deploy Supabase edge function updates:

```powershell
.\deploy-functions.ps1
```

### Build for Production

```bash
npm run build
# or
yarn build
# or
pnpm build
```

### Preview Production Build

```bash
npm run preview
# or
yarn preview
# or
pnpm preview
```

## Project Structure

```
BarangayCare/
├── icon/                           # Application icons and assets
├── src/
│   ├── components/
│   │   ├── auth/                  # Authentication components
│   │   │   ├── auth-context.tsx   # Auth state management
│   │   │   ├── login-form.tsx     # Login interface
│   │   │   ├── signup-form.tsx    # Registration interface
│   │   │   ├── profile-management.tsx
│   │   │   └── user-management.tsx
│   │   ├── figma/                 # Custom components
│   │   │   └── ImageWithFallback.tsx
│   │   ├── ui/                    # Reusable UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   └── ... (30+ components)
│   │   ├── admin-panel.tsx        # Admin control center
│   │   ├── complaint-form.tsx     # Complaint submission
│   │   ├── complaint-manager.tsx  # Complaint state management
│   │   ├── data-analytics.tsx     # Analytics dashboard
│   │   ├── header.tsx             # App header/navigation
│   │   ├── migration-helper.tsx   # Data migration utility
│   │   ├── resident-settings.tsx  # User settings
│   │   ├── theme-provider.tsx     # Dark/light mode
│   │   └── unified-dashboard.tsx  # Main dashboard
│   ├── guidelines/
│   │   └── Guidelines.md          # Development guidelines
│   ├── styles/
│   │   └── globals.css            # Global styles
│   ├── supabase/
│   │   └── functions/             # Serverless functions
│   ├── utils/
│   │   └── supabase/
│   │       ├── client.tsx         # Supabase client setup
│   │       ├── info.tsx           # Database info
│   │       ├── setup-database.sql # Database schema
│   │       ├── fix-policies.sql   # RLS policy fixes
│   │       ├── migrate-localStorage.tsx
│   │       └── DATABASE_SETUP_GUIDE.md
│   ├── App.tsx                    # Main application component
│   ├── main.tsx                   # Application entry point
│   ├── index.css                  # Base styles
│   ├── QUICK_START_DATABASE.md    # Quick setup guide
│   ├── SUPABASE_DATABASE_README.md
│   ├── TROUBLESHOOTING_DATABASE.md
│   └── Attributions.md            # Third-party credits
├── index.html                     # HTML template
├── package.json                   # Dependencies and scripts
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This file
```

## User Roles

### Resident (Default)

- Register using OTP and submit account verification requirements
- Submit and view own complaints
- Track complaint status and admin responses
- Receive notification updates
- Update personal profile

### Admin

- All resident permissions
- View all complaints from all users
- Update complaint status and priority
- Manage user accounts
- Review and verify pending registrations
- Access analytics dashboard
- Access the dedicated heatmap dashboard
- Respond to complaints

**To make a user an admin:**

1. Go to Supabase Dashboard → Authentication → Users
2. Click on the user
3. Add to User Metadata: `{"role": "admin", "name": "Admin Name"}`

## Available Scripts

| Command                | Description                           |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Start development server              |
| `npm run build`        | Build for production                  |
| `npm run preview`      | Preview production build              |
| `npm run lint`         | Run ESLint (if configured)            |
| `deploy-functions.ps1` | Deploy Supabase edge function updates |

## Troubleshooting

### Common Issues

**1. Can't submit complaints**

- Ensure you're logged in
- Check that the database is set up correctly
- Verify RLS policies are active

**2. Real-time updates not working**

- Enable replication for the `complaints` table in Supabase
- Check your internet connection
- Verify Supabase credentials in `.env`

**3. Permission denied errors**

- Run `fix-policies.sql` to update RLS policies
- Ensure your user has the correct role
- Check Supabase logs for detailed errors

**4. Build errors**

- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Ensure Node.js version is 16.x or higher

**5. Supabase connection issues**

- Verify `.env` file exists and contains correct credentials
- Check that environment variables start with `VITE_`
- Restart the development server after changing `.env`

### Need More Help?

- Check the [Troubleshooting Guide](src/TROUBLESHOOTING_DATABASE.md)
- [Open an issue](https://github.com/OptimizedSpaghetti-ru/BarangayCare/issues)
- Contact the development team

## Customization

### Theming

The application supports dark and light modes. Theme configuration is in `src/components/theme-provider.tsx`.

### Styling

- Global styles: `src/styles/globals.css`
- Component styles: Tailwind CSS classes
- Custom components: `src/components/ui/`

### Adding New Features

1. Create components in `src/components/`
2. Add routing logic in `App.tsx`
3. Update database schema in `setup-database.sql`
4. Add RLS policies for new tables

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use existing UI components when possible
- Maintain accessibility standards
- Write clean, documented code
- Test on multiple devices and browsers

## License

This project is private and proprietary.

## Acknowledgments

- **Supabase** - For the amazing backend platform
- **Radix UI** - For accessible component primitives
- **Shadcn/ui** - For design inspiration
- **Lucide** - For beautiful icons
- **Tailwind CSS** - For the utility-first CSS framework
- **React Team** - For the excellent UI library

## Support

For support and questions:

- Email: russellignacio05@gmail.com
- Issues: [GitHub Issues](https://github.com/OptimizedSpaghetti-ru/BarangayCare/issues)
- Documentation: Check the `/src` directory for detailed guides

## Roadmap

- [x] Android app packaging with Capacitor
- [x] In-app notification center with unread badge
- [x] Heatmap dashboard for geotagged complaints
- [x] Email OTP registration flow with pending approval
- [x] Multi-language support
- [x] Analytics export for web and Android
- [ ] SMS notifications
- [ ] Event scheduling
- [ ] Payment integration

---

Current Branch: Active Development
