# Client Invite Flow - Visual Diagrams

## High-Level Overview

```
┌──────────────┐
│    Admin     │
│   /team      │
└──────┬───────┘
       │ Clicks "Invite Client"
       │ Enters email + project
       ↓
┌──────────────────────────┐
│ POST /api/invite-client  │
│  - Validate permissions  │
│  - Send Supabase invite  │
│  - Include project_id    │
└──────┬───────────────────┘
       │
       ↓
┌──────────────────────────┐
│   📧 Email Sent          │
│   To: client@email.com   │
│   Link: /auth/callback   │
│        ?code=XXX         │
│        &project_id=1     │
└──────┬───────────────────┘
       │
       │ Client clicks link
       ↓
┌──────────────────────────┐
│ GET /auth/callback       │
│  - Exchange code         │
│  - Create profile        │
│  - Assign to project     │
│  - Check password_set    │
└──────┬───────────────────┘
       │
       ├─ password_set = false ─┐
       │                        ↓
       │              ┌──────────────────┐
       │              │ /set-password    │
       │              │  - User sets pwd │
       │              │  - Mark as set   │
       │              └─────────┬────────┘
       │                        │
       └────────────────────────┘
       │
       ↓
┌──────────────────────────┐
│ /analytics/[projectId]   │
│  - Client dashboard      │
│  - Project data visible  │
└──────────────────────────┘
```

## Detailed Data Flow

### Phase 1: Invitation

```
Super Admin / Team Member
         │
         │ 1. Navigates to /team
         │
         ↓
   ┌─────────────┐
   │  Team Page  │
   └──────┬──────┘
          │ 2. Clicks "Invite Client"
          │
          ↓
   ┌─────────────────────────┐
   │   Invite Modal Opens    │
   │  [Email: ___________]   │
   │  [Project: Dropdown ]   │
   │     [Send Invite]       │
   └──────┬──────────────────┘
          │ 3. Fills form & submits
          │
          ↓
   ┌────────────────────────────┐
   │ Client-side validation     │
   │  - Email format check      │
   │  - Project selected        │
   └──────┬─────────────────────┘
          │ 4. POST /api/invite-client
          │    { email, projectId }
          ↓
   ┌────────────────────────────┐
   │ Server-side Validation     │
   │  - User authenticated?     │
   │  - User is admin/team?     │
   │  - Team member assigned?   │
   └──────┬─────────────────────┘
          │ ✅ All checks pass
          ↓
   ┌────────────────────────────┐
   │ Supabase Admin API Call    │
   │  inviteUserByEmail(email)  │
   │  metadata: {               │
   │    role: 'client',         │
   │    invited_to_project_id,  │
   │    password_set: false     │
   │  }                         │
   │  redirectTo: /auth/callback│
   │             ?project_id=X  │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │   Email Service (Supabase) │
   │   Sends invite email       │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  Response: { success: true,│
   │              userId }       │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  Success message shown     │
   │  "Invite sent to email"    │
   └────────────────────────────┘
```

### Phase 2: Email & Link Click

```
   ┌────────────────────────────┐
   │   📧 Client Email Inbox    │
   │                            │
   │  From: noreply@supabase    │
   │  Subject: You have been    │
   │           invited          │
   │                            │
   │  [Confirm Invite] <--- Link│
   └──────┬─────────────────────┘
          │ Client clicks
          ↓
   ┌────────────────────────────┐
   │   Browser opens URL:       │
   │   /auth/callback           │
   │   ?code=ABC123XYZ          │
   │   &project_id=1            │
   └──────┬─────────────────────┘
          │
          ↓
```

### Phase 3: Authentication & Registration

