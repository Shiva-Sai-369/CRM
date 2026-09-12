-- ═══════════════════════════════════════════════════════════════════════════
-- Enable RLS on Missing Tables
-- ═══════════════════════════════════════════════════════════════════════════
--
-- This SQL enables Row Level Security on three tables that were previously
-- UNRESTRICTED (RLS disabled), making them vulnerable to direct access via
-- the public anon key.
--
-- Tables fixed:
--   1. projects (if not already enabled)
--   2. notification_settings
--   3. notification_logs
--
-- Run this in Supabase SQL Editor as a single query.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enable RLS on all three tables ────────────────────────────────────────

-- Projects might already have RLS enabled, this is idempotent
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════════════════
-- PROJECTS TABLE POLICIES
-- ══════════════════════════════════════════════════════════════════════════
--
-- Access Pattern:
--   - super_admin: can see/edit all projects
--   - team_member: can see projects they're assigned to (read-only for projects table itself)
--   - client: cannot see projects table at all (blocked)
--
-- NOTE: Team members do NOT create projects in the UI (checked app/projects/page.tsx)
--       Only super_admin creates projects.
--
-- ══════════════════════════════════════════════════════════════════════════

-- Drop existing policies if they exist (in case running this twice)
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

-- SELECT: super_admin sees all, team_member sees assigned projects, client blocked
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

-- ══════════════════════════════════════════════════════════════════════════
-- NOTIFICATION_SETTINGS TABLE POLICIES
-- ══════════════════════════════════════════════════════════════════════════
--
-- Access Pattern:
--   - notification_settings.sheet_id links to google_sheets.id
--   - google_sheets.project_id links to projects.id
--   - Users can only access notification_settings for sheets in projects they have access to
--   - Clients are blocked from notification_settings entirely
--
-- ══════════════════════════════════════════════════════════════════════════

-- SELECT: super_admin and team_member can see settings for sheets in assigned projects
CREATE POLICY "notification_settings_select" ON public.notification_settings
  FOR SELECT USING (
    public.get_my_role() != 'client' AND
    EXISTS (
      SELECT 1 FROM public.google_sheets gs
      WHERE gs.id = sheet_id AND public.has_project_access(gs.project_id)
    )
  );

-- INSERT: super_admin or team_member with project access
CREATE POLICY "notification_settings_insert" ON public.notification_settings
  FOR INSERT WITH CHECK (
    public.get_my_role() != 'client' AND
    EXISTS (
      SELECT 1 FROM public.google_sheets gs
      WHERE gs.id = sheet_id AND (
        public.get_my_role() = 'super_admin' OR
        public.has_project_access(gs.project_id)
      )
    )
  );

-- UPDATE: super_admin or team_member with project access
CREATE POLICY "notification_settings_update" ON public.notification_settings
  FOR UPDATE USING (
    public.get_my_role() != 'client' AND
    EXISTS (
      SELECT 1 FROM public.google_sheets gs
      WHERE gs.id = sheet_id AND (
        public.get_my_role() = 'super_admin' OR
        public.has_project_access(gs.project_id)
      )
    )
  );

-- DELETE: super_admin only
CREATE POLICY "notification_settings_delete" ON public.notification_settings
  FOR DELETE USING (
    public.get_my_role() = 'super_admin'
  );

-- ══════════════════════════════════════════════════════════════════════════
-- NOTIFICATION_LOGS TABLE POLICIES
-- ══════════════════════════════════════════════════════════════════════════
--
-- Access Pattern:
--   - notification_logs.lead_id links to sheet_leads.id
--   - sheet_leads.sheet_id links to google_sheets.id
--   - google_sheets.project_id links to projects.id
--   - Users can only access logs for leads in projects they have access to
--   - Clients are blocked from notification_logs entirely
--
-- ══════════════════════════════════════════════════════════════════════════

-- SELECT: super_admin and team_member can see logs for leads in assigned projects
CREATE POLICY "notification_logs_select" ON public.notification_logs
  FOR SELECT USING (
    public.get_my_role() != 'client' AND
    EXISTS (
      SELECT 1 FROM public.sheet_leads sl
      JOIN public.google_sheets gs ON gs.id = sl.sheet_id
      WHERE sl.id = lead_id AND public.has_project_access(gs.project_id)
    )
  );

-- INSERT: super_admin or team_member with project access (system creates logs)
CREATE POLICY "notification_logs_insert" ON public.notification_logs
  FOR INSERT WITH CHECK (
    public.get_my_role() != 'client' AND
    EXISTS (
      SELECT 1 FROM public.sheet_leads sl
      JOIN public.google_sheets gs ON gs.id = sl.sheet_id
      WHERE sl.id = lead_id AND (
        public.get_my_role() = 'super_admin' OR
        public.has_project_access(gs.project_id)
      )
    )
  );

-- UPDATE: super_admin only (logs should be immutable in most cases)
CREATE POLICY "notification_logs_update" ON public.notification_logs
  FOR UPDATE USING (
    public.get_my_role() = 'super_admin'
  );

-- DELETE: super_admin only
CREATE POLICY "notification_logs_delete" ON public.notification_logs
  FOR DELETE USING (
    public.get_my_role() = 'super_admin'
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════
--
-- After running the above, verify RLS is enabled by running:
--
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('projects', 'notification_settings', 'notification_logs');
--
-- Expected output: rowsecurity = true for all three tables
--
-- ═══════════════════════════════════════════════════════════════════════════
