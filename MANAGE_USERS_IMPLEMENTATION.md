# Manage Users Page - Implementation Summary

## What Was Built

A comprehensive "Manage All Users" page for super_admins to view and manage all users in one place. This page allows updating user roles, active status, and project assignments without needing to navigate between multiple pages.

## Features

### 1. **All Users View**
- Displays all users (super_admins, team_members, and clients) in a single table
- Shows user info: name, email, role, status, assigned projects, and join date
- Color-coded user avatars by role (blue=super_admin, green=team_member, purple=client)
- Stats strip showing total users, active super_admins, team members, and clients

### 2. **Role Management**
- Inline dropdown for each user to change their role
- Three roles: super_admin, team_member, client
- Last-super_admin lockout: prevents demoting the only active super_admin
- Changes take effect immediately with confirmation toast

### 3. **Status Toggle**
- Active/Inactive button for each user
- Clicking toggles between active and inactive states
- Reuses existing deactivation logic (bans user in Supabase Auth)
- Last-super_admin lockout: prevents deactivating the only active super_admin
- Cannot deactivate yourself

### 4. **Project Assignment**
- "Assign Projects" button for clients and team_members
- Opens a modal with checkboxes for all available projects
- Shows current assignments pre-selected
- Saves changes with a single click
- Automatically adds/removes project_assignment rows

### 5. **Security**
- All API routes verify requester is super_admin (403 if not)
- Uses service role client (bypasses RLS) for admin operations
- Last-super_admin guard prevents system lockout
- Current user marked with "You" badge

## Files Created

### API Routes

1. **`app/api/all-users/route.ts`**
   - GET endpoint to fetch all users with their project assignments
   - super_admin only
   - Returns UserWithAssignments[] (profiles + assignments)

2. **`app/api/update-user-role/route.ts`**
   - POST endpoint to update a user's role
   - Accepts: `{ userId, role }`
   - Last-super_admin guard: blocks demoting the only active super_admin
   - Updates both profiles.role and auth user_metadata

3. **`app/api/update-user-status/route.ts`**
   - POST endpoint to activate/deactivate users
   - Accepts: `{ userId, isActive }`
   - Last-super_admin guard: blocks deactivating the only active super_admin
   - Cannot deactivate yourself
   - Updates profiles.is_active and bans/unbans in Supabase Auth

4. **`app/api/update-user-projects/route.ts`**
   - POST endpoint to update project assignments
   - Accepts: `{ userId, projectIds }`
   - Calculates diff and inserts/deletes project_assignments rows
   - Returns count of added and removed assignments

### UI Components

5. **`app/team/manage/page.tsx`**
   - Main "Manage All Users" page
   - Table view with inline controls
   - Access check: redirects non-super_admins to /projects
   - Stats strip with user counts by role
   - UserRow component with role dropdown, status toggle, and project button
   - ProjectAssignmentModal component for multi-select project assignment

### Updated Files

6. **`app/team/page.tsx`**
   - Added "Manage All Users" button in header
   - Button navigates to /team/manage
   - Added useRouter import

## How It Works

### Role Change Flow
```
1. User selects new role from dropdown
2. Frontend calls POST /api/update-user-role
3. API checks if requester is super_admin
4. API verifies last-super_admin guard (if demoting super_admin)
5. API updates profiles.role and auth user_metadata
6. Frontend shows success toast and refetches user list
```

### Status Toggle Flow
```
1. User clicks Active/Inactive button
2. Frontend calls POST /api/update-user-status
3. API checks if requester is super_admin
4. API verifies last-super_admin guard (if deactivating super_admin)
5. API updates profiles.is_active
6. API bans/unbans user in Supabase Auth
7. Frontend shows success toast and refetches user list
```

### Project Assignment Flow
```
1. User clicks "Assign Projects" or "N projects" button
2. Modal opens with checkboxes for all projects
3. Current assignments pre-selected
4. User toggles project checkboxes
5. User clicks "Save Changes"
6. Frontend calls POST /api/update-user-projects
7. API calculates diff (toAdd and toRemove)
8. API deletes removed assignments
9. API inserts new assignments
10. Frontend shows success toast and refetches user list
```

## Security Model