```
   GET /auth/callback?code=XXX&project_id=1
          │
          ↓
   ┌────────────────────────────┐
   │  1. Extract Parameters     │
   │     code = "ABC123XYZ"     │
   │     project_id = 1         │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  2. Exchange Code          │
   │     supabase.auth          │
   │     .exchangeCodeForSession│
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  3. Session Created ✅     │
   │     User authenticated     │
   │     user.id = uuid         │
   │     user.email = email     │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  4. Database Trigger Fires │
   │     handle_new_user()      │
   │     ↓                      │
   │     INSERT INTO profiles   │
   │       role = metadata.role │
   │       email = user.email   │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  5. Fetch Profile          │
   │     SELECT * FROM profiles │
   │     WHERE id = user.id     │
   │     ↓                      │
   │     profile.role = 'client'│
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  6. Create Assignment      │
   │     INSERT INTO            │
   │     project_assignments    │
   │       user_id = user.id    │
   │       project_id = 1       │
   │     ON CONFLICT DO NOTHING │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  7. Check Password Status  │
   │     metadata.password_set  │
   │     == false?              │
   └──────┬─────────────────────┘
          │
          ├─ YES (first time)
          │
          ↓
   ┌────────────────────────────┐
   │  8. Determine Destination  │
   │     role = 'client'        │
   │     ↓                      │
   │     Get project assignments│
   │     ↓                      │
   │     destination =          │
   │     /analytics/1           │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  9. Redirect               │
   │     /set-password          │
   │     ?destination=          │
   │       /analytics/1         │
   └────────────────────────────┘
```

### Phase 4: Password Setup

```
   GET /set-password?destination=/analytics/1
          │
          ↓
   ┌────────────────────────────┐
   │  1. Page Loads             │
   │     useEffect runs         │
   │     ↓                      │
   │     Fetch current user     │
   │     setEmail(user.email)   │
   │     ↓                      │
   │     Extract destination    │
   │     setDestination(...)    │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  2. User Sees Form         │
   │  ┌──────────────────────┐  │
   │  │ Email: client@ex.com │  │
   │  │        (read-only)   │  │
   │  ├──────────────────────┤  │
   │  │ Password: __________ │  │
   │  ├──────────────────────┤  │
   │  │ Confirm:  __________ │  │
   │  ├──────────────────────┤  │
   │  │   [Set Password]     │  │
   │  └──────────────────────┘  │
   └──────┬─────────────────────┘
          │ User enters password
          │ and clicks button
          ↓
   ┌────────────────────────────┐
   │  3. Validation             │
   │     password.length >= 8?  │
   │     password == confirm?   │
   └──────┬─────────────────────┘
          │ ✅ Valid
          ↓
   ┌────────────────────────────┐
   │  4. Update Password        │
   │     supabase.auth          │
   │     .updateUser({          │
   │       password: newPass,   │
   │       data: {              │
   │         password_set: true │
   │       }                    │
   │     })                     │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  5. Password Updated ✅    │
   │     Supabase:              │
   │     - Hashes password      │
   │     - Updates user record  │
   │     - Updates metadata     │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  6. Verify Session         │
   │     supabase.auth.getUser()│
   │     Still authenticated?   │
   └──────┬─────────────────────┘
          │ ✅ Yes
          ↓
   ┌────────────────────────────┐
   │  7. Redirect to Destination│
   │     window.location.href = │
   │     '/analytics/1'         │
   └────────────────────────────┘
```

### Phase 5: Landing on Analytics

```
   GET /analytics/1
          │
          ↓
   ┌────────────────────────────┐
   │  1. Middleware Runs        │
   │     Request → Middleware   │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  2. Check Authentication   │
   │     supabase.auth.getUser()│
   │     ↓                      │
   │     User exists? ✅        │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  3. Check Role             │
   │     SELECT role FROM       │
   │     profiles WHERE id = X  │
   │     ↓                      │
   │     role = 'client' ✅     │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  4. Verify Project Access  │
   │     Is /analytics/1?       │
   │     ↓                      │
   │     Check assignments:     │
   │     SELECT project_id FROM │
   │     project_assignments    │
   │     WHERE user_id = X      │
   │     ↓                      │
   │     1 in results? ✅       │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  5. Allow Request          │
   │     NextResponse.next()    │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  6. Page Renders           │
   │  ┌──────────────────────┐  │
   │  │ Analytics Dashboard  │  │
   │  │                      │  │
   │  │ Project: My Project  │  │
   │  │                      │  │
   │  │ [Charts & Data]      │  │
   │  └──────────────────────┘  │
   └────────────────────────────┘
```

