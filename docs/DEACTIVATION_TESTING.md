# Testing User Deactivation

## Pre-Test Checklist

Before testing, make sure you have:

1. ✅ Run the SQL migrations from `DEACTIVATION_SQL.md` in Supabase SQL Editor
2. ✅ Restarted your dev server after SQL changes: `npm run dev`
3. ✅ A test account (team_member role) you can deactivate without losing access

## Test Scenario 1: Deactivate a Team Member

### Setup
- Be logged in as super_admin
- Go to `/team` page
- You should see at least one team_member (if not, invite one first)

### Test Steps
1. On the Team page, find a team_member row
2. Click the **Deactivate** button on the right
3. Confirm the button shows "Deactivating…" briefly
4. After it completes, the row should:
   - Appear greyed out (opacity-60)
   - Show "Deactivated" label in red under the email
   - Have the avatar/badge turn grey
5. The "Manage Projects" button should be disabled (greyed out)
6. A **Reactivate** button should appear instead of Deactivate

### Expected API Behavior
- `POST /api/deactivate-user` is called with `{ userId: "..." }`
- The endpoint:
  - Verifies caller is super_admin ✓
  - Prevents deactivating super_admins ✓
  - Prevents self-deactivation ✓
  - Sets `is_active = false` on the profile ✓
  - Bans the user in Supabase auth ✓

### Expected RLS Behavior
- The deactivated user can no longer log in
- All RLS policies reject their queries (blocked by `is_active = false` check)
- Their data (notes, tasks) remains intact in the database

---

## Test Scenario 2: Reactivate the Team Member

### Setup
- You have just deactivated a team_member (see Test Scenario 1)
- Still on the Team page as super_admin

### Test Steps
1. Find the deactivated (greyed out) row
2. Click the **Reactivate** button
3. Confirm the button shows "Reactivating…" briefly
4. After it completes, the row should:
   - Return to normal appearance (not greyed out)
   - Remove the "Deactivated" label
   - Avatar/badge turns blue again
   - "Manage Projects" button becomes enabled
5. The **Deactivate** button should appear again

### Expected API Behavior
- `POST /api/reactivate-user` is called with `{ userId: "..." }`
- The endpoint:
  - Verifies caller is super_admin ✓
  - Sets `is_active = true` on the profile ✓
  - Unbans the user in Supabase auth ✓

### Expected RLS Behavior
- The reactivated user can now log in again
- All RLS policies accept their queries
- They can access projects assigned to them

---

## Test Scenario 3: Verify Data Preservation

### Setup
- You have a team_member with project assignments, lead notes, and tasks
- You will deactivate and reactivate them

### Test Steps
1. Create or identify a team_member with:
   - At least one project assignment
   - Some leads with notes
   - Some tasks
2. Deactivate the team_member
3. In Supabase SQL Editor, verify the data still exists:

```sql
-- Check project assignments still exist
select * from project_assignments where user_id = '<DEACTIVATED_USER_ID>';

-- Check lead notes still exist
select * from lead_notes limit 5;

-- Check tasks still exist
select * from tasks limit 5;
```

4. Reactivate the team_member
5. If they log back in, their assigned projects should still appear
6. Their created notes and tasks should still exist (if RLS allows)

---

## Test Scenario 4: Verify Super Admin Protection

### Setup
- Be logged in as super_admin
- You have identified another super_admin account

### Test Steps
1. On the Team page, try to find the other super_admin in the list
2. **Expected**: Other super_admins should NOT appear in the team_member list (they're not invited as team_members)
3. If somehow a super_admin row appears as team_member, try to deactivate:
   - **Expected**: Get error "Cannot deactivate other super_admins"
4. Try to deactivate yourself:
   - Click Deactivate on your own row (if visible)
   - **Expected**: Get error "Cannot deactivate yourself"

---

## Test Scenario 5: Verify Deactivated User Cannot Log In

### Setup
- You have deactivated a team_member
- You have a separate browser/incognito window for testing

### Test Steps
1. Open a new browser window (or incognito tab)
2. Go to `http://localhost:3000/login`
3. Try to log in with the deactivated user's credentials
4. **Expected Outcomes**:
   - Option A: Auth rejects the login (banned in Supabase) → "User not found" or "Invalid credentials"
   - Option B: Auth allows login but RLS blocks all queries → "Unauthorized" on first data fetch
5. Sign out (or close the window)
6. Reactivate the user from the admin account
7. Try logging in again with the user's credentials
8. **Expected**: Login succeeds, user can access their assigned projects

---

## Test Scenario 6: Verify Manage Projects Button Disabled for Deactivated

### Setup
- Have both active and deactivated team_members on the Team page

### Test Steps
1. For an **active** team_member:
   - Click "Manage Projects"
   - Modal opens ✓
2. Close the modal
3. For a **deactivated** team_member:
   - Try to click "Manage Projects"
   - Button should appear greyed out (cursor: not-allowed)
   - Modal should NOT open

---

## Manual SQL Verification

After running a test, you can verify the database state:

```sql
-- Check a specific user's is_active status
select id, email, role, is_active, created_at
from public.profiles
where email = 'testuser@example.com';

-- Check all team_members and their active status
select id, email, role, is_active
from public.profiles
where role = 'team_member'
order by created_at desc;

-- Verify auth ban
-- (Go to Supabase → Authentication → Users, find the user, check "Banned" status)
```

---

## TypeScript Strict Mode Verification

The implementation uses strict TypeScript throughout:

- `POST /api/deactivate-user`: Validates `userId` exists and is a string
- `POST /api/reactivate-user`: Validates `userId` exists and is a string
- Team page component: Types all state and props correctly
- No `any` types used
- Profile type includes `is_active: boolean`

---

## Summary

After all tests pass, the deactivation feature is working correctly:

- ✅ Super admin can deactivate team members
- ✅ Deactivated users cannot log in
- ✅ Deactivated users' data is preserved
- ✅ Super admins cannot deactivate other super admins
- ✅ Super admins cannot deactivate themselves
- ✅ UI correctly shows deactivated state (greyed out, label)
- ✅ Reactivation works and users can log back in
- ✅ TypeScript is strict throughout
