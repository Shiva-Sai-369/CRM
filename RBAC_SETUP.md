# 📋 Manual Setup Checklist — RBAC

Everything you need to do yourself before the RBAC feature works.
Do these steps **in order**.

---

## Step 1 — Supabase Dashboard: Enable Auth Providers

1. Go to your Supabase project → **Authentication** → **Providers**
2. Find **Email** and make sure these are turned ON:
   - ✅ **Email/Password** (for super_admin and team_member login)
   - ✅ **Magic Link / Email OTP** (for client login)
3. Save changes.

---

## Step 2 — SQL Editor: Create Tables + Trigger

Go to **Supabase → SQL Editor** → New query. Paste and run:

```sql
-- Profiles table (one row per user, role stored here)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'client' check (role in ('super_admin', 'team_member', 'client')),
  created_at timestamp with time zone not null default now()
);

-- Project assignments (which team_member/client is assigned to which project)
create table public.project_assignments (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id integer not null references public.projects(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  unique(user_id, project_id)
);

-- Auto-create a profiles row whenever a new user signs up or accepts an invite
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'role', 'client'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## Step 3 — SQL Editor: Helper Functions + RLS Policies

New query. Paste and run all at once:

```sql
-- ── Helper functions ────────────────────────────────────────────────────────

create function public.get_my_role() returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

create function public.has_project_access(pid integer) returns boolean as $$
  select exists (
    select 1 from public.project_assignments
    where user_id = auth.uid() and project_id = pid
  ) or public.get_my_role() = 'super_admin';
$$ language sql security definer stable;

-- ── Enable RLS on all tables ─────────────────────────────────────────────────

alter table public.projects enable row level security;
alter table public.google_sheets enable row level security;
alter table public.sheet_leads enable row level security;
alter table public.lead_notes enable row level security;
alter table public.tasks enable row level security;
alter table public.profiles enable row level security;
alter table public.project_assignments enable row level security;

-- ── profiles ─────────────────────────────────────────────────────────────────

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid() or public.get_my_role() = 'super_admin');

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid() and
    role = (select role from public.profiles where id = auth.uid())
  );

create policy "profiles_update_role_admin" on public.profiles
  for update using (public.get_my_role() = 'super_admin')
  with check (public.get_my_role() = 'super_admin');

-- ── project_assignments ────────────────────────────────────────────────────

create policy "pa_select" on public.project_assignments
  for select using (user_id = auth.uid() or public.get_my_role() = 'super_admin');

create policy "pa_insert" on public.project_assignments
  for insert with check (public.get_my_role() = 'super_admin');

create policy "pa_delete" on public.project_assignments
  for delete using (public.get_my_role() = 'super_admin');

-- ── projects (clients blocked) ────────────────────────────────────────────

create policy "projects_select" on public.projects
  for select using (
    public.get_my_role() != 'client' and
    public.has_project_access(id)
  );

create policy "projects_insert" on public.projects
  for insert with check (public.get_my_role() = 'super_admin');

create policy "projects_update" on public.projects
  for update using (public.get_my_role() = 'super_admin');

create policy "projects_delete" on public.projects
  for delete using (public.get_my_role() = 'super_admin');

-- ── google_sheets (clients blocked) ──────────────────────────────────────

create policy "sheets_select" on public.google_sheets
  for select using (
    public.get_my_role() != 'client' and
    public.has_project_access(project_id)
  );

create policy "sheets_insert" on public.google_sheets
  for insert with check (
    public.get_my_role() = 'super_admin' or
    public.has_project_access(project_id)
  );

create policy "sheets_update" on public.google_sheets
  for update using (
    public.get_my_role() = 'super_admin' or
    public.has_project_access(project_id)
  );

create policy "sheets_delete" on public.google_sheets
  for delete using (public.get_my_role() = 'super_admin');

-- ── sheet_leads (clients blocked) ─────────────────────────────────────────

create policy "leads_select" on public.sheet_leads
  for select using (
    public.get_my_role() != 'client' and
    exists (
      select 1 from public.google_sheets gs
      where gs.id = sheet_id and public.has_project_access(gs.project_id)
    )
  );

create policy "leads_insert" on public.sheet_leads
  for insert with check (
    public.get_my_role() != 'client' and
    exists (
      select 1 from public.google_sheets gs
      where gs.id = sheet_id and (
        public.get_my_role() = 'super_admin' or
        public.has_project_access(gs.project_id)
      )
    )
  );

create policy "leads_update" on public.sheet_leads
  for update using (
    public.get_my_role() != 'client' and
    exists (
      select 1 from public.google_sheets gs
      where gs.id = sheet_id and (
        public.get_my_role() = 'super_admin' or
        public.has_project_access(gs.project_id)
      )
    )
  );

create policy "leads_delete" on public.sheet_leads
  for delete using (public.get_my_role() = 'super_admin');

-- ── lead_notes ─────────────────────────────────────────────────────────────

create policy "notes_select" on public.lead_notes
  for select using (
    public.get_my_role() != 'client' and
    exists (
      select 1 from public.sheet_leads sl
      join public.google_sheets gs on gs.id = sl.sheet_id
      where sl.id = lead_id and public.has_project_access(gs.project_id)
    )
  );

create policy "notes_insert" on public.lead_notes
  for insert with check (
    public.get_my_role() != 'client' and
    exists (
      select 1 from public.sheet_leads sl
      join public.google_sheets gs on gs.id = sl.sheet_id
      where sl.id = lead_id and public.has_project_access(gs.project_id)
    )
  );

