# 🔐 Production-Grade Authentication Architecture

## Overview

This document describes the complete authentication system redesign for the WebRockets CRM, implementing production-grade Supabase best practices with role-based access control (RBAC).

---

## 🎯 Core Principles

1. **Database as Single Source of Truth** - User role is ALWAYS determined by the database, never by UI selections
2. **Admin-First Flow** - First signup automatically creates admin + company
3. **Worker Invitation Only** - Workers can ONLY be created by admins, no self-registration
4. **Unified Authentication** - Single login flow for both admins and workers
5. **Secure by Default** - RLS policies, proper triggers, no security bypasses

---

## 🏗️ System Architecture

### Authentication Flow

```
User Login
    ↓
Email/Password or Google OAuth
    ↓
Supabase Authentication
    ↓
Database Trigger: handle_new_user()
    ↓
    ├─ First User → Create Company + Admin Profile
    ├─ Admin-Created Worker → Create Worker Profile with company_id
    └─ Self-Registration Attempt → BLOCKED
    ↓
Profile Created in Database
    ↓
Read User Role from Database
    ↓
    ├─ role = 'admin' → /admin/dashboard
    └─ role = 'worker' → /worker/dashboard
```

---

## 📁 File Structure

```
CRM/
├── app/
│   ├── login/page.tsx                 # Single login page (no role selector)
│   ├── auth/callback/route.ts         # OAuth callback handler
│   ├── admin/
│   │   ├── layout.tsx                 # Admin layout wrapper
│   │   ├── dashboard/page.tsx         # Admin dashboard
│   │   └── workers/page.tsx           # Worker management
│   └── worker/
│       ├── layout.tsx                 # Worker layout wrapper
│       └── dashboard/page.tsx         # Worker dashboard
├── contexts/
│   └── AuthContext.tsx                # Centralized auth state management
├── components/
│   ├── auth/
│   │   ├── ProtectedRoute.tsx        # Requires authentication
│   │   └── RoleGuard.tsx             # Requires specific role
│   └── admin/
│       └── CreateWorkerModal.tsx     # Admin creates workers
├── lib/
│   ├── auth/
│   │   └── actions.ts                # Server actions for auth
│   └── supabase/
│       ├── client.ts                 # Client-side Supabase
│       ├── server.ts                 # Server-side Supabase
│       └── middleware.ts             # Session management
├── middleware.ts                      # Route protection
└── supabase-schema.sql               # Database schema + triggers
```

---

## 🔧 Key Components

### 1. Database Trigger: `handle_new_user()`

**Location:** `supabase-schema.sql`

**Purpose:** Automatically creates user profiles when auth accounts are created

**Logic:**
```sql
IF first_user THEN
    -- Create company for first user
    -- Assign admin role
    -- Link to new company
ELSE
    -- Check for admin-provided metadata
    -- IF no metadata → REJECT (prevents self-registration)
    -- IF metadata present → Create worker with company_id
END IF
```

**Prevents:**
- Self-registration of workers
- Orphan user accounts
- Users without companies
- Manual profile creation errors

---

### 2. Login Page: No Role Selector

**Location:** `app/login/page.tsx`

**Before (INSECURE):**
```typescript
// ❌ BAD: UI determines role
const [role, setRole] = useState<'admin' | 'worker'>('worker');
const redirectPath = role === 'admin' ? '/admin/dashboard' : '/worker/dashboard';
```

**After (SECURE):**
```typescript
// ✅ GOOD: Database determines role
const { data: profileData } = await supabase
  .from('profiles')
  .select('role, company_id')
  .eq('id', data.user.id)
  .single();

const redirectPath = profileData.role === 'admin' 
  ? '/admin/dashboard' 
  : '/worker/dashboard';
```

