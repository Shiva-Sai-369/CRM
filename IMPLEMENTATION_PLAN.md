# Implementation Plan: Prevent Auth/Access Issues

## 🎯 Goal
Ensure users never see "43 leads found but 0 displayed" again by improving authentication feedback, auto-assigning projects, and better error messaging.

## 📋 Improvements to Implement

### Priority 1: Auto-Assign Project on Sync (CRITICAL)
**Problem**: User syncs leads but isn't assigned to the project
**Solution**: Automatically assign user to project when they sync a sheet

**File**: `app/api/sync-sheet-to-supabase/route.ts`
**Change**: Add auto-assignment after sheet creation
**Impact**: High - Prevents most access issues

### Priority 2: Better Auth Error Messages (HIGH)
**Problem**: Users see empty enquiries page without knowing why
**Solution**: Show clear messages for auth and access issues

**File**: `app/enquiries/page.tsx`
**Change**: Add conditional error messages
**Impact**: High - Users understand the problem

### Priority 3: Session Persistence Warning (MEDIUM)
**Problem**: Sessions expire after 1 hour without warning
**Solution**: Show toast/banner when session is about to expire

**File**: New component `components/SessionMonitor.tsx`
**Change**: Monitor session and warn before expiry
**Impact**: Medium - Better UX

### Priority 4: Sync Status Persistence (MEDIUM)
**Problem**: After sync, user loses track of which project has new leads
**Solution**: Store sync status and show in enquiries page

**File**: Multiple files
**Change**: Add sync tracking
**Impact**: Medium - Better visibility

## 🔨 Implementation Details

### 1. Auto-Assign Project on Sync

**Location**: `app/api/sync-sheet-to-supabase/route.ts`
**After line**: ~98 (after creating/updating google_sheets entry)

```typescript
// Auto-assign current user to project for access
const { data: existingAssignment } = await supabase
  .from('project_assignments')
  .select('id')
  .eq('user_id', user.id)
  .eq('project_id', projectId)
  .maybeSingle();

if (!existingAssignment) {
  const { error: assignError } = await supabase
    .from('project_assignments')
    .insert({
      user_id: user.id,
      project_id: projectId,
      created_at: new Date().toISOString()
    });
  
  if (assignError) {
    console.warn('[sync] Failed to auto-assign project:', assignError.message);
    // Don't fail the sync, just log the warning
  } else {
    console.log('[sync] Auto-assigned user to project:', projectId);
  }
}
```

### 2. Better Error Messages in Enquiries

**Location**: `app/enquiries/page.tsx`
**After line**: ~92 (in EnquiriesContent component)

Add state for auth check:
```typescript
const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

useEffect(() => {
  async function checkAuth() {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    setAuthStatus(session ? 'authenticated' : 'unauthenticated');
  }
  checkAuth();
}, []);
```

Add before the header section:
```tsx
{/* Authentication Warning */}
{authStatus === 'unauthenticated' && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Authentication Required</h3>
        <p className="text-red-700 mb-4">
          Your session has expired or you're not logged in. You need to sign in to view leads.
        </p>
        <a
          href="/login"
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
        >
          Go to Login →
        </a>
      </div>
    </div>
  </div>
)}

{/* No Projects Warning */}
{authStatus === 'authenticated' && projects.length === 0 && !loading && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0">
        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Projects Accessible</h3>
        <p className="text-yellow-700 mb-2">
          You don't have access to any projects. This could mean:
        </p>
        <ul className="list-disc list-inside text-yellow-700 space-y-1 mb-4">
          <li>You haven't been assigned to any projects yet</li>
          <li>No projects have been created in the system</li>
          <li>Your role doesn't allow project access</li>
        </ul>
        <p className="text-yellow-700 text-sm">
          Contact your administrator or create a project in the <a href="/projects" className="underline font-semibold">Projects page</a>.
        </p>
      </div>
    </div>
  </div>
)}
```

### 3. Session Monitor Component

**New File**: `components/SessionMonitor.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function SessionMonitor() {
  const [warningShown, setWarningShown] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    
    // Check session every minute
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Session expired
        toast.error("Your session has expired. Please log in again.", {
          duration: 10000,
          position: "top-center"
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          window.location.href = "/login";
        }, 3000);
        
        clearInterval(interval);
        return;
      }
      
      // Warn if session expires in less than 5 minutes
      if (session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000);
        const now = new Date();
        const minutesLeft = (expiresAt.getTime() - now.getTime()) / 1000 / 60;
        
        if (minutesLeft < 5 && minutesLeft > 0 && !warningShown) {
          toast("Your session will expire soon. Save your work!", {
            icon: "⏰",
            duration: 5000
          });
          setWarningShown(true);
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [warningShown]);

  return null; // No UI, just monitoring
}
```

**Usage**: Add to `app/layout.tsx`:
```tsx
import SessionMonitor from "@/components/SessionMonitor";

// In the layout component
<body>
  <SessionMonitor />
  {children}
</body>
```

### 4. Sync Status Tracking

**New Table**: `sync_history` (optional, for tracking)

```sql
CREATE TABLE sync_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id INTEGER REFERENCES projects(id),
  sheet_id INTEGER REFERENCES google_sheets(id),
  leads_added INTEGER,
  leads_skipped INTEGER,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Update API**: Store sync history in `sync-sheet-to-supabase/route.ts`:
```typescript
// After successful sync
await supabase.from('sync_history').insert({
  user_id: user.id,
  project_id: projectId,
  sheet_id: sheetId,
  leads_added: insertedCount,
  leads_skipped: rows.length - insertedCount
});
```

## 🚀 Implementation Order

### Phase 1: Critical Fixes (Do First)
1. ✅ Add auto-assignment in sync endpoint
2. ✅ Add auth status check in enquiries page
3. ✅ Add "not authenticated" banner
4. ✅ Add "no projects" banner

### Phase 2: UX Improvements (Do Next)
5. Add SessionMonitor component
6. Add session warning toast
7. Test session expiry flow

### Phase 3: Nice-to-Have (Optional)
8. Add sync history tracking
9. Show recent syncs in enquiries page
10. Add "Last synced" badge per project

## 🧪 Testing Checklist

After implementing:

- [ ] Log out completely
- [ ] Navigate to `/enquiries` directly
- [ ] Verify "Authentication Required" banner shows
- [ ] Click "Go to Login" button
- [ ] Log in successfully
- [ ] Navigate to `/enquiries`
- [ ] Verify banner is gone
- [ ] Create a new project
- [ ] Sync a sheet to that project
- [ ] Verify you're auto-assigned
- [ ] Check enquiries page shows leads
- [ ] Test with different roles (super_admin, team_member, client)
- [ ] Test session expiry (wait 1 hour or modify token)
- [ ] Verify session warning appears

## 📊 Success Metrics

After implementation, users should:
- ✅ Never see "43 leads but 0 displayed"
- ✅ Always know why they can't see leads
- ✅ Automatically get access to projects they create/sync
- ✅ Get warned before session expires
- ✅ See clear error messages for auth issues
- ✅ Understand their role and permissions

## 🔄 Rollback Plan

If issues occur:
1. Remove auto-assignment code (revert sync endpoint)
2. Remove auth banners (revert enquiries page)
3. Remove SessionMonitor (remove from layout)
4. Check logs for errors
5. Test manually

## 📝 Documentation Updates

After implementation, update:
- [ ] README.md - Add section on RBAC
- [ ] SETUP_GUIDE.md - Explain project assignments
- [ ] Add FAQ section about permissions
- [ ] Document session timeout behavior
