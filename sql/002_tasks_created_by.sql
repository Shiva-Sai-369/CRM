-- 002 — tasks.created_by + creator-aware policies
--
-- WHY: tasks have no owner, so the scoped tasks_* policies could only show a non-admin tasks linked to
-- a lead in one of their projects; an unlinked task (the form allows "Link to Lead (Optional)") would be
-- invisible even to its creator once the permissive "allow all for now" policy is dropped (step 003).
-- This adds an owner and makes select/update/delete honour it.
--
-- WHAT CHANGES FOR USERS
--   * New tasks get created_by = the logged-in user automatically (column DEFAULT auth.uid()), so the
--     app needs no change to its insert payload.
--   * Existing tasks: created_by stays NULL. There is nothing in the table from which the author could be
--     inferred (no user column, no audit trail), so a real backfill isn't possible. Effect: legacy tasks
--     that are NOT linked to a lead become visible to super_admins only. Legacy tasks linked to a lead in
--     a project you can access are unaffected. See the PRE-CHECK below to see how many tasks that is, and
--     the optional statement at the end to hand them to a specific person.
--   * A creator keeps seeing their own task even if they later lose access to the linked lead's project.
--
-- Policies changed: tasks_select (as requested), plus tasks_update, tasks_delete and tasks_insert so a
-- creator can also edit, complete, snooze, delete their own unlinked tasks — without that, step 003
-- would leave creators able to see but not complete their own tasks.
--
-- ══ PRE-CHECK (read-only, run BEFORE applying) ═════════════════════════════════════════════════════
--   SELECT count(*)                                        AS total_tasks,
--          count(*) FILTER (WHERE lead_id IS NULL)         AS unlinked_tasks_will_be_admin_only
--   FROM public.tasks;
--
-- ══ BEFORE (live) ══════════════════════════════════════════════════════════════════════════════════
-- tasks_select  USING ((get_my_role() <> 'client') AND ((get_my_role() = 'super_admin') OR
--                 ((lead_id IS NOT NULL) AND EXISTS (SELECT 1 FROM sheet_leads sl JOIN google_sheets gs
--                  ON gs.id = sl.sheet_id WHERE sl.id = tasks.lead_id AND has_project_access(gs.project_id)))))
-- tasks_update  same USING as tasks_select, no WITH CHECK
-- tasks_delete  USING (super_admin OR (team_member AND lead_id IS NOT NULL AND EXISTS (...same join...)))
-- tasks_insert  WITH CHECK (get_my_role() <> 'client' AND (super_admin OR lead_id IS NULL OR EXISTS (...)))
--
-- ══ MIGRATION ══════════════════════════════════════════════════════════════════════════════════════
BEGIN;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Fills the column for inserts made with a user JWT (the browser). Service-role inserts get NULL.
ALTER TABLE public.tasks ALTER COLUMN created_by SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS tasks_created_by_idx ON public.tasks (created_by);

-- Best-effort backfill: none possible (see WHY). Existing rows stay NULL on purpose.

-- ── SELECT: super_admin, OR creator, OR linked to a lead in a project the user can access ──────────
DROP POLICY IF EXISTS tasks_select ON public.tasks;
CREATE POLICY tasks_select ON public.tasks
  FOR SELECT
  USING (
    get_my_role() <> 'client'
    AND (
      get_my_role() = 'super_admin'
      OR created_by = auth.uid()
      OR (
        lead_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.sheet_leads sl
          JOIN public.google_sheets gs ON gs.id = sl.sheet_id
          WHERE sl.id = tasks.lead_id AND has_project_access(gs.project_id)
        )
      )
    )
  );

-- ── UPDATE: same visibility rule (WITH CHECK omitted => the USING rule is re-applied to the new row) ─
DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE
  USING (
    get_my_role() <> 'client'
    AND (
      get_my_role() = 'super_admin'
      OR created_by = auth.uid()
      OR (
        lead_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.sheet_leads sl
          JOIN public.google_sheets gs ON gs.id = sl.sheet_id
          WHERE sl.id = tasks.lead_id AND has_project_access(gs.project_id)
        )
      )
    )
  );

-- ── DELETE: super_admin, OR creator, OR (team_member on a lead in an accessible project) ───────────
DROP POLICY IF EXISTS tasks_delete ON public.tasks;
CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE
  USING (
    get_my_role() = 'super_admin'
    OR (
      get_my_role() = 'team_member'
      AND (
        created_by = auth.uid()
        OR (
          lead_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.sheet_leads sl
            JOIN public.google_sheets gs ON gs.id = sl.sheet_id
            WHERE sl.id = tasks.lead_id AND has_project_access(gs.project_id)
          )
        )
      )
    )
  );

-- ── INSERT: as before, plus the creator can't be spoofed (non-admins must be the creator) ──────────
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT
  WITH CHECK (
    get_my_role() <> 'client'
    AND (get_my_role() = 'super_admin' OR created_by = auth.uid())
    AND (
      get_my_role() = 'super_admin'
      OR lead_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.sheet_leads sl
        JOIN public.google_sheets gs ON gs.id = sl.sheet_id
        WHERE sl.id = tasks.lead_id AND has_project_access(gs.project_id)
      )
    )
  );

COMMIT;

-- ══ VERIFY (this is the result the editor will show) ═══════════════════════════════════════════════
-- Expect: column present with default auth.uid(); four policies; the "allow all for now" policy is STILL
-- listed here — that is intentional, it is removed in 003 after you've tested this one.
SELECT 'column' AS kind, column_name AS name, data_type || ' | default=' || coalesce(column_default, '-') AS detail
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'created_by'
UNION ALL
SELECT 'policy', policyname, 'cmd=' || cmd || ' | uses created_by=' ||
       ((coalesce(qual, '') || coalesce(with_check, '')) LIKE '%created_by%')::text
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks'
ORDER BY kind, name;

-- ══ OPTIONAL, run separately if you want legacy unlinked tasks visible to someone other than admins ═
-- Replace the UUID with the person who should own them (look it up in public.profiles).
-- UPDATE public.tasks SET created_by = '00000000-0000-0000-0000-000000000000'
-- WHERE created_by IS NULL AND lead_id IS NULL;

-- ══ ROLLBACK ═══════════════════════════════════════════════════════════════════════════════════════
-- Restore the four policies from the BEFORE block above (sql/current_live_schema.sql has the exact
-- text), then: ALTER TABLE public.tasks DROP COLUMN created_by;
