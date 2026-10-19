-- 003 — drop the permissive "allow all for now" policies on tasks and lead_notes
--
-- WHY: Postgres ORs permissive policies together. These two (cmd=ALL, USING true, WITH CHECK true, role
-- {public}) make every scoped policy on the same tables irrelevant, and {public} includes `anon`, which
-- holds full table grants — so anyone with the public anon key can read, edit and delete every task and
-- every lead note.
--
-- REQUIRES 002 (tasks.created_by + creator-aware policies). The guard below aborts the whole script,
-- changing nothing, if 002 hasn't been applied — otherwise creators of unlinked tasks would lose access.
--
-- WHAT TO EXPECT AFTER
--   lead_notes  scoped by the existing notes_* policies: non-clients on projects they're assigned to (and
--               super_admins) can read/add/edit; only super_admins can delete. The app only reads and
--               inserts notes, both covered. Clients lose (already-intended) access.
--   tasks       scoped by the 002 policies. Legacy unlinked tasks with created_by NULL are admin-only.
--
-- SMOKE TEST after applying (as a team_member, then as a client):
--   team_member: open a lead you're assigned to -> add a note -> it shows. Create a task with NO lead ->
--                it shows on /tasks -> complete it -> delete it. Create a task linked to a lead -> ok.
--   client:      /tasks and REST reads of tasks / lead_notes return no rows.
--   anon:        curl "$SUPABASE_URL/rest/v1/tasks?select=id" -H "apikey: $ANON_KEY"   -> []   (not 200 with data)
--                curl "$SUPABASE_URL/rest/v1/lead_notes?select=id" -H "apikey: $ANON_KEY" -> []
--
-- ══ BEFORE (live) ══════════════════════════════════════════════════════════════════════════════════
-- tasks       "allow all for now"  cmd=ALL  roles={public}  USING true  WITH CHECK true
-- lead_notes  "allow all for now"  cmd=ALL  roles={public}  USING true  WITH CHECK true
--
-- ══ MIGRATION ══════════════════════════════════════════════════════════════════════════════════════
BEGIN;

DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'created_by'
  ) THEN
    RAISE EXCEPTION '002_tasks_created_by.sql has not been applied (tasks.created_by is missing) - aborting';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tasks_select'
      AND qual LIKE '%created_by%'
  ) THEN
    RAISE EXCEPTION 'tasks_select does not reference created_by (002 not applied?) - aborting';
  END IF;
END
$guard$;

DROP POLICY IF EXISTS "allow all for now" ON public.tasks;
DROP POLICY IF EXISTS "allow all for now" ON public.lead_notes;

COMMIT;

-- ══ VERIFY (this is the result the editor will show) ═══════════════════════════════════════════════
-- Expect: no row named "allow all for now"; tasks has select/insert/update/delete; lead_notes has
-- notes_select/insert/update/delete.
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('tasks', 'lead_notes')
ORDER BY tablename, cmd, policyname;

-- ══ ROLLBACK (re-opens both tables to the public) ══════════════════════════════════════════════════
-- CREATE POLICY "allow all for now" ON public.tasks       FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "allow all for now" ON public.lead_notes  FOR ALL USING (true) WITH CHECK (true);
