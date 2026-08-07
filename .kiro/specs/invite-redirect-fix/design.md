# Invite Redirect Fix - Bugfix Design

## Overview

This bugfix addresses the issue where invited users accepting email invites are immediately redirected to role-based destinations without being prompted to set their password first. The fix introduces a first-time login detection mechanism in `/auth/callback` that identifies when a user needs to establish credentials, redirects them to a new "Set Password" page (`/set-password`), and then routes them to the appropriate role-based destination after password setup is complete.

The solution also simplifies the authentication system to password-only by removing all magic link functionality from the login page.

The solution ensures:
1. All first-time invite acceptances trigger password setup before dashboard access
2. Existing users with passwords continue to use normal login flow
3. Role-based redirection remains intact after password setup
4. All existing RBAC and invite metadata handling is preserved
5. Login page uses only password-based authentication (no magic link tabs)

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a user accepts an invite link for the first time and has no password established yet
- **Property (P)**: The desired behavior when first-time invites are accepted - users should be redirected to `/set-password` before accessing their role-based destination
- **Preservation**: Existing login flow, role-based redirection, and invite metadata handling that must remain unchanged
- **First-time login**: A session established via invite link acceptance where the user has not yet set a password (detected via `user.app_metadata.provider === 'email'` and absence of password authentication)
- **user_metadata.role**: The role assigned during invite creation (`super_admin`, `team_member`, or `client`)
- **user_metadata.invited_to_project_id**: The project ID stored for client invites, used to create project_assignments
- **needs_password_setup**: A boolean flag indicating whether the user should be redirected to `/set-password`

## Bug Details

### Bug Condition

The bug manifests when a user clicks an invite link sent via Supabase Auth's `admin.inviteUserByEmail()` method. The `/auth/callback` route exchanges the auth code for a session and immediately redirects based on role without checking if this is a first-time login requiring password setup.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type AuthCallbackRequest
  OUTPUT: boolean
  
  RETURN input.user.isAuthenticated
         AND input.user.metadata.role IN ['super_admin', 'team_member', 'client']
         AND input.user.isFirstTimeLogin
         AND NOT input.user.hasPasswordSet
