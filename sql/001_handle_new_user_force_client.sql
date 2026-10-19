-- 001 — handle_new_user: always create profiles as 'client'
--
-- WHY: the trigger currently trusts auth.users.raw_user_meta_data->>'role'. That field is chosen by
-- whoever calls auth.signUp(), and public sign-up is enabled (/auth/v1/settings: disable_signup=false),
-- so anyone holding the anon key can register as super_admin. This change makes the trigger ignore
-- metadata entirely. Promotion to team_member / super_admin then happens only through server code
-- using the service-role key (see app/api/invite-team-member/route.ts, changed in the same review).
--
-- DEPLOY ORDER: ship the invite-team-member route change first (it is safe under the old trigger:
-- it just re-sets a role the trigger already set), then run this SQL. Running this SQL first would make
-- "Add Team Member" create clients until the route change is deployed.
--
-- ALSO DO (dashboard, not SQL): Authentication -> Sign In / Providers -> turn OFF "Allow new users to
-- sign up". Accounts are admin-created (auth.admin.createUser), which is unaffected by that switch.
--
-- ══ BEFORE (currently live, from sql/current_live_schema.sql) ══════════════════════════════════════
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
--  RETURNS trigger
--  LANGUAGE plpgsql
--  SECURITY DEFINER
-- AS $function$
-- begin
--   insert into public.profiles (id, email, role)
--   values (new.id, new.email, coalesce(new.raw_user_meta_data->>'role', 'client'));
--   return new;
-- end;
-- $function$
--
-- ══ PRE-CHECK (read-only, run BEFORE applying; the hole may already have been used) ═════════════════
-- Every non-client account, newest first. Confirm each one is someone you created.
--   SELECT p.id, p.email, p.role, p.is_active, p.created_at,
--          u.raw_user_meta_data->>'role' AS metadata_role,
--          u.raw_app_meta_data->>'provider' AS provider,
--          u.email_confirmed_at, u.last_sign_in_at
--   FROM public.profiles p JOIN auth.users u ON u.id = p.id
--   WHERE p.role <> 'client'
--   ORDER BY p.created_at DESC;
-- Also look for auth users that have no profile row or unexpected sign-up times.
--
-- ══ MIGRATION ══════════════════════════════════════════════════════════════════════════════════════
BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
begin
  -- Role is deliberately NOT taken from the sign-up metadata: users control that value.
  -- Every new profile starts as the least-privileged role; promotion is done by server code
  -- with the service-role key.
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'client');
  return new;
end;
$function$;

COMMIT;

-- ══ VERIFY (this is the result the editor will show) ═══════════════════════════════════════════════
-- Expect: definition contains 'client' and does NOT contain raw_user_meta_data; trigger still present.
SELECT p.proname,
       pg_get_functiondef(p.oid) LIKE '%raw_user_meta_data%' AS still_reads_metadata,
       p.prosecdef                                           AS security_definer,
       p.proconfig                                           AS config,
       (SELECT count(*) FROM pg_trigger t
         WHERE t.tgname = 'on_auth_user_created' AND t.tgfoid = p.oid) AS trigger_attached
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'handle_new_user';

-- ══ ROLLBACK (only if needed; re-opens the sign-up hole) ═══════════════════════════════════════════
-- CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
-- AS $function$ begin
--   insert into public.profiles (id, email, role)
--   values (new.id, new.email, coalesce(new.raw_user_meta_data->>'role', 'client'));
--   return new; end; $function$;
