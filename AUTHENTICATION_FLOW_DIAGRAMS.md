# 📊 Authentication System Flow Diagrams

Visual representation of all authentication flows in the WebRockets CRM.

---

## 🎯 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    WebRockets CRM                           │
│                  Authentication System                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │       Login Page              │
              │   (No Role Selector)          │
              └───────────────────────────────┘
                              │
                ┌─────────────┴──────────────┐
                │                            │
                ▼                            ▼
       ┌────────────────┐         ┌──────────────────┐
       │ Email/Password │         │  Google OAuth    │
       └────────────────┘         └──────────────────┘
                │                            │
                └─────────────┬──────────────┘
                              ▼
                    ┌───────────────────┐
                    │   Supabase Auth   │
                    └───────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  Database Trigger │
                    │ handle_new_user() │
                    └───────────────────┘
                              │
                ┌─────────────┴──────────────┐
                │                            │
                ▼                            ▼
       ┌────────────────┐         ┌──────────────────┐
       │  First User?   │         │  Existing User?  │
       │  Create Company│         │  Use Metadata    │
       └────────────────┘         └──────────────────┘
                │                            │
                └─────────────┬──────────────┘
                              ▼
                    ┌───────────────────┐
                    │  Profile Created  │
                    │   in Database     │
                    └───────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   Read User Role  │
                    │   from Database   │
                    └───────────────────┘
                              │
                ┌─────────────┴──────────────┐
                │                            │
                ▼                            ▼
       ┌────────────────┐         ┌──────────────────┐
       │   role=admin   │         │   role=worker    │
       │ /admin/dash    │         │ /worker/dash     │
       └────────────────┘         └──────────────────┘
