# Client Invite & Redirect Flow

## Overview
This document explains how the client invitation system works, including automatic account creation, password setup, and redirect to the invited project.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Admin/Team Member invites client via /api/invite-client     │
│    → Sends email with role='client' and project_id             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Client clicks invite link in email                          │
│    → Redirects to /auth/callback?code=...&project_id=X        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Auth Callback Handler                                       │
│    → Exchanges code for session                                │
│    → Creates/loads profile (via DB trigger)                    │
│    → Creates project_assignment for client + project_id        │
│    → Detects password_set=false → first-time user             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Redirect to /set-password?destination=/analytics/[projectId]│
│    → User sets their password                                  │
│    → Metadata updated: password_set=true                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Redirect to destination: /analytics/[projectId]            │
│    → Client lands directly on their project analytics         │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Steps

### 1. Invitation (Admin/Team Member)

**Endpoint:** `POST /api/invite-client`

**Request Body:**
```json
{
  "email": "client@example.com",
  "projectId": 123
}
```

**What Happens:**
- Validates that caller is `super_admin` or `team_member` assigned to the project
- Sends Supabase invite email with:
  - `role: 'client'` in user metadata
  - `invited_to_project_id: projectId` in user metadata
  - `password_set: false` flag
  - Redirect URL includes project_id: `/auth/callback?project_id=123`

**Response:**
```json
{
  "success": true,
  "userId": "uuid-here"
}
```

### 2. Client Receives Email

The client receives an email with subject: "You have been invited"

Email contains a magic link that looks like:
```
https://yourapp.com/auth/callback?code=ABC123&project_id=123
```

### 3. Auth Callback Processing

**Route:** `GET /auth/callback`

**Query Parameters:**
- `code`: Auth code from Supabase (required)
- `project_id`: Project the client was invited to (optional, fallback to metadata)
- `next`: Redirect destination after auth (optional, default: /projects)

**Processing Steps:**

1. **Exchange code for session**
   ```typescript
   await supabase.auth.exchangeCodeForSession(code)
   ```

2. **Load user and profile**
   - User is authenticated via session
   - Profile is created automatically via DB trigger
   - Retries once if profile not immediately available

3. **Create project assignment** (for clients only)
   ```typescript
   if (role === 'client' && projectId) {
     await supabase
       .from('project_assignments')
       .upsert({ user_id, project_id: projectId })
   }
   ```

4. **Check if first-time user**
   ```typescript
   const needsPasswordSetup = user.user_metadata?.password_set === false
   ```

5. **Route based on password status:**

   **First-time user (password_set: false):**
   ```
   → /set-password?destination=/analytics/123
   ```

   **Existing user (password_set: true):**
   ```
   → /analytics/123 (client)
   → /projects (super_admin/team_member)
   ```

### 4. Password Setup

**Route:** `GET /set-password`

**Query Parameters:**
- `destination`: Where to redirect after password is set

**What User Sees:**
- Email field (read-only, pre-filled)
- Password field (minimum 8 characters)
- Confirm password field
- "Set Password & Continue" button

**What Happens:**
1. User enters and confirms password
2. Calls `supabase.auth.updateUser()` with:
   ```typescript
   {
     password: newPassword,
     data: { password_set: true }
   }
   ```
3. Verifies session is still valid
4. Redirects to destination (e.g., `/analytics/123`)

### 5. Landing on Project Analytics

The client is now:
- ✅ Authenticated with their own password
- ✅ Assigned to the correct project
- ✅ Viewing their project analytics dashboard

## Login Page Note

The login page includes a helpful note for first-time users:

```
First time signing in? Check your email for the invite link.
You'll be prompted to set your password after clicking the link.
```

This ensures users understand they need to use the invite link, not try to login immediately.

## Security Features

### 1. Email Verification
- Users can only be invited by authorized admins/team members
- Email must match the invited email address

### 2. No Default Password Attacks
- No universal default password exists
- Each user must set a unique password on first login
- Password must be minimum 8 characters

### 3. Role-Based Access
- Clients can only access their assigned project(s)
- Middleware enforces role-based routing
- Project assignments are validated server-side

### 4. Session Management
- Sessions are handled by Supabase Auth
- Secure cookie-based authentication
- Automatic session refresh via middleware

### 5. Idempotent Project Assignment
- Project assignments use `upsert` to prevent duplicates
- Composite primary key (user_id, project_id) enforced at DB level

## Error Handling

### Profile Missing
If profile doesn't exist after auth:
```
→ /login?error=profile_missing
```

### No Project Assignment
If client has no project after invite:
```
→ /login?error=no_project
```

### Auth Failed
If code exchange fails:
```
→ /login?error=auth_failed
```

### No Session
If user tries to access /set-password without session:
```
→ /login?error=no_session
```

## Database Tables

### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'team_member', 'client')),
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);
```

### project_assignments
```sql
CREATE TABLE project_assignments (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  project_id INTEGER NOT NULL REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, project_id)
);
```

## Testing the Flow

### 1. Invite a Client
```bash
curl -X POST http://localhost:3000/api/invite-client \
  -H "Content-Type: application/json" \
  -d '{"email":"client@test.com","projectId":1}' \
  -b "session_cookie"
```

### 2. Check Email
- Open email client for `client@test.com`
- Click the invite link

### 3. Set Password
- Should land on `/set-password` page
- Enter password (min 8 chars)
- Click "Set Password & Continue"

### 4. Verify Redirect
- Should land on `/analytics/1`
- Should see project analytics dashboard
- Should NOT be able to access `/projects` (middleware blocks)

### 5. Test Login
- Logout
- Go to `/login`
- Enter email and password
- Should redirect directly to `/analytics/1`

## Common Issues & Solutions

### Issue: Profile not created
**Symptom:** Redirect to `/login?error=profile_missing`

**Solution:** Check that the database trigger is working:
```sql
-- Verify trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check trigger function
\df handle_new_user
```

### Issue: Client lands on /projects instead of /analytics
**Symptom:** Client sees project list instead of analytics

**Solution:** Check project_assignments table:
```sql
SELECT * FROM project_assignments WHERE user_id = 'client-uuid';
```

### Issue: Password setup doesn't work
**Symptom:** Error on /set-password page

**Solution:** 
1. Check browser console for errors
2. Verify session is valid
3. Check Supabase Auth logs

### Issue: Middleware redirects in a loop
**Symptom:** Browser shows "too many redirects"

**Solution:** Check middleware.ts role-based routing logic and ensure profile.role matches expected values.

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Future Enhancements

1. **Email Templates**: Customize invite email with project name
2. **Expiring Invites**: Add expiration time to invite links
3. **Resend Invite**: Allow admins to resend invite emails
4. **Bulk Invite**: Invite multiple clients at once
5. **Invite History**: Track who invited whom and when