create policy "notes_update" on public.lead_notes
  for update using (
    public.get_my_role() != 'client' and
    exists (
      select 1 from public.sheet_leads sl
      join public.google_sheets gs on gs.id = sl.sheet_id
      where sl.id = lead_id and public.has_project_access(gs.project_id)
    )
  );

create policy "notes_delete" on public.lead_notes
  for delete using (public.get_my_role() = 'super_admin');

-- ── tasks (unassigned tasks visible to super_admin only) ──────────────────

create policy "tasks_select" on public.tasks
  for select using (
    public.get_my_role() != 'client' and
    (
      public.get_my_role() = 'super_admin' or
      (
        lead_id is not null and
        exists (
          select 1 from public.sheet_leads sl
          join public.google_sheets gs on gs.id = sl.sheet_id
          where sl.id = lead_id and public.has_project_access(gs.project_id)
        )
      )
    )
  );

create policy "tasks_insert" on public.tasks
  for insert with check (
    public.get_my_role() != 'client' and
    (
      public.get_my_role() = 'super_admin' or
      lead_id is null or
      exists (
        select 1 from public.sheet_leads sl
        join public.google_sheets gs on gs.id = sl.sheet_id
        where sl.id = lead_id and public.has_project_access(gs.project_id)
      )
    )
  );

create policy "tasks_update" on public.tasks
  for update using (
    public.get_my_role() != 'client' and
    (
      public.get_my_role() = 'super_admin' or
      (
        lead_id is not null and
        exists (
          select 1 from public.sheet_leads sl
          join public.google_sheets gs on gs.id = sl.sheet_id
          where sl.id = lead_id and public.has_project_access(gs.project_id)
        )
      )
    )
  );

create policy "tasks_delete" on public.tasks
  for delete using (
    public.get_my_role() = 'super_admin' or (
      public.get_my_role() = 'team_member' and
      lead_id is not null and
      exists (
        select 1 from public.sheet_leads sl
        join public.google_sheets gs on gs.id = sl.sheet_id
        where sl.id = lead_id and public.has_project_access(gs.project_id)
      )
    )
  );
```

---

## Step 4 — SQL Editor: Client Analytics RPC

New query. Paste and run:

```sql
create or replace function public.get_project_analytics(p_project_id integer)
returns json as $$
declare
  v_role text;
  v_has_access boolean;
  v_result json;
begin
  v_role := public.get_my_role();
  if v_role != 'client' then
    raise exception 'Access denied: analytics endpoint is for clients only';
  end if;

  select exists (
    select 1 from public.project_assignments
    where user_id = auth.uid() and project_id = p_project_id
  ) into v_has_access;

  if not v_has_access then
    raise exception 'Access denied: not assigned to this project';
  end if;

  select json_build_object(
    'project_id', p_project_id,
    'total_leads', count(*),
    'status_breakdown', (
      select json_object_agg(status, cnt)
      from (
        select coalesce(sl.status, 'Unknown') as status, count(*) as cnt
        from public.sheet_leads sl
        join public.google_sheets gs on gs.id = sl.sheet_id
        where gs.project_id = p_project_id
        group by sl.status
      ) s
    ),
    'leads_over_time', (
      select json_agg(row_to_json(t))
      from (
        select date_trunc('day', sl.created_at)::date as date, count(*) as count
        from public.sheet_leads sl
        join public.google_sheets gs on gs.id = sl.sheet_id
        where gs.project_id = p_project_id
        group by date_trunc('day', sl.created_at)::date
        order by date
      ) t
    )
  )
  from public.sheet_leads sl
  join public.google_sheets gs on gs.id = sl.sheet_id
  where gs.project_id = p_project_id
  into v_result;

  return v_result;
end;
$$ language plpgsql security definer stable;
```

---

## Step 5 — Add Service Role Key to .env.local

1. Supabase → **Settings** → **API**
2. Copy the **`service_role`** secret key (the long one — NOT the anon key)
3. Open `.env.local` in your project root and replace:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
   with your actual key.
4. **Restart** the dev server — env var changes need a restart:
   - Stop `npm run dev` (Ctrl+C in the terminal)
   - Run `npm run dev` again

> ⚠️ Never commit this key to git. `.env.local` is already in `.gitignore`.

---

## Step 6 — Sign Up for the First Time

1. Go to `http://localhost:3000/login`
2. Use the **Password** tab — enter your email and set a password
3. Confirm your email if Supabase sends a verification email

---

## Step 7 — Elevate Yourself to super_admin

After signing up, go to **Supabase → SQL Editor** and run:

```sql
-- Replace with YOUR actual email address
update public.profiles
set role = 'super_admin'
where email = 'YOUR_EMAIL_HERE';
```

Then **sign out and sign back in** so the app picks up your new role.

---

## Step 8 — Confirm It's Working

| Thing to check | What you should see |
|---|---|
| `http://localhost:3000` (logged out) | Redirected to `/login` |
| Sign in as super_admin | Redirected to `/projects` |
| Sidebar | Your real name + "Super Admin" label |
| Sidebar nav | "Team" link is visible |
| `/team` page | Team management UI loads |
| Sign Out button | Works, returns to `/login` |

---

## Quick Summary

| Step | Where | What |
|---|---|---|
| 1 | Supabase Dashboard → Auth → Providers | Enable Email/Password + Magic Link |
| 2 | Supabase SQL Editor | Create `profiles` + `project_assignments` tables + trigger |
| 3 | Supabase SQL Editor | Helper functions + all RLS policies |
| 4 | Supabase SQL Editor | `get_project_analytics` RPC function |
| 5 | `.env.local` file | Paste your service_role key |
| 6 | Browser | Sign up at `/login` |
| 7 | Supabase SQL Editor | UPDATE your profile to `super_admin` |
| 8 | Browser | Sign out + back in, verify |
