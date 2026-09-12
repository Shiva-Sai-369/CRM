# Authentication Session Fix

## 🔴 Current Issue: "Auth session missing!"

You're seeing the Enquiries page but you're **not logged in**. This is why the diagnostic shows 0 leads.

## ✅ Immediate Solution

### Step 1: Clear Everything and Start Fresh

Open your browser DevTools (F12) and run this in the Console:

```javascript
// Clear all storage
localStorage.clear();
sessionStorage.clear();

// Clear all cookies for this site
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// Reload the page
window.location.href = '/login';
```

### Step 2: Log In Again

1. Enter your email and password
2. Click "Sign In"
3. Wait for redirect

### Step 3: Navigate to Enquiries

1. After successful login, go to `/enquiries`
2. Your 43 leads should now be visible
3. If not, run the debug tool again

## 🔍 Why This Happened

### The Authentication Flow

```
1. User logs in → Supabase creates session → Sets cookies
2. Session lasts ~1 hour (default)
3. Session expires → Middleware should redirect to /login
4. But you're viewing Enquiries WITHOUT valid session
```

### Possible Causes

**A. Browser Cache**
- The page is served from browser cache
- No network request = middleware never runs
- Page displays but API calls fail

**B. Multiple Tabs/Windows**
- Logged in one tab → synced leads
- Different tab/incognito → not logged in
- Viewing cached page

**C. Development Mode Hot Reload**
- Next.js dev server cached the page
- Session expired during development
- Page still renders but auth failed

**D. Service Worker or Browser Extension**
- Something is caching the page
- Prevents proper authentication checks

## 🛠️ Verify Your Authentication

### Check if You're Really Logged In

In browser console:

```javascript
// Check cookies
console.log('Cookies:', document.cookie);

// Should see something like:
// sb-<project>-auth-token=...
// sb-<project>-auth-token.0=...
// sb-<project>-auth-token.1=...
```

If you don't see `sb-*` cookies, you're not authenticated.

### Force Login Check

```javascript
const { createBrowserClient } = await import('@supabase/ssr');
const supabase = createBrowserClient(
  'https://rkbgfvkchoexmvxephkd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrYmdmdmtjaG9leG12eGVwaGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MzIzMTAsImV4cCI6MjA5ODMwODMxMH0.MxRBs2d2RDZSuiEdL9WAG82op94_HTvijd5pP_Baams'
);

const { data, error } = await supabase.auth.getSession();
console.log('Session:', data.session);
console.log('Error:', error);

if (!data.session) {
  console.log('❌ NOT LOGGED IN - Redirecting to login...');
  window.location.href = '/login';
}
```

## 🚀 After Logging In Successfully

### What Should Happen

1. **Login redirects you** based on your role:
   - Super Admin → `/projects`
   - Team Member → `/projects` (or `/no-projects` if not assigned)
   - Client → `/analytics/{projectId}`

2. **Navigate to Enquiries** (`/enquiries`)

3. **Leads should appear** (if you have access to the project)

### If Still No Leads After Login

Then the issue is **NOT authentication**, but **project access**. At that point:

1. Run the debug tool again
2. Check your role: `super_admin` sees all, others need assignments
3. Verify you're assigned to the project with the synced leads

## 📋 Quick Checklist

- [ ] Clear browser storage (localStorage, sessionStorage, cookies)
- [ ] Navigate to `/login`
- [ ] Enter credentials and sign in
- [ ] Verify redirect happens (not stuck on login page)
- [ ] Navigate to `/enquiries`
- [ ] Check if leads appear
- [ ] If not, run debug tool to check project access

## 🔐 Understanding Your Middleware Protection

Your app's `middleware.ts` protects all pages except:
- `/login` - Public login page
- `/_next/*` - Next.js internals
- `/favicon.*` - Static assets
- `/api/*` - API routes

When you access `/enquiries` without authentication:
- Middleware checks: `await supabase.auth.getUser()`
- If no user: `NextResponse.redirect('/login')`
- You should be automatically redirected

**If you're NOT being redirected**, try:
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear cache and hard reload (DevTools → Network tab → Disable cache)
3. Try in incognito/private window

## 💡 Testing in Development

When developing, sessions can get out of sync. Best practice:

```bash
# Stop the dev server
# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

Then clear browser storage and log in fresh.

## 🎯 Your Next Actions

1. **Immediate**: Log out completely (clear storage), then log in again
2. **Navigate**: Go to `/enquiries` after successful login
3. **Verify**: Check if your 43 leads appear
4. **If not**: Run debug tool, it will show project access issues instead of auth issues
