# CRM — Lead Management & Project Tracking System

A comprehensive CRM system for digital marketing agencies with full role-based access control, team collaboration, and project management capabilities.

Built with Next.js 14, TypeScript, Tailwind CSS, Supabase, and Zustand.

## 🚀 Features

### ✅ Role-Based Access Control (RBAC)
- **Super Admin**: Full system access, user management, project assignment
- **Team Members**: Access to assigned projects only, lead management, task tracking
- **Clients**: Read-only analytics access for their projects

### ✅ User Management
- Invite team members and clients via email
- Automatic account creation on first login
- User activation/deactivation
- Project assignment management
- Password change functionality

### ✅ Lead Management
- Real-time Google Sheets integration
- Advanced filtering (status, tags, date ranges, search)
- Lead statistics dashboard
- CSV export
- Status tracking and updates

### ✅ Project Management
- Multi-project support
- Project-based lead organization
- Team member assignment to projects
- Project analytics dashboard

### ✅ Task Management
- Create and assign tasks
- Task status tracking
- Due date management
- Task notifications

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Row Level Security)
- **State Management**: Zustand
- **Data Integration**: Google Sheets via Apps Script
- **Utilities**: papaparse, date-fns, react-hot-toast

## 📁 Project Structure

```
/app
  /api              — API routes (user management, invites, project assignment)
  /analytics        — Project analytics pages
  /login            — Authentication
  /projects         — Project management
  /team             — Team management & user administration
  /settings         — User settings & configuration
  /enquiries        — Lead management
  /tasks            — Task tracking

/components         — Reusable UI components
/lib                — Business logic, utilities, auth
/store              — Zustand state management
/types              — TypeScript type definitions
/docs               — Setup guides & documentation
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Google Sheets with lead data (optional)

### 1. Installation

```bash
npm install
```

### 2. Environment Configuration

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# App URL (for invites)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

Follow the complete setup guide in `RBAC_SETUP.md` for:
- Database schema creation
- Row Level Security (RLS) policies
- Initial super admin setup

### 4. Google Sheets Integration (Optional)

If using Google Sheets for lead data:
1. Deploy the Apps Script from `/docs/google-apps-script.js`
2. Add the Web App URL in Settings page

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

- **[RBAC_SETUP.md](./RBAC_SETUP.md)** - Complete database setup and RBAC configuration
- **[RBAC_CURRENT_STATUS.md](./RBAC_CURRENT_STATUS.md)** - Current implementation status and features
- **[docs/SETUP_GUIDE.md](./docs/SETUP_GUIDE.md)** - Detailed setup instructions
- **[docs/INVITE_FLOW.md](./docs/INVITE_FLOW.md)** - User invite system documentation
- **[docs/DEACTIVATION_IMPLEMENTATION.md](./docs/DEACTIVATION_IMPLEMENTATION.md)** - User deactivation feature docs

## 🔐 Security

- Row Level Security (RLS) enforced at database level
- JWT-based authentication via Supabase
- Route protection via Next.js middleware
- Role-based API endpoint protection
- Secure password reset flow

## 🚀 Deployment

### Render / Vercel / Netlify

1. Push to your Git repository
2. Connect repository to hosting platform
3. Add environment variables
4. Deploy

**Important**: Ensure your Supabase project is configured for production and update `NEXT_PUBLIC_APP_URL` to your production domain.

## 📝 Current Status

✅ **Complete and Production-Ready:**
- RBAC system with 3 role tiers
- User invite and onboarding flow
- User activation/deactivation
- Project-based access control
- Lead management system
- Task tracking
- Project analytics
- Password management
- Team administration UI

## 🤝 Contributing

This is a private project. For access or questions, contact the repository owner.

## 📄 License

Proprietary - All rights reserved
