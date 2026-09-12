# Testing Guide: Auth & Access Improvements

## 🎯 What We Fixed

1. ✅ **Auto-assign projects on sync** - Users automatically get access to projects they sync
2. ✅ **Authentication warnings** - Clear messages when not logged in
3. ✅ **No projects warning** - Clear message when no projects accessible
4. ✅ **Session monitoring** - Warns before session expires, auto-redirects when expired
5. ✅ **Debug tool** - Visual diagnostic for troubleshooting

## 🧪 Test Scenarios

### Test 1: Auto-Assignment on Sync

**Goal**: Verify users are automatically assigned to projects they sync

**Steps**:
1. Create a new user account (or use existing non-super-admin)
2. Log in as that user
3. Go to Settings/Projects page
4. Create a new project
5. Add a Google Sheet URL to the project
6. Click "🔄 Sync to Supabase"
7. Wait for "Found X new leads" message
8. Go to Enquiries page

**Expected Result**:
- ✅ Leads should be visible immediately
- ✅ No "You don't have access" message
- ✅ Project appears in the project dropdown

**Verify in Database**:
```sql
-- Check project_assignments table
SELECT * FROM project_assignments 
WHERE user_id = 'YOUR_USER_ID' 
AND project_id = YOUR_PROJECT_ID;

-- Should return a row with the assignment
```

### Test 2: Authentication Warning

**Goal**: Verify auth warning displays when not logged in

**Steps**:
1. Log in to the app
2. Go to Enquiries page (should work normally)
3. Open browser DevTools (F12)
4. Go to Application tab → Cookies
5. Delete all cookies starting with `sb-`
6. Refresh the page

**Expected Result**:
- ✅ Red banner appears: "Authentication Required"
- ✅ "Go to Login →" button is visible
- ✅ No leads table shows
- ✅ Clicking button takes you to `/login`

### Test 3: No Projects Warning

**Goal**: Verify warning when user has no project assignments

**Steps**:
1. Create a new user (non-super-admin)
2. Log in as that user
3. Don't create or get assigned to any projects
4. Go to Enquiries page

**Expected Result**:
- ✅ Yellow banner appears: "No Projects Accessible"
- ✅ Lists possible reasons
- ✅ Suggests contacting admin or creating project
- ✅ No leads table shows

### Test 4: Session Expiry Warning

**Goal**: Verify session monitoring warns before expiry

**Steps**:
**Option A (Long test - 1 hour wait)**:
1. Log in to the app
2. Stay on any page for ~55 minutes
3. Watch for toast notification

**Option B (Quick test - modify token)**:
1. Log in to the app
2. Open DevTools Console
3. Run this to simulate near-expiry:
```javascript
// This is complex - easier to test in production with real timeouts
// Or modify the SessionMonitor to use shorter intervals for testing
```

**Expected Result**:
- ✅ Toast appears: "⏰ Your session will expire soon. Save your work!"
- ✅ Toast appears ~5 minutes before actual expiry

### Test 5: Session Expiry Redirect

**Goal**: Verify auto-redirect when session expires

**Steps**:
1. Log in to the app
2. Open DevTools Console
3. Run this to clear session:
```javascript
// Clear auth cookies to simulate expiry
document.cookie.split(";").forEach(c => { 
  if (c.includes('sb-')) {
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  }
});

// Wait 1-2 minutes for SessionMonitor to detect
```

**Expected Result**:
- ✅ After 1 minute, toast appears: "Your session has expired. Please log in again."
- ✅ After 3 seconds, automatically redirects to `/login`
- ✅ Session storage is cleared

### Test 6: Debug Tool

**Goal**: Verify debug tool works correctly

**Steps**:
1. Go to Enquiries page (in development mode)
2. Look for red "🔍 Debug Leads" button (bottom-right)
3. Click it
4. Click "Run Diagnostics"

**Expected Result**:
- ✅ Modal opens with diagnostic sections
- ✅ Shows current user info
- ✅ Shows user role
- ✅ Shows project assignments
- ✅ Shows total leads count
- ✅ Shows accessible vs inaccessible sheets
- ✅ "Copy Results" button works

### Test 7: Multi-Role Access

**Goal**: Verify RBAC works for all roles

**Test 7a: Super Admin**
1. Log in as super admin
2. Go to Enquiries
3. Expected: See ALL projects and ALL leads

**Test 7b: Team Member with Assignment**
1. Log in as team member
2. Verify assigned to at least one project
3. Go to Enquiries
4. Expected: See only assigned projects and their leads

**Test 7c: Team Member without Assignment**
1. Log in as team member
2. Verify NOT assigned to any project (check DB)
3. Go to Enquiries
4. Expected: Yellow warning "No Projects Accessible"