END FUNCTION
```

### Examples

- **Super Admin Invite**: User accepts invite link → `/auth/callback` establishes session → immediately redirects to `/projects` → user never sets password
- **Team Member Invite**: User accepts invite link → `/auth/callback` establishes session → immediately redirects to `/projects` → user never sets password
- **Client Invite**: User accepts invite link → `/auth/callback` establishes session → creates project_assignments row → immediately redirects to `/analytics/[project_id]` → user never sets password
- **Edge Case - Existing User**: User with password logs in via email/password → `/auth/callback` establishes session → redirects to role-based destination (no password prompt, **expected behavior**)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Existing users with passwords must continue to log in via email/password and be redirected to role-based destinations
- Client invites must continue to create the `project_assignments` row using `invited_to_project_id` from metadata
- Team member invites must continue to create profiles with role `team_member` and zero initial project assignments
- Role-based authorization rules must continue to enforce existing RBAC policies
- The middleware must continue to enforce role-based access control on all protected routes

**Scope:**
All inputs that do NOT involve first-time invite acceptance should be completely unaffected by this fix. This includes:
- Email/password login attempts by existing users
- Role-based redirection logic after password is established
- Profile creation via database triggers
- Project assignment logic for client invites

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Missing First-Time Login Detection**: The `/auth/callback` route does not check whether the authenticated user is accepting an invite for the first time versus logging in with existing credentials.

2. **No Password Setup Flow**: There is no dedicated page or flow for invited users to establish their password before accessing the application.

3. **Immediate Role-Based Redirection**: The callback route immediately redirects to role-based destinations without checking if credential setup is required.

4. **Supabase Invite Mechanism**: When `admin.inviteUserByEmail()` is called, Supabase creates an email link that establishes a session on click but does not require password setup before the session is active. The application must detect this state and prompt for password setup.

## Correctness Properties

Property 1: Bug Condition - First-Time Login Triggers Password Setup

_For any_ authentication callback where a user accepts an invite link for the first time (has no password set), the fixed `/auth/callback` route SHALL redirect the user to `/set-password` with their intended destination stored in session state, preventing access to role-based destinations until password setup is complete.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Existing Login Flow

_For any_ authentication callback where a user logs in with an existing password (not a first-time invite), the fixed `/auth/callback` route SHALL produce exactly the same behavior as the original route, redirecting users to their role-based destinations without prompting for password setup.

**Validates: Requirements 3.1, 3.2, 3.3, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, we need to implement first-time login detection and a password setup flow.

**File 1**: `/app/auth/callback/route.ts`

**Function**: `GET` (main callback handler)

**Specific Changes**:

1. **Add First-Time Login Detection**: After establishing session and fetching user, detect if this is a first-time invite acceptance:
   ```typescript
   // Check if user needs to set password (first-time invite)
   const needsPasswordSetup = !user.user_metadata?.password_set
   ```

2. **Conditional Redirection**: Before role-based redirection logic, check if password setup is needed:
   ```typescript
   if (needsPasswordSetup) {
     // Store intended destination in session/cookie for post-setup redirect
     const intendedDestination = profile.role === 'client' 
       ? `/analytics/${projectIds[0]}` 
       : next;
     
     // Redirect to password setup page
     return NextResponse.redirect(
       `${origin}/set-password?destination=${encodeURIComponent(intendedDestination)}`
     );
   }
   ```

3. **Security Note**: The current implementation uses `user.user_metadata?.password_set` to detect first-time logins. This is user-writable metadata and could theoretically be manipulated. For this internal tool, the risk is low and acceptable. If hardening security becomes necessary, consider migrating to `app_metadata` (admin-only) or checking password authentication factors directly.

3. **Mark Password as Set**: The callback will need to mark that password setup is complete after the user updates their password (handled by `/set-password` page calling Supabase's `updateUser` API).

4. **Preserve Existing Logic**: All existing profile fetching, retry logic, project_assignments creation for clients, and role-based redirection remains unchanged for users who have already set passwords.

**File 2**: `/app/set-password/page.tsx` (new file)

**Purpose**: New page component for password setup flow

**Specific Changes**:

1. **Create Password Setup Form**: Build a client-side form that:
   - Displays user's email (read-only)
   - Provides password and confirm password fields
   - Validates password strength (minimum 8 characters)
   - Shows validation errors inline

2. **Call Supabase Update Password API**: On form submission:
   ```typescript
   const supabase = createBrowserClient(...)
   const { error } = await supabase.auth.updateUser({
     password: newPassword,
     data: { password_set: true }
   })
   ```

3. **Handle Post-Setup Redirection**: After successful password update:
   - Read `destination` query parameter
   - **Validate destination for security**:
     - Must start with `/` (relative path)
     - Must NOT start with `//` (protocol-relative URL)
     - Must NOT contain `http://` or `https://` (absolute URL)
     - If validation fails, fall back to `/projects`
   - Redirect to validated destination (role-based URL)
   - Default to `/projects` if destination is missing or invalid

4. **Error Handling**: Display Supabase errors (weak password, network issues) and allow retry

5. **UI/UX Consistency**: Use the same dark theme and styling as the login page (dark background with gradient blobs, card layout) but WITHOUT the tab switcher - only show password input fields

**File 3**: `/app/login/page.tsx`

**Function**: Login page component

**Specific Changes**:

1. **Remove Tab Switcher**: Remove the `tab` state and the tab switcher UI that toggles between 'password' and 'magic' modes
   - Remove the `type Tab = 'password' | 'magic'` type
   - Remove the `const [tab, setTab] = useState<Tab>('password')` state
   - Remove the entire tab switcher div with id `tab-password` and `tab-magic-link` buttons

2. **Remove Magic Link Handler**: Remove the `handleMagicLink()` function entirely

