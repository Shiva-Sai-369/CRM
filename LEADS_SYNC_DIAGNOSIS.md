# Leads Sync Diagnosis: 43 Leads Found But 0 Displayed

## Problem Summary
After clicking "Save" on a project sheet sync, the system reports "Found 43 new leads", but when navigating to the Enquiries page, it shows 0 leads.

## Root Cause Analysis

### Issue #1: Project Access Control (RBAC)
**Location**: `store/projectStore.ts` - `fetchProjects()` function

The enquiries page filters projects based on user role:
- **Super Admin**: Sees all projects
- **Team Member/Client**: Only sees projects they're assigned to via `project_assignments` table

**The Problem**: If the synced leads belong to a project you're not assigned to, you won't see them.

```typescript
// Lines 114-153 in projectStore.ts
if (userRole === 'super_admin') {
  // Fetch all projects
} else {
  // Only fetch projects from project_assignments table
  const { data: assignments } = await supabase
    .from("project_assignments")
    .select("project_id")
    .eq("user_id", user.id);
}
```

### Issue #2: Sheet-Lead Relationship Chain
**Flow**: `Project` → `google_sheets` → `sheet_leads`

The enquiries page follows this chain:
1. Fetch projects user has access to
2. Fetch sheets for those projects
3. Fetch leads for those sheets

If any link in this chain is broken, no leads appear.

### Issue #3: Session Storage Project Selection
**Location**: `app/enquiries/page.tsx` - lines 93-101

The page uses `sessionStorage` to remember the last selected project/sheet. If this points to the wrong project, leads won't show.

```typescript
const savedProjectId = sessionStorage.getItem("selectedProjectId");
```

## Diagnostic Steps

### Step 1: Check Current User & Role
1. Open browser DevTools Console
2. Run this in the Enquiries page:
```javascript
const { createBrowserClient } = await import('@supabase/ssr');
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);

const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
console.log('User role:', profile?.role);
```

### Step 2: Check Project Assignments
```javascript
const { data: assignments } = await supabase
  .from('project_assignments')
  .select('project_id')
  .eq('user_id', user.id);
console.log('Assigned projects:', assignments);
```

### Step 3: Verify Leads Exist in Database
```javascript
const { data: leads, count } = await supabase
  .from('sheet_leads')
  .select('*', { count: 'exact' })
  .order('created_at', { ascending: false })
  .limit(50);
console.log('Total leads in DB:', count);
console.log('Recent leads:', leads);
```

### Step 4: Check Sheet-Project Relationship
```javascript
const { data: sheets } = await supabase
  .from('google_sheets')
  .select('id, name, project_id')
  .order('created_at', { ascending: false });
console.log('Sheets and their projects:', sheets);

// Now check which sheet your leads belong to
const { data: leadSheets } = await supabase
  .from('sheet_leads')
  .select('sheet_id')
  .limit(1);
const sheetId = leadSheets[0]?.sheet_id;
console.log('Leads belong to sheet_id:', sheetId);

const { data: sheet } = await supabase
  .from('google_sheets')
  .select('*')
  .eq('id', sheetId)
  .single();
console.log('That sheet belongs to project:', sheet);
```

## Quick Fixes

### Fix #1: Assign Yourself to the Project
If you're not a super admin and the leads belong to a project you're not assigned to:

```sql
-- Run in Supabase SQL Editor
INSERT INTO project_assignments (user_id, project_id)
VALUES ('YOUR_USER_ID', PROJECT_ID_WITH_LEADS);
```

Replace:
- `YOUR_USER_ID`: Your auth.users.id (UUID)
- `PROJECT_ID_WITH_LEADS`: The project ID that contains the synced sheet

### Fix #2: Make Yourself Super Admin
```sql
-- Run in Supabase SQL Editor
UPDATE profiles
SET role = 'super_admin'
WHERE id = 'YOUR_USER_ID';
```

### Fix #3: Clear Session Storage
In browser console on Enquiries page:
```javascript
sessionStorage.clear();
window.location.reload();
```

### Fix #4: Check the Sync Route Response
When you click "Save" and see "Found 43 new leads", check:
1. What `sheetId` was created/used?
2. What `projectId` does that sheet belong to?

The sync endpoint returns:
```json
{
  "success": true,
  "message": "Synced 43 new leads",
  "sheetId": 123,
  "totalRows": 43,
  "insertedRows": 43,
  "skippedRows": 0
}
```

Check if that `sheetId` belongs to a project you have access to.

## Long-term Solutions

### Solution #1: Better Error Messaging
Update the Enquiries page to show when no projects are accessible:

```tsx
{leads.length === 0 && projects.length === 0 && (
  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
    <p>You don't have access to any projects. Contact your administrator.</p>
  </div>
)}
```

### Solution #2: Auto-assign Project on Sync
Modify `app/api/sync-sheet-to-supabase/route.ts` to automatically assign the current user to the project when they sync a sheet:

```typescript
// After creating/updating google_sheets entry
const { data: { user } } = await supabase.auth.getUser();

// Check if assignment exists
const { data: existingAssignment } = await supabase
  .from('project_assignments')
  .select('id')
  .eq('user_id', user.id)
  .eq('project_id', projectId)
  .maybeSingle();

// Create if doesn't exist
if (!existingAssignment) {
  await supabase
    .from('project_assignments')
    .insert({ user_id: user.id, project_id: projectId });
}
```

### Solution #3: Show All Leads Regardless of Project Access (if appropriate)
If your use case requires all users to see all leads regardless of project assignment, modify `fetchProjects` to always fetch all projects for the leads view:

```typescript
// In projectStore.ts
fetchProjects: async (ignoreRbac = false) => {
  // ... existing code ...
  
  if (ignoreRbac || userRole === 'super_admin') {
    // Fetch all projects
  } else {
    // Fetch assigned projects only
  }
}
```

## Immediate Action Plan

1. **Open Browser DevTools Console** on the Enquiries page
2. **Run diagnostic queries** (Steps 1-4 above) to identify the issue
3. **Check which project** the synced leads belong to
4. **Verify you have access** to that project (either through super_admin role or project_assignments)
5. **If not assigned**, use Fix #1 or Fix #2
6. **Refresh the page** and select the correct project from the dropdown

## Testing Checklist

- [ ] Verify user authentication works
- [ ] Check user role in profiles table
- [ ] Verify 43 leads exist in sheet_leads table
- [ ] Find which sheet_id those leads have
- [ ] Find which project_id that sheet belongs to
- [ ] Verify user has access to that project_id
- [ ] Check sessionStorage is pointing to correct project
- [ ] Verify leads appear when correct project is selected

## Contact Points

If the issue persists, provide this information:
1. Your user role from profiles table
2. The project_id the synced sheet belongs to
3. Your user_id and whether you're in project_assignments for that project
4. Screenshot of browser console diagnostic output