All API routes follow this pattern:
1. Extract session user from cookie-based supabase client
2. Verify user is authenticated (401 if not)
3. Fetch user profile from profiles table
4. Verify role is super_admin (403 if not)
5. Use admin client (service role) for database operations
6. Apply business logic guards (last-super_admin, cannot deactivate self)
7. Return success/error response

The service role client is NEVER exposed to the client. All operations go through API routes that enforce authorization.

## Last-Super_Admin Lockout

The system prevents locking yourself out by:
1. Counting active super_admins before any demotion/deactivation
2. Blocking the operation if count would drop to zero
3. Returning clear error message: "Cannot demote/deactivate the last super_admin. Promote another user first."

This guard is implemented in:
- `update-user-role` (when demoting super_admin → team_member/client)
- `update-user-status` (when deactivating a super_admin)

## Access Control

- Route: `/team/manage` - super_admin only (enforced by page-level redirect)
- All API routes verify super_admin role server-side
- Team members and clients are blocked by client-side redirect
- Middleware already allows super_admin to access all /team/* routes

## Testing Steps

### Test 1: Promote Team Member to Super Admin
1. Log in as super_admin
2. Go to `/team/manage`
3. Find a team_member user
4. Change role dropdown from "Team Member" to "Super Admin"
5. **Expected**: Success toast shows "Role updated to super_admin"
6. **Expected**: User's role badge updates to blue (super_admin color)
7. **Expected**: Super Admins stat increases by 1

### Test 2: Demote Back to Team Member
1. In same table, find the newly promoted super_admin
2. Change role dropdown from "Super Admin" to "Team Member"
3. **Expected**: Success toast shows "Role updated to team_member"
4. **Expected**: User's role badge updates to green (team_member color)
5. **Expected**: Super Admins stat decreases by 1

### Test 3: Reassign Client to Different Project
1. Find a client user in the table
2. Click their project assignment button (shows "N projects" or "Assign Projects")
3. **Expected**: Modal opens with list of projects
4. Uncheck their current project
5. Check a different project
6. Click "Save Changes"
7. **Expected**: Success toast shows "Projects updated"
8. **Expected**: Button now shows the new project count

### Test 4: Last-Super_Admin Lockout (Role Change)
1. Demote all other super_admins to team_member (leave only yourself)
2. **Expected**: Stats show "1" Super Admin
3. Try to demote yourself from "Super Admin" to "Team Member"
4. **Expected**: Error toast shows "Cannot demote the last super_admin. Promote another user first."
5. **Expected**: Your role remains super_admin

### Test 5: Last-Super_Admin Lockout (Status Toggle)
1. Ensure you're the only active super_admin
2. Click your "Active" status button
3. **Expected**: Error toast shows "Cannot deactivate the last active super_admin"
4. **Expected**: Your status remains Active

### Test 6: Cannot Deactivate Yourself
1. With multiple super_admins active
2. Try to deactivate yourself by clicking your "Active" button
3. **Expected**: Error toast shows "Cannot deactivate yourself"
4. **Expected**: Your status remains Active

### Test 7: Toggle User Status
1. Find an inactive user
2. Click their "Inactive" button
3. **Expected**: Success toast shows "User [email] activated"
4. **Expected**: Button changes to "Active" with green styling
5. Click "Active" button
6. **Expected**: Success toast shows "User [email] deactivated"
7. **Expected**: Button changes to "Inactive" with gray styling

### Test 8: Assign Multiple Projects to Client
1. Find a client with 0 projects
2. Click "Assign Projects"
3. Check 3 different projects
4. Click "Save Changes"
5. **Expected**: Success toast shows "Projects updated"
6. **Expected**: Button shows "3 projects"

## Notes

- The page auto-refreshes the user list after any change
- All changes are immediate (no batch operations)
- The service role client bypasses RLS, so super_admins can modify any user
- The existing team page (/team) remains unchanged for team_member-specific management
- The new page (/team/manage) provides global user management
- Project assignments only shown for clients and team_members (N/A for super_admins)

## Future Enhancements

Potential improvements:
1. Bulk operations (select multiple users, apply changes to all)
2. Search/filter users by role, status, or email
3. Sort table by any column
4. Export user list to CSV
5. User activity logs (last login, recent changes)
6. Batch project assignment (assign project to multiple users at once)
7. Inline editing of full_name
