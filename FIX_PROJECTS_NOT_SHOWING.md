# 🔧 Fix: Projects Not Showing

## Quick Diagnosis

You mentioned projects were visible in the `fix/facebook-leads-sync` branch but now they're not showing on main. Since both branches are now merged and identical, the issue is with your **Supabase database configuration**, not the code.

## Most Likely Cause

**RLS (Row Level Security) is enabled on the `projects` table, but one of these is true:**

1. ❌ You don't have a profile in the `profiles` table
2. ❌ Your role is not set to `super_admin` or `team_member`
3. ❌ You're not assigned to any projects (if you're a team_member)
4. ❌ The RLS policies are incorrect or missing
5. ❌ You're not logged in (session expired)

## Instant Fix (2 minutes)

### Step 1: Check Browser Console

1. Open your app at http://localhost:3001/projects
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Look for errors like:
   ```
   [Projects] Error fetching from Supabase: ...
   ```

**If you see an error, paste it here and I'll help!**

### Step 2: Run Diagnostic SQL

1. Open Supabase Dashboard → SQL Editor
2. Open the file `DIAGNOSE_PROJECTS_ISSUE.sql` from your project
3. **IMPORTANT:** Replace `YOUR_EMAIL_HERE` with your actual email in Step 5 and Step 6
4. Run the entire script
5. Look at the results

---

## Common Issues & Quick Fixes

### Issue 1: No Profile in Profiles Table

**Symptom:** Step 5 in diagnostic returns 0 rows

**Fix:**
```sql
-- Replace YOUR_EMAIL with your actual email
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  id,
  email,
  email, -- or your actual name
  'super_admin'
FROM auth.users
WHERE email = 'YOUR_EMAIL'
ON CONFLICT (id) DO NOTHING;
```

### Issue 2: Wrong Role (client instead of super_admin)

**Symptom:** Step 5 shows `role = 'client'`

**Fix:**
```sql
-- Replace YOUR_EMAIL with your actual email
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'YOUR_EMAIL';
```

Then **sign out and sign back in** for the role change to take effect.

### Issue 3: RLS Enabled But No Policies

**Symptom:** Step 4 returns 0 rows (no policies)

**Fix:**
Run `ENABLE_RLS_MISSING_TABLES.sql` in Supabase SQL Editor

### Issue 4: Wrong RLS Policies

**Symptom:** Step 4 shows policies but projects still don't show

**Fix:**
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
```

Then run `ENABLE_RLS_MISSING_TABLES.sql`

### Issue 5: No Projects in Database

**Symptom:** Step 2 returns `total_projects = 0`

**Fix:** Create a test project
```sql
INSERT INTO public.projects (name, description, created_at)
VALUES ('Test Project', 'Test description', NOW())
RETURNING *;
```

### Issue 6: Not Logged In

**Symptom:** App keeps redirecting to `/login`

**Fix:**
1. Go to http://localhost:3001/login
2. Log in with your credentials
3. Try accessing /projects again

---

## Temporary Workaround (DISABLE RLS)

**⚠️ Only use this for testing! Re-enable RLS after fixing!**

```sql
-- Temporarily disable RLS to see if that's the issue
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
```

**Refresh your projects page** - do you see projects now?

- **YES** → The issue is with RLS policies. Continue to Step 7.
- **NO** → The issue is something else (no projects, not logged in, etc.)

After testing, **re-enable RLS:**
```sql
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
```

---

## Step-by-Step Debug

### Step 7: Fix RLS Policies

If disabling RLS showed projects, then your policies are wrong. Here's the correct setup:

```sql
-- ── 1. Drop any existing policies ────────────────────────────────────────

DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

-- ── 2. Make sure helper functions exist ──────────────────────────────────

-- Check if they exist:
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_my_role', 'has_project_access');

-- If they don't exist, create them:
CREATE OR REPLACE FUNCTION public.get_my_role() 
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_project_access(pid integer) 
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_assignments
    WHERE user_id = auth.uid() AND project_id = pid
  ) OR public.get_my_role() = 'super_admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── 3. Enable RLS ────────────────────────────────────────────────────────

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ── 4. Create correct policies ───────────────────────────────────────────

-- SELECT: super_admin sees all, team_member sees assigned, client blocked
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT USING (
    public.get_my_role() != 'client' AND
    public.has_project_access(id)
  );

-- INSERT: super_admin only
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT WITH CHECK (
    public.get_my_role() = 'super_admin'
  );

-- UPDATE: super_admin only
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE USING (
    public.get_my_role() = 'super_admin'
  );

-- DELETE: super_admin only
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE USING (
    public.get_my_role() = 'super_admin'
  );
```

### Step 8: Verify It Works

1. Refresh http://localhost:3001/projects
2. You should now see your projects!

If still not working:
- Check browser console for errors
- Make sure you're logged in
- Check your role is `super_admin` (run Step 5 from diagnostic)

---

## Still Not Working?

**Provide me with:**
1. Results from `DIAGNOSE_PROJECTS_ISSUE.sql` (Steps 1-8)
2. Any error messages from browser console
3. Screenshot of what you see on `/projects` page

And I'll help you fix it! 🚀

---

## Prevention: Why This Happened

You likely ran the RBAC setup SQL at some point, which enabled RLS on projects table. But either:
- Your profile wasn't created properly
- Or the policies weren't created correctly
- Or your role wasn't set to super_admin

The code works fine - it's just the database configuration that needs fixing.