**Key Changes:**
- Removed Admin/Worker buttons from UI
- Role fetched from database AFTER successful login
- Redirect based on database role, not UI state
- No signup link (workers can't self-register)

---

### 3. AuthContext: Centralized State

**Location:** `contexts/AuthContext.tsx`

**Purpose:** Provides centralized authentication state across the app

**Exports:**
```typescript
{
  user: User | null,
  profile: Profile | null,
  loading: boolean,
  signOut: () => Promise<void>,
  refreshProfile: () => Promise<void>,
  isAdmin: boolean,
  isWorker: boolean,
}
```

**Usage:**
```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, profile, isAdmin } = useAuth();
  
  if (isAdmin) {
    // Show admin features
  }
}
```

---

### 4. ProtectedRoute Component

**Location:** `components/auth/ProtectedRoute.tsx`

**Purpose:** Ensures user is authenticated before showing content

**Usage:**
```typescript
<ProtectedRoute>
  <DashboardContent />
</ProtectedRoute>
```

---

### 5. RoleGuard Component

**Location:** `components/auth/RoleGuard.tsx`

**Purpose:** Ensures user has required role before showing content

**Usage:**
```typescript
<RoleGuard allowedRoles={['admin']}>
  <AdminOnlyContent />
</RoleGuard>
```

---

### 6. Worker Creation by Admin

**Location:** `components/admin/CreateWorkerModal.tsx`

**Server Action:** `lib/auth/actions.ts` → `createWorker()`

**Flow:**
```
Admin clicks "Add Worker"
    ↓
Fill in: Name, Email
    ↓
Server Action: createWorker()
    ↓
Verify current user is admin
    ↓
Call supabase.auth.admin.createUser() with metadata:
    - role: 'worker'
    - company_id: admin's company_id
    ↓
Trigger: handle_new_user() creates profile
    ↓
Worker account created
    ↓
Generate temporary password
    ↓
Show password to admin (to share with worker)
```

**Security:**
- Only admins can call `createWorker()`
- Worker automatically assigned to admin's company
- No way for workers to self-register

---

### 7. Middleware: Route Protection

**Location:** `middleware.ts`

**Purpose:** Protects routes based on authentication and role

**Logic:**
```typescript
If user not authenticated AND accessing protected route
    → Redirect to /login

If user authenticated AND accessing /login
    → Redirect to appropriate dashboard based on role

If user accessing /admin/* AND not admin
    → Redirect to /worker/dashboard

If user accessing /worker/* AND not worker
    → Redirect to /admin/dashboard
```

**Updated API:** Now uses modern `getAll()` and `setAll()` cookie methods instead of deprecated signature

---

## 🔐 Security Features

### Row-Level Security (RLS) Policies

**Admins can:**
- View all customers, tasks, workers in their company
- Create customers, tasks, workers
- Update/delete customers, tasks
- Cannot access other companies' data

**Workers can:**
- View only assigned customers and tasks
- Update assigned customers and tasks
- View their own activity logs
- Cannot access other companies' data
- Cannot create/delete

### Database Constraints

1. **Foreign Keys:** All records linked to companies
2. **Check Constraints:** Role must be 'admin' or 'worker'
3. **NOT NULL:** company_id required for active profiles
4. **ON DELETE CASCADE:** Cleanup when parent records deleted

---

## 🚀 First-Time Setup Flow

### Admin Signs Up (First User)

1. User visits login page
2. Enters email/password (or Google OAuth)
3. Supabase creates auth account
4. Trigger `handle_new_user()` detects first user
5. Automatically creates:
   - New company: "My Company"
   - Admin profile with role='admin'
   - Links admin to new company
6. User redirected to `/admin/dashboard`
7. Admin can now create workers

### Admin Creates Workers

1. Admin navigates to `/admin/workers`
2. Clicks "Add Worker"
3. Enters worker name and email
4. System generates temporary password
5. Worker account created with:
   - role='worker'
   - company_id=admin's company
6. Admin shares temporary password with worker
7. Worker logs in and changes password

### Worker Logs In

1. Worker visits login page
2. Enters credentials (or Google OAuth)
3. System reads role from database
4. Redirected to `/worker/dashboard`
5. Can only access assigned customers/tasks

---

## 🐛 Bugs Fixed

### Critical Issues Resolved

1. **❌ Role Selector Bypass**
   - **Before:** UI buttons determined admin/worker access
   - **After:** Database role is single source of truth

2. **❌ NULL company_id Trigger Failure**
   - **Before:** Trigger didn't set company_id, users couldn't be created
   - **After:** First user gets auto-created company, workers get admin's company

3. **❌ Worker Self-Registration**
   - **Before:** Anyone could sign up as worker
   - **After:** Workers ONLY created by admins through dashboard

4. **❌ Deprecated Middleware API**
   - **Before:** Using old cookie signature
   - **After:** Modern `getAll()` / `setAll()` API

5. **❌ No Admin First-Time Flow**
   - **Before:** Manual SQL commands needed
   - **After:** Automatic company creation for first signup

6. **❌ Mixed Auth Patterns**
   - **Before:** Some client-side, some server-side
   - **After:** Centralized AuthContext + server actions

---

## 🧪 Testing Checklist

### Test: First Admin Signup
- [ ] Visit `/login`
- [ ] Sign up with email/password
- [ ] Verify company auto-created
- [ ] Verify profile has role='admin'
- [ ] Verify redirected to `/admin/dashboard`

### Test: Admin Creates Worker
- [ ] Login as admin
- [ ] Navigate to `/admin/workers`
- [ ] Click "Add Worker"
- [ ] Enter worker details
- [ ] Verify temporary password displayed
- [ ] Verify worker profile created with correct company_id

### Test: Worker Login
- [ ] Use worker credentials
- [ ] Login via `/login`
- [ ] Verify redirected to `/worker/dashboard`
- [ ] Verify cannot access `/admin/*` routes

### Test: Role-Based Access
- [ ] Worker tries to access `/admin/dashboard` → Blocked
- [ ] Admin tries to access `/worker/dashboard` → Blocked
- [ ] Middleware redirects correctly

### Test: Google OAuth
- [ ] Click "Continue with Google"
- [ ] First-time Google user → Creates admin + company
- [ ] Subsequent Google login → Uses existing account
- [ ] Redirects based on database role

### Test: RLS Policies
- [ ] Admin can see all company data
- [ ] Worker can only see assigned data
- [ ] Users cannot see other companies' data

---

## 📝 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

---

## 🔄 Migration Steps

If you have an existing system, follow these steps:

### 1. Backup Database
```sql
-- Export existing data
SELECT * FROM profiles;
SELECT * FROM companies;
```

### 2. Run Updated Schema
```bash
# Copy contents of supabase-schema.sql
# Paste into Supabase SQL Editor
# Execute
```

### 3. Deploy Updated Code
```bash
npm run build
npm run start
```

### 4. Verify Migration
- [ ] Existing users can still login
- [ ] Roles are preserved
- [ ] Companies are preserved
- [ ] New trigger works for new signups

---

## 🆘 Troubleshooting

### Issue: "Profile not found"
**Cause:** User exists in auth.users but not in profiles table  
**Fix:** Run trigger manually or recreate user account

### Issue: "No company assigned"
**Cause:** Profile has NULL company_id  
**Fix:** Assign company manually or have admin recreate worker

### Issue: Google OAuth redirect mismatch
**Cause:** Wrong redirect URL in Supabase settings  
**Fix:** Update redirect URL in Supabase Dashboard → Authentication → URL Configuration

### Issue: Worker can access admin routes
**Cause:** Middleware not working or RLS policies wrong  
**Fix:** Verify middleware.ts is active, check profile.role in database

---

## 📚 References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

---

## ✅ Production Readiness Checklist

- [x] Database trigger prevents self-registration
- [x] First user auto-creates company
- [x] Admins can create workers through UI
- [x] Single login flow (no role selector)
- [x] Database-driven role determination
- [x] RLS policies protect data by company
- [x] Middleware protects routes by role
- [x] AuthContext provides centralized state
- [x] ProtectedRoute and RoleGuard components
- [x] Modern Supabase SSR API
- [x] Google OAuth support
- [x] Proper error handling
- [x] TypeScript throughout
- [x] No duplicate code
- [ ] Email verification (optional)
- [ ] Worker invitation emails (optional)
- [ ] Password strength requirements (optional)
- [ ] Two-factor authentication (optional)

---

## 🎉 Summary

This production-grade authentication architecture provides:

✅ **Security:** Database-driven roles, no UI bypasses  
✅ **Simplicity:** Single login flow, automatic setup  
✅ **Scalability:** Clean patterns, reusable components  
✅ **Best Practices:** Modern Supabase SSR, proper RLS  
✅ **Developer Experience:** TypeScript, clear structure  
✅ **User Experience:** Smooth flows, clear errors

The system is ready for production deployment.