3. **Simplify UI to Password-Only**:
   - Always show both email and password input fields (no conditional rendering)
   - Remove the magic link description text that says "We'll email you a one-time sign-in link. No password needed."
   - Update the submit button to always call `handlePassword()` and always display "Sign In" text
   - Remove the `tab === 'password' ? handlePassword : handleMagicLink` conditional logic

4. **Preserve Existing Functionality**:
   - Keep all email/password authentication logic unchanged
   - Keep error handling, success messages, and loading states
   - Keep the UI styling and layout (dark theme, gradient background, card layout)
   - Keep keyboard shortcuts (Enter key to submit)

**File 4**: `/middleware.ts`

**Function**: `middleware` (auth guard)

**Specific Changes**:

1. **Add `/set-password` to Public Routes**: Update `PUBLIC_ROUTES` to include `/set-password` so authenticated users can access it:
   ```typescript
   const PUBLIC_ROUTES = new Set(['/login', '/auth/callback', '/set-password']);
   ```

2. **No Other Middleware Changes**: All existing role-based access control logic remains unchanged

**File 5**: `/app/api/invite-team-member/route.ts` and `/app/api/invite-client/route.ts`

**Function**: `POST` handlers for sending invites

**Specific Changes**: **NONE** - These files do not need modification. The metadata (`role`, `invited_to_project_id`) is already correctly set. The fix is purely in the callback and password setup flow.

### Data Flow Diagram

```
[Invite Email Link] 
       |
       v
[/auth/callback?code=xxx]
       |
       v
[Exchange code for session]
       |
       v
[Fetch user + profile]
       |
       v
[Check: needs_password_setup?]
       |
       +--- YES ---> [Redirect to /set-password?destination=<role-based-url>]
       |                    |
       |                    v
       |             [User sets password]
       |                    |
       |                    v
       |             [updateUser({ password, data: { password_set: true } })]
       |                    |
       |                    v
       |             [Redirect to destination from query param]
       |
       +--- NO ----> [Continue with existing role-based redirection]
                            |
                            v
                     [super_admin/team_member -> /projects]
                     [client -> /analytics/[project_id]]
```

### Sequence Diagram - First-Time Invite Flow

```
User                Browser              /auth/callback           /set-password         Supabase
 |                      |                       |                       |                    |
 |-- Click Invite ----->|                       |                       |                    |
 |                      |-- GET /auth/callback?code=xxx --------------->|                    |
 |                      |                       |-- exchangeCodeForSession() ------------->|
 |                      |                       |<-------- session ------------------------|
 |                      |                       |-- getUser() ---------------------------->|
 |                      |                       |<-------- user (no password_set) ---------|
 |                      |                       |-- getUserProfile() --------------------->|
 |                      |                       |<-------- profile ------------------------|
 |                      |                       |                       |                    |
 |                      |                       |-- Detect needs_password_setup = true ----|
 |                      |                       |                       |                    |
 |                      |<-- Redirect /set-password?destination=... ----|                    |
 |                      |                       |                       |                    |
 |                      |-- GET /set-password ----------------------->|                    |
 |                      |<-------- Render password form ---------------|                    |
 |                      |                       |                       |                    |
 |<-- Show Form --------|                       |                       |                    |
 |                      |                       |                       |                    |
 |-- Enter Password --->|                       |                       |                    |
 |-- Submit Form ------>|                       |                       |                    |
 |                      |-- updateUser({ password, data: { password_set: true } }) -------->|
 |                      |<-------- success -------------------------------------------------|
 |                      |                       |                       |                    |
 |                      |-- window.location.href = destination -------->|                    |
 |                      |                       |                       |                    |
 |<-- Redirect to /projects or /analytics/[id] (role-based) --------------------------->|
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code (exploratory testing), then verify the fix works correctly and preserves existing behavior (fix checking and preservation checking).

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Manually test the invite flow on UNFIXED code by sending invites via the UI and observing that users are redirected to role-based destinations without password setup prompts.

**Test Cases**:
1. **Super Admin Invite Test**: Send invite via `/api/invite-team-member` with role `super_admin` → Click invite link → Observe immediate redirect to `/projects` without password prompt (will fail on unfixed code - demonstrates bug)
2. **Team Member Invite Test**: Send invite via `/api/invite-team-member` with role `team_member` → Click invite link → Observe immediate redirect to `/projects` without password prompt (will fail on unfixed code - demonstrates bug)
3. **Client Invite Test**: Send invite via `/api/invite-client` with role `client` and `projectId` → Click invite link → Observe immediate redirect to `/analytics/[project_id]` without password prompt (will fail on unfixed code - demonstrates bug)
4. **Edge Case - Retry Profile Fetch**: Send invite → Click link immediately (before profile trigger completes) → Observe if retry logic works and still skips password prompt (will fail on unfixed code - demonstrates bug even with retry)

**Expected Counterexamples**:
- Users are redirected to `/projects` or `/analytics/[id]` immediately after clicking invite links
- No password setup page is displayed
- Users have active sessions but no password credentials established
- Possible cause: Missing first-time login detection in `/auth/callback`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (first-time invite acceptance), the fixed function produces the expected behavior (redirect to `/set-password`).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := authCallback_fixed(input)
  ASSERT result.redirectUrl CONTAINS '/set-password'
  ASSERT result.redirectUrl CONTAINS 'destination=' parameter
  ASSERT user can set password on /set-password page
  ASSERT after password setup, user is redirected to destination
END FOR
```

