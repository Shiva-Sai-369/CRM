# Quick Reference Card: Auth & Access Issues

## 🚨 Problem: Can't See Leads

### Symptom 1: Empty Enquiries Page
**Try this first**:
1. Check if you're logged in (look for user menu in top-right)
2. If not logged in → Go to `/login`
3. After login, refresh Enquiries page

### Symptom 2: "Authentication Required" Banner (Red)
**Solution**: Click "Go to Login" button or visit `/login`

### Symptom 3: "No Projects Accessible" Banner (Yellow)
**Solutions**:
- Ask admin to assign you to projects
- Or create a new project in `/projects`
- Or have admin promote you to `super_admin`

### Symptom 4: Leads Synced But Not Visible
**Check**:
1. Are you viewing the correct project? (check dropdown)
2. Try "All Projects" option
3. Run debug tool (🔍 button in development mode)

## 🔧 Quick Fixes

### Fix 1: Clear Everything and Re-Login
```javascript
// Paste in browser console (F12)
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
window.location.href = '/login';
```

### Fix 2: Make User Super Admin
```sql
-- Run in Supabase SQL Editor
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'user@example.com';
```

### Fix 3: Assign User to Project
```sql
-- Run in Supabase SQL Editor
INSERT INTO project_assignments (user_id, project_id)
VALUES (
  (SELECT id FROM profiles WHERE email = 'user@example.com'),
  1  -- Change to your project ID
);
```

### Fix 4: Check Leads Count
```javascript
// Paste in browser console
const supabase = (await import('@supabase/ssr')).createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const { count } = await supabase.from('sheet_leads').select('*', { count: 'exact', head: true });
console.log('Total leads:', count);
```

## 📚 Documentation Index

| Document | When to Read |
|----------|--------------|
| `FINAL_SUMMARY.md` | Overview of issue and solution |
| `HOW_TO_FIX_LEADS_ISSUE.md` | Step-by-step troubleshooting |
| `AUTH_SESSION_FIX.md` | Authentication problems |
| `LEADS_SYNC_DIAGNOSIS.md` | Technical deep-dive |
| `TESTING_GUIDE.md` | Running tests |
| `IMPLEMENTATION_PLAN.md` | Understanding code changes |
| `QUICK_REFERENCE.md` | This file - quick lookup |

## 🛠️ Tools Available

| Tool | How to Access | Purpose |
|------|---------------|---------|
| **Debug Tool** | 🔍 button on Enquiries (dev mode) | Diagnose auth/access issues |
| **Session Monitor** | Automatic (no UI) | Warns before session expires |
| **Warning Banners** | Automatic on Enquiries | Shows auth/access problems |

## 🔐 Understanding Roles

| Role | Access Level | Sees |
|------|-------------|------|
| `super_admin` | All projects | Everything |
| `team_member` | Assigned projects only | Only assigned projects |
| `client` | Analytics only | Only their project analytics |

## ⚡ Common Commands

### Check Auth Status
```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log('Logged in:', !!session);
```

### Check Your Role
```javascript
const { data: profile } = await supabase.from('profiles')
  .select('role')
  .eq('id', session.user.id)
  .single();
console.log('Your role:', profile.role);
```

### Check Project Access
```javascript
const { data: assignments } = await supabase.from('project_assignments')
  .select('project_id')
  .eq('user_id', session.user.id);
console.log('Your projects:', assignments?.map(a => a.project_id));
```

## 🎯 Decision Tree

```
Can't see leads?
│
├─ Not logged in? → Go to /login
│
├─ Logged in but empty?
│  │
│  ├─ Red banner showing? → Click "Go to Login"
│  │
│  ├─ Yellow banner showing?
│  │  │
│  │  ├─ Super admin? → Contact support (shouldn't happen)
│  │  └─ Team member? → Ask admin to assign you to projects
│  │
│  └─ No banner?
│     │
│     ├─ Wrong project selected? → Try "All Projects"
│     ├─ Synced recently? → Refresh page
│     └─ Still nothing? → Run debug tool (🔍 button)
│
└─ Other issue? → Read HOW_TO_FIX_LEADS_ISSUE.md
```

## 📞 Support Checklist

Before contacting support, gather:
- [ ] Your email/user ID
- [ ] Your role (run: `await supabase.from('profiles').select('role').eq('id', user.id).single()`)
- [ ] Project IDs you expect to see
- [ ] Screenshot of Enquiries page
- [ ] Browser console errors (F12 → Console tab)
- [ ] Debug tool output (click 🔍, run diagnostics, copy results)

## 💡 Pro Tips

1. **After syncing leads**: They appear immediately (with new auto-assignment)
2. **Session expires after ~1 hour**: You'll get a warning 5 minutes before
3. **Use "All Projects"**: See leads from all accessible projects
4. **Debug tool is your friend**: Answers most questions instantly
5. **Clear storage if stuck**: It solves 90% of weird issues

## 🎓 Key Takeaways

- ✅ **Authentication required** to see any data
- ✅ **Project assignment required** to see specific projects  
- ✅ **Super admins** see everything, others need assignments
- ✅ **Auto-assignment** happens when you sync sheets (new!)
- ✅ **Clear messages** tell you what's wrong (new!)
- ✅ **Session monitoring** prevents surprise logouts (new!)
- ✅ **Debug tool** helps troubleshoot (new!)

## 🚀 New Features Summary

| Feature | Benefit |
|---------|---------|
| Auto-assign on sync | Instant access to synced leads |
| Auth warning banner | Know when to log in |
| No projects banner | Know what's wrong |
| Session monitor | Warning before logout |
| Debug tool | Self-service troubleshooting |

---

**Last Updated**: [Current Date]  
**Version**: 1.0.0  
**Status**: ✅ Implemented, ⏳ Testing

**Need Help?** See `HOW_TO_FIX_LEADS_ISSUE.md` for detailed guidance.
