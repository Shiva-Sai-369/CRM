# User Deactivation SQL Setup

Run these SQL commands in your Supabase SQL Editor to enable user deactivation.

## Step 1: Add is_active column to profiles

```sql
alter table public.profiles
add column is_active boolean not null default true;
```

## Step 2: Update helper function to check is_active

Replace the existing `get_my_role()` function with this version:

```sql
create or replace function public.get_my_role() returns text as $$
  select case 
    when (select is_active from public.profiles where id = auth.uid()) is false
    then null
    else (select role from public.profiles where id = auth.uid())
  end;
$$ language sql security definer stable;
```

## Step 3: Update has_project_access to check is_active

Replace the existing `has_project_access()` function:

```sql
create or replace function public.has_project_access(pid integer) returns boolean as $$
  select (select is_active from public.profiles where id = auth.uid()) is not false and (
    select exists (
      select 1 from public.project_assignments
      where user_id = auth.uid() and project_id = pid
    ) or (select role from public.profiles where id = auth.uid()) = 'super_admin'
  );
$$ language sql security definer stable;
```

## Step 4: Add is_active check to all RLS policies

The safest approach is to add `(select is_active from public.profiles where id = auth.uid()) is not false` to the beginning of every RLS policy's USING and WITH CHECK clauses.

### Example: Update profiles table policies

```sql
-- Drop existing profile policies
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_role_admin" on public.profiles;

-- New policies with is_active check
create policy "profiles_select" on public.profiles
  for select using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    (id = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'super_admin')
  );

create policy "profiles_update_own" on public.profiles
  for update using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    id = auth.uid()
  )
  with check (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    id = auth.uid() and
    role = (select role from public.profiles where id = auth.uid())
  );

create policy "profiles_update_admin" on public.profiles
  for update using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    public.get_my_role() = 'super_admin'
  )
  with check (public.get_my_role() = 'super_admin');
```

### Update project_assignments policies

```sql
drop policy if exists "pa_select" on public.project_assignments;
drop policy if exists "pa_insert" on public.project_assignments;
drop policy if exists "pa_delete" on public.project_assignments;

create policy "pa_select" on public.project_assignments
  for select using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    (user_id = auth.uid() or public.get_my_role() = 'super_admin')
  );

create policy "pa_insert" on public.project_assignments
  for insert with check (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    public.get_my_role() = 'super_admin'
  );

create policy "pa_delete" on public.project_assignments
  for delete using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    public.get_my_role() = 'super_admin'
  );
```

### Update projects policies

```sql
drop policy if exists "projects_select" on public.projects;
drop policy if exists "projects_insert" on public.projects;
drop policy if exists "projects_update" on public.projects;
drop policy if exists "projects_delete" on public.projects;

create policy "projects_select" on public.projects
  for select using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    public.get_my_role() != 'client' and
    public.has_project_access(id)
  );

create policy "projects_insert" on public.projects
  for insert with check (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    public.get_my_role() = 'super_admin'
  );

create policy "projects_update" on public.projects
  for update using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    public.get_my_role() = 'super_admin'
  );

create policy "projects_delete" on public.projects
  for delete using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    public.get_my_role() = 'super_admin'
  );
```

### Update google_sheets policies

```sql
drop policy if exists "sheets_select" on public.google_sheets;
drop policy if exists "sheets_insert" on public.google_sheets;
drop policy if exists "sheets_update" on public.google_sheets;
drop policy if exists "sheets_delete" on public.google_sheets;

create policy "sheets_select" on public.google_sheets
  for select using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    public.get_my_role() != 'client' and
    public.has_project_access(project_id)
  );

create policy "sheets_insert" on public.google_sheets
  for insert with check (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    (public.get_my_role() = 'super_admin' or
    public.has_project_access(project_id))
  );

create policy "sheets_update" on public.google_sheets
  for update using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    (public.get_my_role() = 'super_admin' or
    public.has_project_access(project_id))
  );

create policy "sheets_delete" on public.google_sheets
  for delete using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    public.get_my_role() = 'super_admin'
  );
```

### Update sheet_leads policies

```sql
drop policy if exists "leads_select" on public.sheet_leads;
drop policy if exists "leads_insert" on public.sheet_leads;
drop policy if exists "leads_update" on public.sheet_leads;
drop policy if exists "leads_delete" on public.sheet_leads;

create policy "leads_select" on public.sheet_leads
  for select using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    public.get_my_role() != 'client' and
    exists (
      select 1 from public.google_sheets gs
      where gs.id = sheet_id and public.has_project_access(gs.project_id)
    )
  );

create policy "leads_insert" on public.sheet_leads
  for insert with check (
    (select is_active from public.profiles where id = auth.uid()) is not false and
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
    (select is_active from public.profiles where id = auth.uid()) is not false and
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
  for delete using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    public.get_my_role() = 'super_admin'
  );
```

### Update lead_notes policies

```sql
drop policy if exists "notes_select" on public.lead_notes;
drop policy if exists "notes_insert" on public.lead_notes;
drop policy if exists "notes_update" on public.lead_notes;
drop policy if exists "notes_delete" on public.lead_notes;

create policy "notes_select" on public.lead_notes
  for select using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    public.get_my_role() != 'client' and
    exists (
      select 1 from public.sheet_leads sl
      join public.google_sheets gs on gs.id = sl.sheet_id
      where sl.id = lead_id and public.has_project_access(gs.project_id)
    )
  );

create policy "notes_insert" on public.lead_notes
  for insert with check (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    public.get_my_role() != 'client' and
    exists (
      select 1 from public.sheet_leads sl
      join public.google_sheets gs on gs.id = sl.sheet_id
      where sl.id = lead_id and public.has_project_access(gs.project_id)
    )
  );

create policy "notes_update" on public.lead_notes
  for update using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    public.get_my_role() != 'client' and
    exists (
      select 1 from public.sheet_leads sl
      join public.google_sheets gs on gs.id = sl.sheet_id
      where sl.id = lead_id and public.has_project_access(gs.project_id)
    )
  );

create policy "notes_delete" on public.lead_notes
  for delete using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
    public.get_my_role() = 'super_admin'
  );
```

### Update tasks policies

```sql
drop policy if exists "tasks_select" on public.tasks;
drop policy if exists "tasks_insert" on public.tasks;
drop policy if exists "tasks_update" on public.tasks;
drop policy if exists "tasks_delete" on public.tasks;

create policy "tasks_select" on public.tasks
  for select using (
    (select is_active from public.profiles where id = auth.uid()) is not false and
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
    (select is_active from public.profiles where id = auth.uid()) is not false and
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
    (select is_active from public.profiles where id = auth.uid()) is not false and
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
    (select is_active from public.profiles where id = auth.uid()) is not false and
    (
      public.get_my_role() = 'super_admin' or (
        public.get_my_role() = 'team_member' and
        lead_id is not null and
        exists (
          select 1 from public.sheet_leads sl
          join public.google_sheets gs on gs.id = sl.sheet_id
          where sl.id = lead_id and public.has_project_access(gs.project_id)
        )
      )
    )
  );
```

---

## How It Works

- **Deactivating a user**: Sets `is_active = false` in the profile and bans them in Supabase auth
- **Deactivated users cannot**: Log in, access any data (all RLS policies reject them), or manage projects
- **Data preservation**: All notes, tasks, and project assignments remain intact
- **Reactivation**: Sets `is_active = true` and unbans them in auth so they can log back in
- **Super admin protection**: Super admins cannot deactivate other super admins or themselves

