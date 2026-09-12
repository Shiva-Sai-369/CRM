# Quick Fix Guide: 43 Leads Found But 0 Displayed

## ⚠️ CRITICAL: You're Not Logged In!

The diagnostic tool shows: **"Auth session missing!"**

This means you're **not authenticated** (not logged in). You must log in first before you can see any leads.

## 🔍 What to Do RIGHT NOW

### Step 1: Log In to the Application
1. Navigate to **`/login`** (or click any protected page - it should redirect you)
2. Enter your **email and password**
3. Click **"Sign In"**
4. You'll be redirected based on your role:
   - **Super Admin** or **Team Member** → `/projects`
   - **Client** → `/analytics/[projectId]`

### Step 2: After Login, Go to Enquiries
1. Once logged in, navigate to **`/enquiries`**
2. Your leads should now be visible
3. If still not showing, run the debug tool again

### Step 3: If Still No Leads After Login

Once you're logged in and still see 0 leads, then check these issues:

#### Issue A: You're Not Assigned to the Project
**Symptom**: Debug tool shows "Not assigned to any projects" or "You can't access any sheets"

**Quick Fix**:
```sql
-- Option 1: Make yourself a Super Admin (sees all projects)
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'your@email.com';

-- Option 2: Assign yourself to the specific project
INSERT INTO project_assignments (user_id, project_id)
VALUES (
  (SELECT id FROM profiles WHERE email = 'your@email.com'),
  1  -- Replace with the actual project ID
);
```

Run this in **Supabase SQL Editor** (Dashboard → SQL Editor → New Query)

## 🤔 Why You Saw "43 Leads" But Got "Auth Error"

Here's what likely happened:

### Most Likely: Session Expired
1. You were logged in when you clicked "Save" and synced 43 leads ✅
2. The sync completed successfully and saved to database ✅
3. Your Supabase auth session expired (they last ~1 hour by default) ⏱️
4. When you navigated to `/enquiries`, the middleware redirected you to `/login` 🔒
5. But somehow you're viewing the Enquiries page without being logged in 🤔

**This can happen if:**
- You have multiple browser tabs open
- You used browser back button after logout
- Middleware didn't catch the expired session
- You directly accessed a cached page

### The Middleware Protection

Your app has a middleware (`middleware.ts`) that checks authentication on every page load:

```typescript
// Not authenticated → redirect to /login
if (!user) {
  return NextResponse.redirect('/login');
}
```

**However**, if you're seeing the Enquiries page with the debug tool, the middleware might not have caught your request. This could be due to:
- Browser cache serving a stale page
- Service worker caching
- Dev mode hot reload issue

## ✅ Confirmed: Your Leads ARE in the Database

The good news: If you saw "43 new leads found", they **ARE** saved in Supabase. The sync API worked correctly. You just need to:

1. **Log in** to view them
2. **Ensure you have access** to the project they belong to

#### Issue B: Wrong Project Selected
**Symptom**: Leads exist but you're viewing a different project

**Quick Fix**:
1. On Enquiries page, check the **Project dropdown**
2. Try selecting **"All Projects"**
3. Try selecting each project one by one
4. Or clear session storage:
   - Open browser DevTools (F12)
   - Console tab
   - Run: `sessionStorage.clear(); window.location.reload();`

#### Issue C: Sync Actually Failed
**Symptom**: Debug tool shows "0 total leads in database"

**Quick Fix**:
1. Go back to **Settings** page
2. Find your project
3. Click **"🔄 Sync to Supabase"** again
4. Wait for confirmation message
5. Check if it shows actual lead count

## 🎯 The Root Cause

Your CRM uses **Role-Based Access Control (RBAC)**:
- **Super Admins**: See all projects and all leads
- **Team Members/Clients**: Only see projects they're assigned to

When you sync 43 leads:
1. Leads are inserted into `sheet_leads` table ✅
2. They're linked to a `google_sheets` record ✅
3. That sheet belongs to a `project` ✅
4. **BUT** you might not have access to that project ❌

## 🛠️ Permanent Solutions

### Solution 1: Auto-Assign on Sync (Recommended)
Add this to `app/api/sync-sheet-to-supabase/route.ts` after line 98 (after creating the sheet):

```typescript
// Auto-assign current user to project
const { data: existingAssignment } = await supabase
  .from('project_assignments')
  .select('id')
  .eq('user_id', user.id)
  .eq('project_id', projectId)
  .maybeSingle();

if (!existingAssignment) {
  await supabase
    .from('project_assignments')
    .insert({ user_id: user.id, project_id: projectId });
}
```

### Solution 2: Better Error Messages
The enquiries page should show when projects exist but you can't access them.

### Solution 3: Admin Panel
Create an admin page where super admins can:
- See all users
- See all projects
- Assign users to projects
- Change user roles

## 📋 Diagnostic Checklist

Run these queries in browser console on Enquiries page:

```javascript
// Check your user info
const supabase = (await import('@supabase/ssr')).createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const { data: { user } } = await supabase.auth.getUser();
console.log('User ID:', user.id);

// Check your role
const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
console.log('Your role:', profile.role);

// Check total leads
const { count } = await supabase.from('sheet_leads').select('*', { count: 'exact', head: true });
console.log('Total leads in DB:', count);

// Check your project access
const { data: projects } = await supabase.from('project_assignments').select('project_id').eq('user_id', user.id);
console.log('Your assigned projects:', projects);
```

## 🚨 Emergency: See All Leads Immediately

If you need to see leads RIGHT NOW and deal with permissions later:

```sql
-- Run in Supabase SQL Editor
UPDATE profiles
SET role = 'super_admin'
WHERE id = 'YOUR_USER_ID_HERE';
```

Then refresh the Enquiries page.

## 📞 Still Not Working?

1. **Copy the debug tool output** (it has a "Copy Results" button)
2. Check these files:
   - `LEADS_SYNC_DIAGNOSIS.md` - Comprehensive technical analysis
   - This file - Quick fixes
3. Look for errors in:
   - Browser DevTools Console (F12)
   - Network tab (check API responses)
4. Verify environment variables in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📝 What We Added

- `components/LeadsDebugger.tsx` - Visual diagnostic tool (red button on Enquiries page)
- `LEADS_SYNC_DIAGNOSIS.md` - Technical deep-dive
- `HOW_TO_FIX_LEADS_ISSUE.md` - This quick guide

The debugger only shows in development mode and can be removed once the issue is fixed.
