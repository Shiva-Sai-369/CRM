# User Deactivation Setup Checklist

## Phase 1: SQL Setup (Do This First ⚠️)

Run these in Supabase SQL Editor in order:

- [ ] **Step 1** — Add `is_active` column
  ```sql
  alter table public.profiles
  add column is_active boolean not null default true;
  ```
  
- [ ] **Step 2** — Update `get_my_role()` function
  - Copy from `docs/DEACTIVATION_SQL.md` Step 2
  - Replace the entire function
  
- [ ] **Step 3** — Update `has_project_access()` function
  - Copy from `docs/DEACTIVATION_SQL.md` Step 3
  - Replace the entire function
  
- [ ] **Step 4** — Update RLS Policies (This is the big one)
  - Update **profiles** policies (drop old, create new)
  - Update **project_assignments** policies
  - Update **projects** policies
  - Update **google_sheets** policies
  - Update **sheet_leads** policies
  - Update **lead_notes** policies
  - Update **tasks** policies
  
  *Tip: Copy each policy group from `docs/DEACTIVATION_SQL.md` and run together*

**⏱ Time**: ~5-10 minutes

---

## Phase 2: Backend Check (Already Done ✓)

- [x] API endpoint created: `app/api/deactivate-user/route.ts`
- [x] API endpoint created: `app/api/reactivate-user/route.ts`
- [x] TypeScript types updated: `types/supabase.ts`
- [x] RBAC types updated: `types/rbac.ts`
- [x] Build passes: `npm run build` ✓

---

## Phase 3: Frontend Check (Already Done ✓)

- [x] Team page updated: `app/team/page.tsx`
- [x] Deactivate button added (red)
- [x] Reactivate button added (green)
- [x] Manage Projects button disabled for deactivated users
- [x] Deactivated rows greyed out with label
- [x] Loading states working

---

## Phase 4: Restart Dev Server (After SQL Setup)

- [ ] Stop current dev server: `Ctrl+C` in terminal
- [ ] Start new dev server: `npm run dev`
- [ ] Wait for "ready - started server on 0.0.0.0:3000, url: http://localhost:3000"

**⏱ Time**: ~30 seconds

---

## Phase 5: Test in Browser

### Test 1: Deactivate a Team Member
- [ ] Log in at `http://localhost:3000` as super_admin
- [ ] Go to `/team` page
- [ ] Find a test team_member row
- [ ] Click **Deactivate** button
- [ ] Wait for "Deactivating…" to complete
- [ ] Verify:
  - [ ] Row is greyed out (opacity-60)
  - [ ] Red "Deactivated" label appears
  - [ ] Avatar turns grey
  - [ ] Manage Projects button is disabled
  - [ ] Deactivate button → Reactivate button

**Expected result**: ✅ Row looks deactivated

### Test 2: Reactivate the Team Member
- [ ] Same row still deactivated
- [ ] Click **Reactivate** button
- [ ] Wait for "Reactivating…" to complete
- [ ] Verify:
  - [ ] Row returns to normal (full opacity)
  - [ ] Red label disappears
  - [ ] Avatar turns blue
  - [ ] Manage Projects button is enabled
  - [ ] Reactivate button → Deactivate button

**Expected result**: ✅ Row looks active again

### Test 3: Cannot Deactivate Self
- [ ] Still on `/team` page as super_admin
- [ ] Find your own row (if visible)
- [ ] Try clicking Deactivate
- [ ] Should get error toast: "Cannot deactivate yourself"

**Expected result**: ✅ Cannot self-deactivate

### Test 4: Cannot Deactivate Super Admins
- [ ] If another super_admin appears on list (shouldn't)
- [ ] Try clicking their Deactivate button
- [ ] Should get error: "Cannot deactivate other super_admins"

**Expected result**: ✅ Protected

### Test 5: Deactivated User Cannot Log In
- [ ] Open a new incognito/private browser window
- [ ] Go to `http://localhost:3000/login`
- [ ] Try to log in with deactivated user's email & password
- [ ] Should fail: "Invalid credentials" or "User not found"

**Expected result**: ✅ Login blocked

### Test 6: Reactivated User Can Log In
- [ ] Go back to admin window
- [ ] Go to `/team`
- [ ] Find the test user and Reactivate them
- [ ] Switch to incognito window
- [ ] Try to log in again with the reactivated user
- [ ] Should succeed and redirect to `/projects`

**Expected result**: ✅ Login works

---

## Phase 6: Verify Data Preservation

- [ ] Log in as super_admin
- [ ] Open Supabase SQL Editor
- [ ] Check the deactivated user's data still exists:

```sql
-- Verify is_active is false
select email, role, is_active from public.profiles
where email = 'test@example.com';

-- Verify assignments still exist (if any)
select * from public.project_assignments
where user_id = (select id from public.profiles where email = 'test@example.com');

-- Check notes still exist
select * from public.lead_notes limit 5;

-- Check tasks still exist
select * from public.tasks limit 5;
```

**Expected result**: ✅ All data present, `is_active = false`

---

## Phase 7: Verify Build

- [ ] Run: `npm run build`
- [ ] No TypeScript errors
- [ ] Build completes successfully
- [ ] Routes show:
  - `/api/deactivate-user` ✓
  - `/api/reactivate-user` ✓
  - `/team` ✓

**Expected result**: ✅ Build passes, 0 errors

---

## Phase 8: Final Sign-Off

- [ ] All SQL migrations run successfully
- [ ] Dev server restarted and running
- [ ] All 6 test scenarios passed
- [ ] Data verified in database
- [ ] Build passes with no errors
- [ ] Feature ready for production

---

## ❌ Troubleshooting If Something Fails

### "Deactivate button not showing"
- [ ] Verify you're logged in as super_admin (check sidebar)
- [ ] Verify team members exist on the page
- [ ] Hard refresh browser: `Ctrl+Shift+R`

### "Deactivate button gives error"
- [ ] Check browser console for error message
- [ ] Make sure SQL migrations ran successfully
- [ ] Restart dev server: `npm run dev`

### "Deactivated user can still log in"
- [ ] RLS policies weren't updated properly
- [ ] Re-run Step 2-4 of SQL setup
- [ ] Restart dev server after SQL changes

### "Build fails with TypeScript errors"
- [ ] Should not happen (no errors in code)
- [ ] Try: `npm run build --verbose` to see full error
- [ ] Clear node_modules: `rm -r node_modules`, then `npm install`

---

## 📚 Documentation Files

If you need help, read these in order:

1. **USER_DEACTIVATION_README.md** — Overview of feature
2. **docs/DEACTIVATION_QUICKSTART.md** — 5-minute setup
3. **docs/DEACTIVATION_SQL.md** — All SQL with explanations
4. **docs/DEACTIVATION_TESTING.md** — Detailed test scenarios
5. **docs/DEACTIVATION_IMPLEMENTATION.md** — Technical details

---

## ✅ Success!

When all checkboxes are complete, you have a production-ready user deactivation feature:

- ✅ Super admins can deactivate/reactivate users
- ✅ Deactivated users cannot log in
- ✅ All data is preserved
- ✅ Security controls enforced
- ✅ TypeScript strict mode
- ✅ Fully tested

**Estimate to complete**: 15-20 minutes

**Start with Phase 1 (SQL Setup) — that's the critical part!**
