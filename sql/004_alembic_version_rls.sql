-- 004 — lock public.alembic_version away from the API roles
--
-- WHY: it is the only public table without RLS, and anon + authenticated hold full grants on it
-- (SELECT/INSERT/UPDATE/DELETE/TRUNCATE...). Anyone with the anon key could rewrite or delete the
-- Alembic revision marker from the browser. It is used by migration tooling only.
--
-- ⚠ CHECK FIRST: which database role does your Alembic tooling connect as? RLS does not apply to the
--   table owner or to roles with BYPASSRLS (postgres, service_role), so a normal Supabase connection
--   string keeps working. If it instead connects as `authenticated`/`anon` (very unusual), this would
--   lock it out. Run the PRE-CHECK to see the owner.
--
-- PRE-CHECK (read-only):
--   SELECT c.relname, c.relowner::regrole AS owner, c.relrowsecurity
--   FROM pg_class c WHERE c.oid = 'public.alembic_version'::regclass;
--   SELECT * FROM public.alembic_version;   -- note the current version_num before changing anything
--
-- ══ BEFORE (live) ══════════════════════════════════════════════════════════════════════════════════
-- alembic_version: rowsecurity=false, no policies, full grants to anon and authenticated.
--
-- ══ MIGRATION ══════════════════════════════════════════════════════════════════════════════════════
BEGIN;

ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY;

-- With RLS on and no policy, non-owner roles are already denied. This explicit policy documents the
-- intent and keeps the table denied even if someone later adds a broad policy elsewhere by mistake
-- (a RESTRICTIVE policy is AND-ed with any permissive one).
DROP POLICY IF EXISTS alembic_version_deny_api ON public.alembic_version;
CREATE POLICY alembic_version_deny_api ON public.alembic_version
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMIT;

-- Optional extra hardening (not required for the above to work; also hides the table from the REST API):
-- REVOKE ALL ON public.alembic_version FROM anon, authenticated;

-- ══ VERIFY (this is the result the editor will show) ═══════════════════════════════════════════════
-- Expect: rowsecurity = true, one RESTRICTIVE policy for anon/authenticated.
SELECT c.relname, c.relrowsecurity AS rowsecurity,
       (SELECT string_agg(policyname || ' [' || permissive || '] ' || cmd || ' -> ' || roles::text, '; ')
          FROM pg_policies WHERE schemaname = 'public' AND tablename = 'alembic_version') AS policies
FROM pg_class c WHERE c.oid = 'public.alembic_version'::regclass;

-- After running, from a terminal (anon must get an empty array or 401/403, not rows):
--   curl "$SUPABASE_URL/rest/v1/alembic_version?select=*" -H "apikey: $ANON_KEY"

-- ══ ROLLBACK ═══════════════════════════════════════════════════════════════════════════════════════
-- DROP POLICY alembic_version_deny_api ON public.alembic_version;
-- ALTER TABLE public.alembic_version DISABLE ROW LEVEL SECURITY;
