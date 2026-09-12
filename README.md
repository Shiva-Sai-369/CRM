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
- **Auto-assign project access on sync** (new!)
- Advanced filtering (status, tags, date ranges, search)
- Lead statistics dashboard
- CSV export
- Status tracking and updates
- **Clear auth and access warnings** (new!)
- **Visual diagnostic tool** (new!)

### ✅ Project Management
- Multi-project support
- Project-based lead organization
- Team member assignment to projects
- **Automatic assignment on sheet sync** (new!)
- Project analytics dashboard

### ✅ Task Management
- Create and assign tasks
- Task status tracking
- Due date management
- Task notifications

### ✅ Session Management (New!)
- Session expiry warnings
- Automatic logout on session expiry
- Clean state management
- Auth status monitoring

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


## 🔧 Troubleshooting

### Can't See Leads After Syncing?

**New Feature**: The system now includes comprehensive diagnostics and automatic fixes!

1. **Check Authentication**: Look for red "Authentication Required" banner on Enquiries page
   - **Solution**: Click "Go to Login" button or visit `/login`

2. **Check Project Access**: Look for yellow "No Projects Accessible" banner
   - **Solution**: Projects are now auto-assigned when you sync sheets
   - If still having issues, ask admin to assign you to the project

3. **Use Debug Tool** (Development Mode):
   - Click the 🔍 red button on Enquiries page
   - Run diagnostics to see exactly what's wrong
   - Follow the recommendations provided

4. **Quick Fix**:
   ```javascript
   // Clear everything and re-login (paste in browser console)
   localStorage.clear();
   sessionStorage.clear();
   window.location.href = '/login';
   ```

### Session Expired?

**New Feature**: Session monitoring with warnings!

- You'll get a warning toast 5 minutes before your session expires
- When session expires, you'll be auto-redirected to login
- All storage is automatically cleared for a clean state

### Need More Help?

See our comprehensive documentation:
- **Quick fixes**: `QUICK_REFERENCE.md`
- **Detailed troubleshooting**: `HOW_TO_FIX_LEADS_ISSUE.md`
- **Auth issues**: `AUTH_SESSION_FIX.md`
- **Technical deep-dive**: `LEADS_SYNC_DIAGNOSIS.md`
- **Complete summary**: `FINAL_SUMMARY.md`

## 🆕 Recent Improvements (v1.0.0)

### Authentication & Access Control Enhancements

#### Auto-Assignment on Sync
- Users are automatically assigned to projects when they sync Google Sheets
- No more manual project assignment needed
- Immediate access to synced leads

#### Clear Error Messages
- Red banner when not authenticated
- Yellow banner when no projects accessible
- Explanations of what went wrong and how to fix it

#### Session Monitoring
- Toast warnings 5 minutes before session expiry
- Automatic redirect to login when session expires
- Clean storage clearing on logout

#### Debug Tool (Development Mode)
- Visual diagnostic interface
- Shows auth status, role, project assignments
- Identifies exact issues and provides recommendations
- One-click diagnostics

#### Better User Experience
- No more "43 leads found but 0 displayed" confusion
- Clear feedback at every step
- Self-service troubleshooting
- Proactive session management

### Files Added
- `components/LeadsDebugger.tsx` - Visual diagnostic tool
- `components/SessionMonitor.tsx` - Session management
- `components/AuthGate.tsx` - Auth wrapper (optional)
- Comprehensive documentation suite (7 new docs)

### Files Modified
- `app/api/sync-sheet-to-supabase/route.ts` - Auto-assignment logic
- `app/enquiries/page.tsx` - Auth checks and warning banners
- `app/layout.tsx` - SessionMonitor integration

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| `README.md` | This file - project overview |
| `QUICK_REFERENCE.md` | Quick lookup for common issues |
| `FINAL_SUMMARY.md` | Complete summary of recent improvements |
| `HOW_TO_FIX_LEADS_ISSUE.md` | Step-by-step troubleshooting |
| `AUTH_SESSION_FIX.md` | Authentication issue guide |
| `LEADS_SYNC_DIAGNOSIS.md` | Technical analysis of RBAC |
| `TESTING_GUIDE.md` | Testing scenarios and checklist |
| `IMPLEMENTATION_PLAN.md` | Code changes and implementation |
| `RBAC_CURRENT_STATUS.md` | RBAC system documentation |
| `RBAC_SETUP.md` | RBAC setup instructions |
| `docs/SETUP_GUIDE.md` | Initial setup guide |
| `docs/INVITE_FLOW.md` | Invitation system docs |

## 🎯 Best Practices

### For Super Admins
1. Assign team members to projects using the Team Management page
2. Monitor user roles and access levels
3. Use "All Projects" view to see system-wide data

### For Team Members
1. You'll automatically get access to projects you create or sync
2. Check the project dropdown to switch between assigned projects
3. Contact admin if you need access to additional projects

### For Clients
1. You have read-only access to your project's analytics
2. Contact your project manager for changes or questions

### Session Management
1. Save your work regularly
2. Watch for session expiry warnings (⏰ toast)
3. You'll be auto-redirected to login if session expires

## 🐛 Known Issues & Limitations

1. **SessionMonitor in Mock Mode**: May not work correctly with placeholder Supabase credentials
2. **Debug Tool Only in Development**: Disabled in production builds for security
3. **Session Timeout**: Default 1 hour - configure in Supabase Auth settings

## 🚀 Future Enhancements

- [ ] Admin panel for user and project management
- [ ] Sync history tracking
- [ ] Advanced analytics dashboard
- [ ] Mobile app support
- [ ] Webhook integrations
- [ ] Custom notification channels
- [ ] Bulk operations (bulk assign, bulk status update)
- [ ] Export/import project configurations

## 📝 Changelog

### Version 1.0.0 (Current)
- ✅ Auto-assignment on sheet sync
- ✅ Auth status warnings and banners
- ✅ Session monitoring with expiry warnings
- ✅ Debug tool for diagnostics
- ✅ Comprehensive documentation
- ✅ Improved error messages
- ✅ Better UX for auth issues

### Version 0.9.0 (Previous)
- RBAC system implementation
- User invitation flow
- Project assignments
- Team management
- Multi-project support

---

**Need Help?** Start with `QUICK_REFERENCE.md` for common issues, or see the full documentation index above.

**Found a Bug?** Check existing documentation first, then open an issue with debug tool output.

**Contributing?** See `IMPLEMENTATION_PLAN.md` for code structure and conventions.