## Subsequent Login Flow

```
   User → /login
      │
      ↓
   ┌────────────────────────────┐
   │  Enter Email & Password    │
   │  [Sign In]                 │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  supabase.auth             │
   │  .signInWithPassword()     │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  Authenticate ✅           │
   │  Session created           │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  Fetch Profile             │
   │  role = 'client'           │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  Fetch Assignments         │
   │  project_ids = [1]         │
   └──────┬─────────────────────┘
          │
          ↓
   ┌────────────────────────────┐
   │  Redirect                  │
   │  /analytics/1              │
   └────────────────────────────┘
```

## Error Scenarios

### Scenario 1: Invalid Email

```
Admin → Invite Client
   ↓
Enter: "not-an-email"
   ↓
❌ Validation Error
   "Invalid email format"
```

### Scenario 2: Unauthorized Invite

```
Team Member (not assigned) → Invite to Project X
   ↓
POST /api/invite-client
   ↓
Check assignments
   ↓
❌ 403 Forbidden
   "You are not assigned to this project"
```

### Scenario 3: Profile Not Created

```
/auth/callback → Exchange code
   ↓
Get user ✅
   ↓
Fetch profile → NULL
   ↓
Wait 500ms & retry
   ↓
Fetch profile → Still NULL
   ↓
❌ Redirect /login?error=profile_missing
```

### Scenario 4: Wrong Project Access

```
Client assigned to Project 1
   ↓
Tries to access /analytics/2
   ↓
Middleware checks
   ↓
❌ Not in assignments
   ↓
Redirect → /analytics/1
```

### Scenario 5: Password Too Short

```
/set-password → Enter "abc123"
   ↓
Click "Set Password"
   ↓
Validation
   ↓
❌ "Password must be at least 8 characters"
   Show error, stay on page
```

## State Transitions

```
User State Machine:

┌─────────────┐
│  Invited    │  (email sent, no account)
└──────┬──────┘
       │ Click invite link
       ↓
┌─────────────┐
│ Registered  │  (account created, no password)
└──────┬──────┘
       │ Set password
       ↓
┌─────────────┐
│   Active    │  (account + password)
└──────┬──────┘
       │ Login
       ↓
┌─────────────┐
│Authenticated│  (session valid)
└─────────────┘
```

## Database State

```
Initial State:
┌───────────────────────────┐
│ auth.users        (empty) │
│ profiles          (empty) │
│ project_assignments       │
│                   (empty) │
└───────────────────────────┘

After Invite:
┌───────────────────────────┐
│ auth.users                │
│   id: uuid                │
│   email: client@ex.com    │
│   email_confirmed_at: NULL│
│   encrypted_password: NULL│
│   metadata:               │
│     role: 'client'        │
│     invited_to_project_id │
│     password_set: false   │
└───────────────────────────┘

After Click Link:
┌───────────────────────────┐
│ auth.users                │
│   email_confirmed_at: NOW │  ← Confirmed
│                           │
│ profiles                  │  ← Created
│   id: uuid                │
│   email: client@ex.com    │
│   role: 'client'          │
│   is_active: true         │
│                           │
│ project_assignments       │  ← Created
│   user_id: uuid           │
│   project_id: 1           │
└───────────────────────────┘

After Set Password:
┌───────────────────────────┐
│ auth.users                │
│   encrypted_password: *** │  ← Set
│   metadata:               │
│     password_set: true    │  ← Updated
└───────────────────────────┘
```

## Summary

This flow ensures:
1. ✅ Only authorized users can send invites
2. ✅ Clients are automatically registered
3. ✅ Each client sets their own password
4. ✅ Project assignment is automatic
5. ✅ Redirect is seamless
6. ✅ Security is maintained throughout