**Test 7d: Client**
1. Log in as client
2. Expected: Redirected to `/analytics/[projectId]`
3. Trying to access `/enquiries` should redirect back

### Test 8: End-to-End Flow

**Goal**: Full flow from sync to viewing leads

**Steps**:
1. Log out completely
2. Clear all browser storage and cookies
3. Go to `/login`
4. Log in with valid credentials
5. Go to `/projects`
6. Create a new project "Test Project"
7. Add Google Sheet URL
8. Enter sheet name
9. Click "🔄 Sync to Supabase"
10. Wait for success message "Found X new leads"
11. Click "Enquiries" in sidebar
12. Check project dropdown - select your new project

**Expected Result**:
- ✅ No authentication errors
- ✅ Project appears in dropdown immediately
- ✅ Leads are visible
- ✅ Correct lead count matches sync message
- ✅ "Live" indicator is green
- ✅ Can filter, sort, and interact with leads

## 🐛 Known Issues & Limitations

### Issue 1: SessionMonitor in Mock Mode
If Supabase credentials are placeholder, SessionMonitor may not work correctly with mock data.

**Workaround**: Only runs in production with real Supabase

### Issue 2: Middleware vs Client Check
Middleware should catch unauthenticated users, but client-side check adds redundancy.

**Why Both**: Middleware runs on server, client check catches edge cases (cache, dev mode)

### Issue 3: Debug Tool Only in Development
The debug tool won't show in production builds.

**Why**: `process.env.NODE_ENV === 'development'` check
**To Show in Prod**: Remove the check or use a different environment variable

## 📊 Success Criteria

After all tests pass:

- ✅ Users never see "43 leads found but 0 displayed"
- ✅ Clear error messages for auth issues
- ✅ Clear warnings for access issues
- ✅ Auto-assignment works every time
- ✅ Session monitoring prevents surprise logouts
- ✅ Debug tool helps troubleshoot issues
- ✅ All roles work correctly (super_admin, team_member, client)

## 🔍 Troubleshooting Tests

### If Auto-Assignment Fails

Check console logs in `/api/sync-sheet-to-supabase`:
```
[sync-sheet-to-supabase] Auto-assigned user to project: X
```

If you see warning instead:
```
[sync-sheet-to-supabase] Failed to auto-assign project: <error>
```

Check:
1. `project_assignments` table exists
2. User has valid auth session
3. Project ID is valid

### If Auth Warning Doesn't Show

1. Check browser console for errors
2. Verify `getSupabaseClient()` is working
3. Check if `authStatus` state is updating
4. Verify component is rendering (not hidden by CSS)

### If Session Monitor Doesn't Work

1. Check console for `[SessionMonitor]` logs
2. Verify `getSupabaseClient()` returns real client (not mock)
3. Check if toast library is properly imported
4. Verify SessionMonitor is in layout

## 🎓 Manual Testing Checklist

Before marking as complete:

- [ ] Tested auto-assignment with new project
- [ ] Tested auth warning by clearing cookies
- [ ] Tested no projects warning with fresh user
- [ ] Tested session expiry warning (long wait or simulation)
- [ ] Tested session expiry redirect
- [ ] Tested debug tool with multiple scenarios
- [ ] Tested as super_admin role
- [ ] Tested as team_member with assignments
- [ ] Tested as team_member without assignments
- [ ] Tested as client role
- [ ] Tested full end-to-end flow
- [ ] Verified leads count matches sync message
- [ ] Verified project dropdown shows correct projects
- [ ] Verified leads are filterable and sortable
- [ ] Checked for console errors
- [ ] Checked for visual bugs
- [ ] Tested in Chrome
- [ ] Tested in Firefox (optional)
- [ ] Tested in Edge (optional)

## 📝 Regression Testing

When making future changes, re-test:

1. **Auth flow**: Login → Enquiries → See leads
2. **Sync flow**: Create project → Sync sheet → See leads
3. **Access control**: Team member sees only assigned projects
4. **Session handling**: Wait for expiry, verify redirect

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All tests pass locally
- [ ] No console errors
- [ ] Environment variables set correctly
- [ ] Database migrations applied (if any)
- [ ] Supabase RLS policies verified
- [ ] Session timeout configured appropriately
- [ ] SessionMonitor works with production Supabase
- [ ] Debug tool disabled or secured
- [ ] Documentation updated
- [ ] Changelog updated

## 🎉 Success Message

If all tests pass, you should see:

> ✅ **All Tests Passed!**
> 
> The "43 leads found but 0 displayed" issue is resolved. Users will:
> - Automatically get access to projects they sync
> - See clear error messages when auth fails
> - Get warned before session expires
> - Have diagnostic tools for troubleshooting
> 
> The CRM is now more user-friendly and transparent about access control.
