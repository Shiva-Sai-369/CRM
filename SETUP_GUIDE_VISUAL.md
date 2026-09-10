# User Deactivation Setup — Visual Guide

## 🎯 The Goal

Enable super admins to deactivate team members on the Team page.

Before:
```
Team Page
┌─────────────────────────────────────────────────┐
│ Member | Projects | Joined | Actions            │
│─────────────────────────────────────────────────│
│ Alice  | Project A| Jan 15 | [Manage Projects]  │
│ Bob    | Project B| Jan 20 | [Manage Projects]  │
│ Carol  | none     | Jan 22 | [Manage Projects]  │
└─────────────────────────────────────────────────┘
```

After:
```
Team Page
┌──────────────────────────────────────────────────────────┐
│ Member | Projects | Joined | Actions                      │
│──────────────────────────────────────────────────────────│
│ Alice  | Project A| Jan 15 | [Manage][Deactivate]        │
│ Bob    | Project B| Jan 20 | [Manage][Deactivate]        │
│ Carol* | none     | Jan 22 | [Manage*][Reactivate]       │
│ Deactivated (red) |        |        *disabled             │
└──────────────────────────────────────────────────────────┘

* = deactivated (greyed out)
```

---

## 🔧 The Setup (3 Steps)

### Step 1: Run SQL in Supabase (10 min)

Go to: **Supabase Dashboard → SQL Editor → New Query**

```
1. Add is_active column
   ↓ Copy from DEACTIVATION_SQL.md Step 1
   ↓ Paste and run
   ↓ Done

2. Update get_my_role() function
   ↓ Copy from DEACTIVATION_SQL.md Step 2
   ↓ Paste and run
   ↓ Done

3. Update has_project_access() function
   ↓ Copy from DEACTIVATION_SQL.md Step 3
   ↓ Paste and run
   ↓ Done

4. Update all RLS policies
   ↓ Copy each policy group from DEACTIVATION_SQL.md Step 4
   ↓ Paste and run each section
   ↓ Done (profiles, project_assignments, projects, etc.)
```

**Result**: Database ready ✅

### Step 2: Restart Dev Server (30 sec)

In your terminal:
```
1. Press Ctrl+C to stop current server
   ↓
2. Run: npm run dev
   ↓
3. Wait for: "ready - started server on 0.0.0.0:3000"
   ↓
   Done ✅
```

**Result**: Code loaded ✅

### Step 3: Test in Browser (5 min)

Go to: `http://localhost:3000/team`

```
1. You should be logged in as super_admin
   ↓
2. You should see team members in a table
   ↓
3. Find any team member row
   ↓
4. Click [Deactivate] button (red, on the right)
   ↓
5. Row becomes greyed out, shows "Deactivated" label
   ↓
   Result: ✅ Deactivate works!

6. Click [Reactivate] button (green, on the right)
   ↓
7. Row returns to normal color
   ↓
   Result: ✅ Reactivate works!
```

**Result**: Feature working ✅

---

## 🚀 What Happens Next

### User Perspective

**Before deactivation:**
```
User (Bob) logs in at /login
    ↓
Authentication succeeds
    ↓
Redirected to /projects
    ↓
Can see, create, edit projects, leads, tasks
```

**After deactivation (by super_admin):**
```
Super Admin (Alice) clicks [Deactivate] on Bob's row
    ↓
API sets is_active = false, bans in Supabase auth
    ↓
UI shows row greyed out with red label
    ↓

Bob tries to log in at /login
    ↓
Login fails (user is banned)
    ↓
Bob gets error: "Invalid credentials"
    ↓
Bob's data (notes, tasks, assignments) still exists in database
```

**After reactivation:**
```
Super Admin (Alice) clicks [Reactivate] on Bob's row
    ↓
API sets is_active = true, unbans in Supabase auth
    ↓
UI shows row returns to normal
    ↓

Bob tries to log in again
    ↓
Login succeeds
    ↓
Bob can access projects and his data again
```

---

## 📂 Where Everything Is

### Frontend
```
app/team/page.tsx
├── Displays team members
├── Shows [Deactivate] for active users (red)
├── Shows [Reactivate] for deactivated users (green)
├── Disables [Manage Projects] for deactivated
└── Greyed out rows for deactivated
```

### Backend
```
app/api/
├── deactivate-user/route.ts
│   └── POST endpoint, super_admin only
│       Validates, sets is_active=false, bans in auth
│
└── reactivate-user/route.ts
    └── POST endpoint, super_admin only
        Validates, sets is_active=true, unbans in auth
```

### Database
```
profiles table
├── Has new column: is_active (boolean, default true)
├── When is_active = false
│   └── RLS policies block ALL queries
│   └── User cannot log in
│
└── When is_active = true
    └── RLS policies allow queries
    └── User can log in normally
```

---

## 🔒 Security Layers

