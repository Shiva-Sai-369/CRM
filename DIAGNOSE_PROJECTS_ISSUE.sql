-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNOSE WHY PROJECTS ARE NOT SHOWING
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Run this in Supabase SQL Editor to diagnose the projects visibility issue
--
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Step 1: Check if RLS is enabled on projects table ──────────────────────

SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'projects';

-- Expected: rowsecurity = true (RLS is enabled)

-- ── Step 2: Check if projects exist in the database ─────────────────────────

SELECT COUNT(*) as total_projects FROM public.projects;

-- Expected: Should show number > 0 if you have projects

-- ── Step 3: List all projects (as super admin) ──────────────────────────────

SELECT 
  id,
  name,
  description,
  created_at
FROM public.projects
ORDER BY created_at DESC;

-- Expected: Should show your projects if any exist

-- ── Step 4: Check current policies on projects table ────────────────────────

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'projects';

-- Expected: Should show policies like "projects_select", "projects_insert", etc.

-- ── Step 5: Check if you have a profile and what your role is ───────────────

SELECT 
  id,
  email,
  role,
  is_active,
  created_at
FROM public.profiles
WHERE email = 'YOUR_EMAIL_HERE';  -- REPLACE WITH YOUR ACTUAL EMAIL

-- Expected: Should show your profile with role = 'super_admin' or 'team_member'

-- ── Step 6: Check your project assignments ──────────────────────────────────

SELECT 
  pa.id,
  pa.user_id,
  pa.project_id,
  p.name as project_name,
  prof.email,
  prof.role
FROM public.project_assignments pa
JOIN public.projects p ON p.id = pa.project_id
JOIN public.profiles prof ON prof.id = pa.user_id
WHERE prof.email = 'YOUR_EMAIL_HERE';  -- REPLACE WITH YOUR ACTUAL EMAIL

-- Expected: Should show which projects you're assigned to

-- ── Step 7: Test get_my_role() function ─────────────────────────────────────

SELECT public.get_my_role() as my_current_role;

-- Expected: Should return 'super_admin', 'team_member', or 'client'
-- If returns NULL, you're either not logged in or your profile doesn't exist

-- ── Step 8: Test has_project_access() for a specific project ────────────────

SELECT public.has_project_access(1) as can_access_project_1;

-- Expected: true if you have access, false if not
-- Change '1' to an actual project ID from Step 3

-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNOSIS GUIDE
-- ═══════════════════════════════════════════════════════════════════════════
--
-- If Step 1 shows RLS is NOT enabled:
--   → Run ENABLE_RLS_MISSING_TABLES.sql to enable RLS
--
-- If Step 2 shows 0 projects:
--   → You need to create projects first (either via app or manually)
--
-- If Step 3 shows projects but app doesn't:
--   → Check Step 5 - do you have a profile?
--   → Check Step 7 - does get_my_role() return a role?
--   → Check Step 4 - are the policies correct?
--
-- If Step 5 shows NO profile:
--   → Your user exists in auth.users but not in profiles table
--   → The handle_new_user() trigger might not have fired
--   → Manually create profile:
--      INSERT INTO public.profiles (id, email, role)
--      VALUES (
--        (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL'),
--        'YOUR_EMAIL',
--        'super_admin'
--      );
--
-- If Step 7 returns NULL:
--   → You're not authenticated in the SQL Editor session
--   → This is NORMAL - SQL Editor runs as service_role, not as your user
--   → The important check is Step 5 (profile exists)
--
-- If Step 4 shows wrong policies:
--   → Drop old policies and run ENABLE_RLS_MISSING_TABLES.sql
--   → Or check RBAC_SETUP.md for correct policies
--
-- ═══════════════════════════════════════════════════════════════════════════
