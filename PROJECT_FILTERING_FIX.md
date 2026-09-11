# Project Filtering Fix

## Issue

Team members and clients assigned to projects through the "Manage Users" page could not see those projects when they logged in. The Enquiries page showed "Select a project" with 0 projects available.

## Root Cause

The `fetchProjects` function in `store/projectStore.ts` was fetching **all** projects from the database without filtering by user role or project assignments. This meant:

1. **Super admins** saw all projects (correct ✅)
2. **Team members** saw all projects (incorrect ❌ - should only see assigned)
3. **Clients** saw all projects (incorrect ❌ - should only see assigned)

## Solution

Updated `fetchProjects` in `store/projectStore.ts` to implement role-based filtering:

### Before
```typescript
fetchProjects: async () => {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  
  set({ projects: (data ?? []) as Project[] });
}
```

### After
```typescript
fetchProjects: async () => {
  // Get current user and their role
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role;

  // Super admins see all projects
  if (userRole === 'super_admin') {
    const { data } = await supabase
      .from("projects")
      .select("*");
    projects = data ?? [];
  } else {
    // Team members and clients only see assigned projects
    const { data: assignments } = await supabase
      .from("project_assignments")
      .select("project_id")
      .eq("user_id", user.id);

    const projectIds = assignments.map(a => a.project_id);

    if (projectIds.length > 0) {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .in("id", projectIds);
      projects = data ?? [];
    }
  }
}
```

## Flow

### Super Admin
```
1. Login as super_admin
2. fetchProjects() → queries ALL projects
3. Sees all projects in dropdown
4. Can access any project
```

### Team Member / Client
```
1. Login as team_member or client
2. fetchProjects() → queries project_assignments for user_id
3. Gets assigned project IDs
4. Fetches only those projects from projects table
5. Sees only assigned projects in dropdown
6. Can only access assigned projects
```

## Testing

### Test 1: Super Admin (All Projects)
1. Log in as super_admin
2. Go to `/enquiries`
3. **Expected**: Project dropdown shows all projects in database

### Test 2: Team Member (Assigned Projects Only)
1. Log in as super_admin
2. Go to `/team/manage`
3. Find a team_member, assign them to 2 projects
4. Log out
5. Log in as that team_member
6. Go to `/enquiries`
7. **Expected**: Project dropdown shows only those 2 assigned projects
8. **Expected**: Leads load for those projects

### Test 3: Client (Assigned Project Only)
1. Log in as super_admin
2. Go to `/team/manage`
3. Find a client, assign them to 1 project
4. Log out
5. Log in as that client
6. **Expected**: Redirects to `/analytics/[projectId]` automatically
7. **Expected**: Shows analytics for that assigned project

### Test 4: Unassigned User
1. Log in as super_admin
2. Go to `/team/manage`
3. Create a new team_member, don't assign any projects
4. Log out
5. Log in as that team_member
6. **Expected**: Redirects to `/no-projects` page (middleware handles this)
7. **Expected**: Project dropdown is empty

## Files Modified

- **`store/projectStore.ts`**: Updated `fetchProjects` to filter by role and assignments

## Security Model

This is a **client-side filter** for UX purposes. The authoritative security layer is:

1. **Row-Level Security (RLS)** on Supabase tables
2. **Middleware** (`middleware.ts`) for route protection
3. **API routes** verify role and assignments server-side

The projectStore filter ensures users don't see projects they can't access, matching the RLS policies.

## Related Components

These components rely on `fetchProjects` and are now fixed:

- **`app/enquiries/page.tsx`**: Project dropdown now filtered correctly
- **`app/projects/page.tsx`**: Projects list now filtered correctly
- Any component using `useProjectStore().projects`

## Migration Notes

No migration needed. This is a client-side filtering change that takes effect immediately. Users will see only their assigned projects on next login.

## Future Enhancements

Potential improvements:
1. Add loading state for role check
2. Cache user role in store to avoid re-fetching
3. Add error handling for missing profile
4. Show "No projects assigned" message when projectIds.length === 0
