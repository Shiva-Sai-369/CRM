# User Management

This doc covers how accounts are created and assigned to projects, and how they're given roles and deactivated. For the role model and routing rules, see the [README](../README.md#roles).

## Admin screens

There are two super_admin screens that overlap. Note that they apply **different rules** when deactivating users (see [Deactivation](#deactivation)).

| Screen | What it does | API routes |
|---|---|---|
| `/team` | Lists team members, creates team members, assigns/unassigns projects, deactivates/reactivates | `GET /api/team-members`, `POST /api/invite-team-member`, `POST /api/assign-project`, `DELETE /api/unassign-project`, `POST /api/deactivate-user`, `POST /api/reactivate-user` |
| `/team/manage` | Lists all users and edits their role, active status and project list | `GET /api/all-users`, `POST /api/update-user-role`, `POST /api/update-user-status`, `POST /api/update-user-projects` |

Unless noted otherwise, every route checks for a session and a `super_admin` profile. Admin operations use the service-role client (`createAdminClient()` in `lib/supabase-server.ts`), so `SUPABASE_SERVICE_ROLE_KEY` must be set.

## Creating accounts

The app sends no emails. An admin creates the account with a password (at least 8 characters) and shares the credentials with the user out of band. Accounts are created through `auth.admin.createUser` with `email_confirm: true`, so the user can sign in at `/login` right away. Users can change their password on the Settings page.

### Team members

- **Where:** `/team`
- **Who:** `super_admin`
- **Route:** `POST /api/invite-team-member`, with body `{ email, password }`
- Creates the user with `user_metadata.role = 'team_member'`. The response echoes the password so the admin can copy it.
- New team members have **no project assignments**. Middleware sends them to `/no-projects` until they're assigned.

### Clients

- **Where:** a project's detail page, `/projects/[id]`
- **Who:** `super_admin`, or a `team_member` assigned to that project
- **Route:** `POST /api/invite-client`, with body `{ email, password, projectId }`
- Creates the user with `user_metadata.role = 'client'`, then upserts a `project_assignments` row for `projectId`.
- If the assignment fails, the account still exists but the client has no project. The error is only logged on the server, so check `project_assignments` if a client can't reach their analytics.

### First super admin

This can't be done from the app. See [README → Create the first super admin](../README.md#4-create-the-first-super-admin).

> **History:** Account creation used to be invite-link based: invite email → `/auth/callback` → `/set-password`. That flow was removed in commit `5a31fa0`. New accounts are still created with `user_metadata.password_set = true`, which was that old flow's first-login flag.

## Project assignment

A user can see a project when there's a `project_assignments` row for them. Rows get created in these ways:

- **Manually:** `/team` (assign/unassign per project) or `/team/manage` (replace the user's whole project list). Both are super_admin only.
- **Client creation:** clients are assigned to the project they were created from.
- **Sheet sync:** `POST /api/sync-sheet-to-supabase` assigns the caller to the target project if they aren't assigned already.

## Changing roles

`POST /api/update-user-role` (from `/team/manage`) sets a user's role to `super_admin`, `team_member` or `client`. It refuses a change that would leave no super_admin.

## Deactivation

Deactivation blocks a user without deleting anything. Their profile, project assignments, notes, tasks and leads stay as they are.

A deactivated user is blocked in two ways:

1. `profiles.is_active = false`. The RLS helpers are meant to treat inactive users as having no role, so their queries return nothing. According to the last documented SQL, `get_my_role()` returns `NULL` when `is_active` is false:
   ```sql
   create or replace function public.get_my_role() returns text as $$
     select case
       when (select is_active from public.profiles where id = auth.uid()) is false
       then null
       else (select role from public.profiles where id = auth.uid())
     end;
   $$ language sql security definer stable;
   ```
   This SQL isn't in the repo yet. The full migration is in `git show 'f3de60a^:docs/DEACTIVATION_SQL.md'`. Check it against the live database.
2. **Auth ban.** The user is banned in Supabase Auth with `ban_duration: '876000h'`, which is about 100 years. This stops them signing in at all.

### Two routes, two rule sets

| | `/team` → `deactivate-user` / `reactivate-user` | `/team/manage` → `update-user-status` |
|---|---|---|
| Deactivate yourself | Blocked | Blocked |
| Deactivate a super_admin | **Always blocked** | Allowed, unless they're the last active super_admin |
| Unban on reactivate | Sends `ban_duration: undefined` (see known issues) | Sends `ban_duration: 'none'` |

## Known issues

- **`/api/projects-list` doesn't exist.** Both `/team` and `/team/manage` fetch it, but there's no `app/api/projects-list/route.ts`, so the request 404s.
- **Reactivating from `/team` probably doesn't lift the Auth ban.** `reactivate-user` calls `updateUserById(id, { ban_duration: undefined })`. The key is dropped when the request is serialized, and Supabase only lifts a ban when it gets `ban_duration: 'none'`. The profile becomes active, but the user may still be unable to sign in. Also, `updateUserById` returns errors instead of throwing them, so the surrounding `try/catch` never sees a failure. Use `/team/manage` to reactivate until this is fixed. (Not tested.)