**Test Cases**:
1. **Super Admin First-Time Login**: Send super_admin invite → Click link → Verify redirect to `/set-password?destination=/projects` → Set password → Verify redirect to `/projects`
2. **Team Member First-Time Login**: Send team_member invite → Click link → Verify redirect to `/set-password?destination=/projects` → Set password → Verify redirect to `/projects`
3. **Client First-Time Login**: Send client invite with projectId → Click link → Verify redirect to `/set-password?destination=/analytics/[id]` → Set password → Verify redirect to `/analytics/[id]`
4. **Password Strength Validation**: Attempt to set weak password (< 8 chars) → Verify Supabase returns error → Verify error is displayed in UI → Retry with strong password → Verify success

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (existing users with passwords), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT authCallback_original(input) = authCallback_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Manually test existing login flows on UNFIXED code first to observe current behavior, then verify the same behavior on FIXED code.

**Test Cases**:
1. **Email/Password Login Preservation (Super Admin)**: Create user with password → Log in via `/login` with email/password → Observe redirect to `/projects` on unfixed code → Verify same behavior on fixed code (no `/set-password` prompt)
2. **Email/Password Login Preservation (Team Member)**: Create user with password → Log in via `/login` with email/password → Observe redirect to `/projects` or `/no-projects` on unfixed code → Verify same behavior on fixed code
3. **Email/Password Login Preservation (Client)**: Create user with password → Log in via `/login` with email/password → Observe redirect to `/analytics/[id]` on unfixed code → Verify same behavior on fixed code
4. **Client Project Assignment Preservation**: Send client invite → Accept invite → Set password on `/set-password` → Verify `project_assignments` row exists with correct `user_id` and `project_id`
5. **Middleware Authorization Preservation**: After password setup, verify middleware correctly enforces role-based access (clients can't access `/team`, team_members can't access client analytics, etc.)

### Unit Tests

- Test `isBugCondition()` logic: verify detection of first-time logins vs existing users
- Test `/set-password` form validation: weak passwords, mismatched passwords, empty fields
- Test destination parameter parsing: valid URLs, missing destination, malformed destination
- Test `updateUser()` error handling: network errors, Supabase validation errors

### Property-Based Tests

- Generate random user states (new vs existing, different roles) and verify correct redirection logic
- Generate random password inputs and verify Supabase validation is correctly surfaced
- Test across many invite scenarios to verify project_assignments creation is preserved for clients

### Integration Tests

- Test full invite-to-login flow: send invite → accept → set password → verify access to role-based destination
- Test profile retry logic: accept invite before profile trigger completes → verify password setup still triggers
- Test role-based access after password setup: set password → verify middleware allows access to authorized routes only
- Test that users who set passwords can subsequently log in via email/password without being redirected to `/set-password` again