```

---

## 🚀 First Admin Signup Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: User visits /login (First time, empty database)    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: User enters email/password or clicks Google OAuth  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Supabase creates auth.users record                 │
│         user_id: uuid-generated                             │
│         email: user@example.com                             │
│         metadata: { full_name, avatar_url }                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Trigger: handle_new_user() FIRES                   │
│         CHECK: is_first_user() → TRUE                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Trigger creates NEW COMPANY                        │
│         INSERT INTO companies                               │
│         company_name: 'My Company'                          │
│         RETURNING id → new_company_id                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Trigger creates ADMIN PROFILE                      │
│         INSERT INTO profiles                                │
│         id: user_id                                         │
│         company_id: new_company_id                          │
│         role: 'admin'                                       │
│         full_name: from metadata                            │
│         email: user email                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 7: Login page fetches profile                         │
│         SELECT role, company_id FROM profiles               │
│         WHERE id = user_id                                  │
│         → Returns: role='admin', company_id=UUID            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 8: Redirect to /admin/dashboard                       │
│         User is now an admin!                               │
│         Can create workers, customers, tasks                │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 Admin Creates Worker Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Admin logged in, navigates to /admin/workers       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Admin clicks "Add Worker" button                   │
│         Modal opens: CreateWorkerModal                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Admin fills in:                                    │
│         - Full Name: "John Doe"                             │
│         - Email: "john@example.com"                         │
│         Clicks "Create Worker"                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Frontend calls createWorker() server action        │
│         Params: { email, fullName, temporaryPassword,       │
│                   companyId }                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Server action VERIFIES caller is admin             │
│         - Get current user from session                     │
│         - Query profiles table for role                     │
│         - IF role != 'admin' → REJECT                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Server calls supabase.auth.admin.createUser()      │
│         email: john@example.com                             │
│         password: temporary password                        │
│         email_confirm: true (auto-confirm)                  │
│         user_metadata: {                                    │
│           full_name: "John Doe",                            │
│           role: "worker",                                   │
│           company_id: admin's company_id                    │
│         }                                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 7: Supabase creates auth.users record                 │
│         Returns: new user_id                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 8: Trigger: handle_new_user() FIRES                   │
│         CHECK: is_first_user() → FALSE                      │
│         CHECK: metadata has role + company_id → TRUE        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 9: Trigger creates WORKER PROFILE                     │
│         INSERT INTO profiles                                │
│         id: new user_id                                     │
│         company_id: from metadata                           │
│         role: 'worker' (from metadata)                      │
│         full_name: from metadata                            │
│         email: john@example.com                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 10: Server action returns success                     │
│          Frontend shows temporary password                  │
│          Modal displays: "Worker created! Password: xxx"    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 11: Admin copies password and shares with worker      │
│          Worker can now login with credentials              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Worker Login Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Worker visits /login                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Worker enters credentials                          │
│         Email: john@example.com                             │
│         Password: temporary password from admin             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Supabase authenticates                             │
│         Validates password against hash                     │
│         Creates session                                     │
│         Returns: user object + session tokens               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Login page queries DATABASE for role               │
│         SELECT role, company_id FROM profiles               │
│         WHERE id = user_id                                  │
│         Returns: { role: 'worker', company_id: UUID }       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Check company_id is NOT NULL                       │
│         IF NULL → Sign out + show error                     │
│         IF set → Continue                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Redirect based on DATABASE role                    │
│         role === 'worker' → /worker/dashboard               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 7: Middleware verifies route access                   │
│         User accessing /worker/dashboard                    │
│         Database role = 'worker' → ALLOW                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 8: Worker dashboard loads                             │
│         Shows only assigned customers and tasks             │
│         RLS policies enforce company + assignment filtering │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌐 Google OAuth Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: User visits /login                                 │
│         Clicks "Continue with Google"                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Frontend calls Supabase OAuth                      │
│         supabase.auth.signInWithOAuth({                     │
│           provider: 'google',                               │
│           options: {                                        │
│             redirectTo: '/auth/callback'                    │
│           }                                                 │
│         })                                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Redirect to Google OAuth consent screen            │
│         User sees: "Allow CRM to access your Google?"       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: User clicks "Allow"                                │
│         Google redirects to Supabase callback URL           │
│         URL: https://project.supabase.co/auth/v1/callback   │
│         Params: code=xxx                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Supabase exchanges code for Google user info       │
│         Gets: email, name, picture from Google              │
│         Creates/updates auth.users record                   │
│         Sets metadata: { full_name, avatar_url }            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Supabase redirects to app callback                 │
│         URL: https://yourapp.com/auth/callback?code=xxx     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 7: /auth/callback route handler runs                  │
│         Exchanges code for session                          │
│         Stores session in cookies                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 8: Query database for user profile                    │
│         SELECT role, company_id FROM profiles               │
│         WHERE id = user_id                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴──────────────┐
                │                            │
                ▼                            ▼
       ┌────────────────┐         ┌──────────────────┐
       │ Profile Exists │         │ Profile Missing  │
       │ (2nd+ login)   │         │ (First login)    │
       └────────────────┘         └──────────────────┘
                │                            │
                │                            ▼
                │              ┌──────────────────────────┐
                │              │ Trigger created profile  │
                │              │ during auth.users INSERT │
                │              └──────────────────────────┘
                │                            │
                └─────────────┬──────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 9: Redirect based on role from DATABASE               │
│         role === 'admin' → /admin/dashboard                 │
│         role === 'worker' → /worker/dashboard               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Route Protection Flow (Middleware)

```
┌─────────────────────────────────────────────────────────────┐
│ User navigates to ANY route                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Middleware.ts intercepts request                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Check: User authenticated?                                  │
│ Read session from cookies                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴──────────────┐
                │                            │
                ▼                            ▼
       ┌────────────────┐         ┌──────────────────┐
       │  NOT Logged In │         │    Logged In     │
       └────────────────┘         └──────────────────┘
                │                            │
                ▼                            ▼
       ┌────────────────┐         ┌──────────────────┐
       │ Accessing      │         │ Query database   │
       │ /login?        │         │ for user profile │
       └────────────────┘         └──────────────────┘
                │                            │
       ┌────────┴────────┐                  ▼
       │                 │         ┌──────────────────┐
       ▼                 ▼         │ Get role &       │
  ┌────────┐      ┌──────────┐    │ company_id       │
  │  YES   │      │    NO    │    └──────────────────┘
  │ ALLOW  │      │ Redirect │              │
  └────────┘      │ /login   │              ▼
                  └──────────┘    ┌──────────────────┐
                                  │ Check route vs   │
                                  │ user role        │
                                  └──────────────────┘
                                            │
                              ┌─────────────┴──────────────┐
                              │                            │
                              ▼                            ▼
                     ┌────────────────┐         ┌──────────────────┐
                     │ Accessing      │         │  Accessing       │
                     │ /admin/*       │         │  /worker/*       │
                     └────────────────┘         └──────────────────┘
                              │                            │
                              ▼                            ▼
                     ┌────────────────┐         ┌──────────────────┐
                     │ role=admin?    │         │ role=worker?     │
                     └────────────────┘         └──────────────────┘
                              │                            │
                    ┌─────────┴─────────┐      ┌─────────┴─────────┐
                    │                   │      │                   │
                    ▼                   ▼      ▼                   ▼
              ┌──────────┐        ┌──────────┐┌──────────┐  ┌──────────┐
              │   YES    │        │    NO    ││   YES    │  │    NO    │
              │  ALLOW   │        │ Redirect ││  ALLOW   │  │ Redirect │
              └──────────┘        │ /worker  ││          │  │ /admin   │
                                  └──────────┘└──────────┘  └──────────┘
```

---

## 🔒 RLS Policy Enforcement Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User makes database query (e.g., SELECT FROM customers)    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL checks RLS policies                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Get auth.uid() from JWT token                               │
│ (Supabase automatically provides this)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Look up user's profile                                      │
│ SELECT company_id, role FROM profiles WHERE id = auth.uid() │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Apply role-based policy:                                    │
│                                                             │
│ IF role = 'admin':                                          │
│   WHERE customers.company_id = user's company_id            │
│   (Can see ALL customers in company)                        │
│                                                             │
│ IF role = 'worker':                                         │
│   WHERE customers.assigned_worker = auth.uid()              │
│   (Can see ONLY assigned customers)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Return filtered results                                     │
│ User only sees data they're allowed to see                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚫 Blocked: Worker Self-Registration Attempt

```
┌─────────────────────────────────────────────────────────────┐
│ Malicious user tries to self-register as worker            │
│ (e.g., directly calling Supabase signup API)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase creates auth.users record                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Trigger: handle_new_user() FIRES                            │
│ CHECK: is_first_user() → FALSE (not first user)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ CHECK: Does metadata contain role + company_id?             │
│ user_metadata->>'role' → NULL                               │
│ user_metadata->>'company_id' → NULL                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ ❌ TRIGGER RAISES EXCEPTION                                 │
│ ERROR: "New users must be created by an administrator"      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Transaction ROLLS BACK                                      │
│ - auth.users record DELETED                                 │
│ - No profile created                                        │
│ - User creation FAILED                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Error returned to attacker                                  │
│ Self-registration attempt BLOCKED ✅                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Session Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User logs in successfully                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase creates session                                    │
│ - Access token (JWT, 1 hour lifetime)                       │
│ - Refresh token (stored in cookie)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Cookies set in browser                                      │
│ - sb-access-token                                           │
│ - sb-refresh-token                                          │
│ - HttpOnly, Secure, SameSite                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ AuthContext stores user + profile in React state            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ On each request:                                            │
│ - Middleware reads cookies                                  │
│ - Validates access token                                    │
│ - If expired, uses refresh token                            │
│ - Updates cookies with new tokens                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ On logout:                                                  │
│ - Call supabase.auth.signOut()                              │
│ - Clear cookies                                             │
│ - Clear AuthContext state                                   │
│ - Redirect to /login                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow: Customer Assignment

```
┌─────────────────────────────────────────────────────────────┐
│ Admin assigns customer to worker                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ UPDATE customers                                            │
│ SET assigned_worker = 'worker-uuid'                         │
│ WHERE id = 'customer-uuid'                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ RLS Policy checks:                                          │
│ - Verify admin role                                         │
│ - Verify customer in admin's company                        │
│ - Verify worker in same company                             │
│ → If all true: ALLOW                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Customer updated                                            │
│ assigned_worker = worker's UUID                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Worker can now see customer                                 │
│                                                             │
│ When worker queries:                                        │
│ SELECT * FROM customers                                     │
│                                                             │
│ RLS applies:                                                │
│ WHERE assigned_worker = auth.uid()                          │
│                                                             │
│ → Returns customer (now assigned to them)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Summary

These flow diagrams illustrate:

1. ✅ **First-time setup is automatic** - No manual SQL needed
2. ✅ **Worker creation is controlled** - Only admins can create
3. ✅ **Roles come from database** - UI cannot bypass security
4. ✅ **Self-registration is blocked** - Trigger prevents unauthorized accounts
5. ✅ **RLS policies enforce access** - Database-level security
6. ✅ **Session management is secure** - Cookie-based with refresh
7. ✅ **All flows are consistent** - Email, Google OAuth, and admin creation

The system is secure, scalable, and production-ready! 🚀