### Layer 1: API Authorization
```
POST /api/deactivate-user { userId }
    ↓
Check: is caller super_admin?
    ↓ No → return 403 Forbidden
    ↓ Yes → continue
Check: is target a super_admin?
    ↓ Yes → return 403 Cannot deactivate super_admins
    ↓ No → continue
Check: is target the caller?
    ↓ Yes → return 400 Cannot deactivate yourself
    ↓ No → continue
Check: does target exist?
    ↓ No → return 404 User not found
    ↓ Yes → continue
    ↓
Proceed with deactivation ✓
```

### Layer 2: RLS Policies
```
Deactivated user tries to query projects
    ↓
RLS policy checks: get_my_role() = 'super_admin'?
    ↓
get_my_role() function checks: is_active = true?
    ↓ No (is_active = false)
    ↓ Returns NULL
    ↓ Policy fails: NULL != 'super_admin'
    ↓
Query rejected ✗ Unauthorized
```

### Layer 3: Auth Ban
```
Deactivated user tries to log in
    ↓
Supabase auth checks: is user banned?
    ↓ Yes (set during deactivation)
    ↓
Login rejected ✗ Invalid credentials
```

---

## 📊 UI Changes

### Active User Row
```
✓ Normal opacity (100%)
✓ Blue avatar badge
✓ White text
✓ [Manage Projects] enabled
✓ [Deactivate] button visible (red)
```

### Deactivated User Row
```
✗ Reduced opacity (60%)
✗ Grey avatar badge
✗ Greyed out text
✗ "Deactivated" label (red) under email
✗ [Manage Projects] disabled
✗ [Reactivate] button instead of Deactivate (green)
```

---

## 🧪 Quick Test

### Test: Can I deactivate a team member?

```
1. Go to http://localhost:3000/team
2. Find any team member
3. Click red [Deactivate] button
4. Wait for button to show "Deactivating…"
5. Row should turn grey with red label

Result: ✅ YES
```

### Test: Can I reactivate them?

```
1. Same row should have green [Reactivate] button
2. Click it
3. Wait for button to show "Reactivating…"
4. Row should return to normal

Result: ✅ YES
```

### Test: Can the deactivated user log in?

```
1. Open new incognito window
2. Go to http://localhost:3000/login
3. Enter deactivated user's email and password
4. Click login

Result: ❌ NO (error: Invalid credentials)
```

### Test: Can I reactivate and they log in again?

```
1. Go back to /team as admin
2. Click [Reactivate]
3. Switch to incognito window
4. Try logging in again with same credentials

Result: ✅ YES (login succeeds)
```

---

## 📋 SQL Setup Checklist (Copy-Paste Order)

```
Supabase SQL Editor → New Query → Run each section

Section 1 (Add column):
-----------------------
alter table public.profiles
add column is_active boolean not null default true;
✓ Run

Section 2 (Update function):
----------------------------
create or replace function public.get_my_role() returns text as $$
  select case 
    when (select is_active from public.profiles where id = auth.uid()) is false
    then null
    else (select role from public.profiles where id = auth.uid())
  end;
$$ language sql security definer stable;
✓ Run

Section 3 (Update function):
----------------------------
create or replace function public.has_project_access(pid integer) returns boolean as $$
  select (select is_active from public.profiles where id = auth.uid()) is not false and (
    select exists (
      select 1 from public.project_assignments
      where user_id = auth.uid() and project_id = pid
    ) or (select role from public.profiles where id = auth.uid()) = 'super_admin'
  );
$$ language sql security definer stable;
✓ Run

Section 4 (Update policies - see DEACTIVATION_SQL.md):
------------------------------------------------------
Drop old policies, create new ones with is_active check
(profiles, project_assignments, projects, google_sheets, sheet_leads, lead_notes, tasks)
✓ Run each policy group
```

---

## ✅ Success Criteria

When you're done, you should see:

- ✅ Build passes: `npm run build`
- ✅ No TypeScript errors
- ✅ Deactivate button appears on Team page
- ✅ Clicking Deactivate greyes out the row
- ✅ Clicking Reactivate returns row to normal
- ✅ Deactivated user cannot log in
- ✅ Reactivated user can log in again
- ✅ "Manage Projects" button disabled for deactivated users

---

## 🎉 You're Done!

The user deactivation feature is live and working!

Next: Deploy to production (just deploy the code, SQL is already in your database).

---

## 📞 Having Issues?

1. **Deactivate button not showing?**
   → Make sure you're logged in as super_admin
   → Check that team members exist on the page

2. **Click button but nothing happens?**
   → Check browser console (F12) for errors
   → Make sure SQL migrations ran successfully
   → Restart dev server: npm run dev

3. **Deactivated user can still log in?**
   → RLS policies weren't updated
   → Re-run Step 4 of SQL setup
   → Restart dev server

4. **"Manage Projects" still enabled for deactivated?**
   → Clear browser cache: Ctrl+Shift+Delete
   → Hard refresh: Ctrl+Shift+R

Need more help? Read `docs/DEACTIVATION_TESTING.md` or `docs/DEACTIVATION_SQL.md`
