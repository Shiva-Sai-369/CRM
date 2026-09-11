# Fix Applied: Separate Invite and Login Flows

## Problem Identified

The invite-to-login flow was **backwards**:
- ❌ Clicking an invite link did NOT redirect to `/set-password` (it should)
- ❌ A normal successful login DID redirect to `/set-password` (it should not)

### Root Cause

Both invite links AND normal password logins were routing through `/auth/callback`, which checked `!user.user_metadata?.password_set`. Since invited users had `undefined` for this field (not explicitly set), and existing users ALSO had `undefined` (Supabase doesn't auto-set it), **both flows triggered the password setup redirect**.

## Solution Implemented

### Option 2: Explicit `password_set: false` in Invites ✅

**Updated Files:**
1. `/app/api/invite-team-member/route.ts`
2. `/app/api/invite-client/route.ts`

**Changes:**
```typescript
// Before:
data: { role: 'team_member' }

// After:
data: { 
  role: 'team_member',
  password_set: false  // Explicitly mark as first-time invite
}
```

**Result:** First-time invite state is now **unambiguous** - new invites have `password_set: false`, users who have set their password have `password_set: true`.

### Option 3: Direct Login Redirection ✅

**Updated File:** `/app/login/page.tsx`

**Changes:**
- Login page now redirects **directly** to role-based destinations after `signInWithPassword()`
- Fetches user profile and project assignments client-side
- Does NOT route through `/auth/callback` anymore

**New Flow:**
```typescript
signInWithPassword(email, password)
  ↓
getUser() + fetch profile from 'profiles' table
  ↓
if (role === 'client') {
  fetch project_assignments → redirect to /analytics/[projectId]
} else {
  redirect to /projects
}
```

**Updated File:** `/app/auth/callback/route.ts`

**Changes:**
- Updated documentation to clarify this route is for **invite links ONLY**
- Changed password check from `!user.user_metadata?.password_set` to `user.user_metadata?.password_set === false`
- Now explicitly checks for `false` value (not just falsy)

## Complete Flows After Fix

### 🎫 Invite Flow (First-Time User)
1. **Admin sends invite** → `password_set: false` explicitly set in metadata
2. **User clicks invite link** → `/auth/callback?code=xxx`
3. **Callback exchanges code** → Session established
4. **Callback checks metadata** → `password_set === false` ✅ (first-time user)
5. **Redirect to `/set-password`** → With destination parameter
6. **User sets password** → Calls `updateUser({ password, data: { password_set: true } })`
7. **Redirect to destination** → User lands at `/projects` or `/analytics/[id]`

### 🔐 Normal Login Flow (Existing User)
1. **User visits `/login`** → Enters email/password
2. **Calls `signInWithPassword()`** → Supabase authenticates ✅
3. **Fetch profile directly** → Get role from `profiles` table
4. **Direct redirect** → Based on role:
   - `client` → `/analytics/[projectId]`
   - `super_admin` / `team_member` → `/projects`
5. **NO `/auth/callback` routing** ✅
6. **NO `/set-password` redirect** ✅

## Key Differences

### Before:
| Flow | Route | Check | Result |
|------|-------|-------|--------|
| Invite link | `/auth/callback` | `!undefined` = true | ✅ Redirect to `/set-password` |
| Normal login | `/auth/callback` | `!undefined` = true | ❌ WRONG: Redirect to `/set-password` |

### After:
| Flow | Route | Check | Result |
|------|-------|-------|--------|
| Invite link | `/auth/callback` | `false === false` | ✅ Redirect to `/set-password` |
| Normal login | Direct redirect from `/login` | N/A - skips callback | ✅ Direct to `/projects` or `/analytics/[id]` |

## Testing Instructions

### Test 1: Fresh Invite ✅
1. **Open browser console** (F12)
2. **Invite a NEW email** (never invited before)
3. **Click invite link**
   - Should see: `[auth/callback] password_set_value: false`
   - Should see: `[auth/callback] needsPasswordSetup: true`
   - Should land on: `/set-password` ✅
4. **Set password**
   - Should redirect to: `/projects` or `/analytics/[id]` ✅

### Test 2: Normal Login (Existing User) ✅
1. **Open browser console** (F12)
2. **Go to `/login`**
3. **Enter email/password** from Test 1
4. **Click Sign In**
   - Should see: `[login] Attempting sign in with password...`
   - Should see: `[login] Sign in successful, fetching user profile...`
   - Should see: `[login] Profile loaded, role: team_member`
   - Should see: `[login] Redirecting team_member to /projects`
   - Should **NOT** see any `[auth/callback]` logs ✅
   - Should land on: `/projects` ✅
   - Should **NOT** land on: `/set-password` ✅

### Test 3: Client Login ✅
1. **Invite a NEW client** with a project
2. **Click invite link** → Set password → Should land on `/analytics/[id]`
3. **Log out**
4. **Log back in at `/login`**
   - Should see: `[login] Redirecting client to analytics: [projectId]`
   - Should land on: `/analytics/[id]` ✅
   - Should **NOT** route through `/auth/callback` ✅

## Files Modified

1. **`/app/api/invite-team-member/route.ts`**
   - Added: `password_set: false` to invite metadata

2. **`/app/api/invite-client/route.ts`**
   - Added: `password_set: false` to invite metadata

3. **`/app/login/page.tsx`**
   - Changed: Login now fetches profile and redirects directly to role-based destination
   - Removed: Redirect through `/auth/callback`
   - Added: Console logging for debugging

4. **`/app/auth/callback/route.ts`**
   - Changed: Password check from `!password_set` to `password_set === false`
   - Updated: Documentation to clarify invite-link-only usage
   - Added: More detailed logging including actual metadata value

## Build Status

✅ **Build successful** - No TypeScript errors

```
✓ Compiled successfully
✓ Linting
✓ Collecting page data
✓ Generating static pages (18/18)
```

## Security Notes

- `password_set` still uses `user_metadata` (user-writable)
- For an internal tool, this is acceptable risk
- Can migrate to `app_metadata` (admin-only) if hardening needed
- All destination URLs are validated to prevent open redirects

## Rollback Instructions (If Needed)

If issues arise, revert these commits:
1. Revert invite API changes (remove `password_set: false`)
2. Revert login page changes (restore redirect to `/auth/callback`)
3. Revert callback route changes (restore `!password_set` check)

The system will fall back to the previous behavior where both flows route through callback.
