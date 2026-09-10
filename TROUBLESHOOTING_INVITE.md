# Invite Flow Troubleshooting Guide

## Common Issues & Solutions

### Issue 1: "Invalid login credentials" Error

**Symptom:**
User tries to login at `/login` page and gets error: "Invalid login credentials"

**Root Cause:**
User is trying to login BEFORE completing the invite flow. They haven't set a password yet.

**Solution:**
1. **For Users:** 
   - Check your email for the invite link
   - Click the invite link FIRST
   - You'll be taken to a password setup page
   - Set your password there
   - THEN return to login page and use that password

2. **For Admins:**
   - Remind users to click the email invite link first
   - The login page now shows a blue info box explaining this

**Better Error Message (Now Implemented):**
```
Invalid email or password. If you just received an invite, 
please click the link in your email first to set up your account.
```

### Issue 2: Multiple Supabase Client Instances

**Symptom:**
Browser console shows warning:
```
Multiple GoTrueClient instances detected in the same browser context
```

**Root Cause:**
Creating new Supabase client on every render instead of reusing a single instance.

**Solution (Now Fixed):**
Login and set-password pages now use `useMemo` to create a single client instance:

```typescript
const supabase = useMemo(
  () => createBrowserClient(supabaseUrl, supabaseAnonKey),
  []
);
```

**Impact:**
- Warning is now eliminated
- Better performance
- Cleaner console logs

### Issue 3: Hydration Warning - Extra Attributes

**Symptom:**
```
Warning: Extra attributes from the server: cz-shortcut-listen
```

**Root Cause:**
Browser extension (likely Grammarly or similar) is injecting attributes into the page.

**Solution:**
- This is **NOT** caused by your code
- It's a browser extension adding attributes
- Safe to ignore (doesn't affect functionality)
- Disable browser extensions in development to remove warning

**Extensions That Cause This:**
- Grammarly
- LastPass
- Password managers
- Accessibility tools

### Issue 4: User Clicks Invite Link Multiple Times

**Symptom:**
User clicks invite link again after already setting password.

**Expected Behavior:**
- If password already set → Redirects to project
- If password not set → Goes to password setup

**Solution (Already Handled):**
The auth callback checks `password_set` flag:
```typescript
const needsPasswordSetup = user.user_metadata?.password_set === false;
```

### Issue 5: Email Not Received

**Symptom:**
User doesn't receive invite email.

**Solutions:**
1. Check spam folder
2. Verify email address is correct
3. Check Supabase email settings:
   - Go to Supabase Dashboard → Authentication → Email Templates
   - Verify SMTP is configured
   - Check rate limits

4. Test with different email provider:
   - Gmail
   - Outlook
   - Corporate email

### Issue 6: "No session" Error on Password Setup Page

**Symptom:**
User lands on `/set-password` but gets error "No session"

**Root Cause:**
Session expired or invite link is too old.

**Solution:**
1. Request a new invite from admin
2. Click the NEW invite link within 24 hours
3. Complete password setup immediately

### Issue 7: Redirect Loop

**Symptom:**
Browser shows "Too many redirects" or keeps redirecting.

**Possible Causes:**
1. Profile role is NULL or invalid
2. Project assignment missing for client
3. Middleware logic conflict

**Debug Steps:**
1. Check browser console for logs
2. Verify profile in database:
```sql
SELECT * FROM profiles WHERE email = 'user@example.com';
```

3. Check project assignments:
```sql
SELECT * FROM project_assignments 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'user@example.com');
```

4. Clear browser cookies and try again

### Issue 8: "Profile Missing" Error

**Symptom:**
Redirect to `/login?error=profile_missing`

**Root Cause:**
Database trigger didn't create profile automatically.

**Solutions:**
1. Check trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

2. Check trigger function:
```sql
\df handle_new_user
```

3. Manually create profile:
```sql
INSERT INTO profiles (id, email, role, is_active)
VALUES (
  'user-uuid-here',
  'user@example.com',
  'client',
  true
);
```

## Quick Reference

### Normal Flow (No Errors):
```
1. Admin sends invite → ✅
2. User receives email → ✅
3. User clicks link → ✅
4. Redirects to /set-password → ✅
5. User sets password → ✅
6. Redirects to /analytics/[projectId] → ✅
7. Future logins work → ✅
```

### Debug Checklist:

When user reports issues:
- [ ] Did they receive the email?
- [ ] Did they click the invite link?
- [ ] Did they complete password setup?
- [ ] What error message do they see?
- [ ] Check browser console logs
- [ ] Check Supabase auth logs
- [ ] Verify database records

### Console Logs to Look For:

**Good Flow:**
```
[auth/callback] Request received: { code: 'present', projectIdParam: '1' }
[auth/callback] Code exchange successful
[auth/callback] Profile loaded: { role: 'client' }
[auth/callback] Project assignment created successfully
[set-password] Password updated successfully
[login] Sign in successful
[login] Redirecting client to analytics: 1
```

**Problem Flow:**
```
[login] Sign in failed: Invalid login credentials
→ User hasn't completed invite flow

[auth/callback] Profile still missing after retry
→ Database trigger issue

[set-password] Session lost after password update
→ Re-authenticating...
```

## Testing Checklist

Before reporting a bug, test:
- [ ] Clear browser cache and cookies
- [ ] Try incognito/private window
- [ ] Disable browser extensions
- [ ] Test with different browser
- [ ] Check email spam folder
- [ ] Verify Supabase status (status.supabase.com)
- [ ] Check environment variables
- [ ] Verify database tables exist
- [ ] Check Supabase auth logs

## Getting Help

When asking for help, provide:
1. **Exact error message** from browser console
2. **Steps to reproduce** the issue
3. **Browser and version** (Chrome 120, Firefox 121, etc.)
4. **Console logs** (copy the `[auth/callback]` or `[login]` logs)
5. **Database state** (run the SQL queries above)
6. **Supabase auth logs** (from dashboard)

## Preventing Issues

### For Admins:
1. ✅ Always test invite flow in staging first
2. ✅ Provide clear instructions to invited users
3. ✅ Monitor Supabase email delivery
4. ✅ Keep email templates updated
5. ✅ Test with various email providers

### For Users:
1. ✅ Check spam folder immediately
2. ✅ Click invite link within 24 hours
3. ✅ Complete password setup immediately
4. ✅ Use strong password (8+ characters)
5. ✅ Save password securely

## Environment Issues

### Development:
- Ensure `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- Restart dev server after env changes
- Clear Next.js cache: `rm -rf .next`

### Production:
- Ensure `NEXT_PUBLIC_APP_URL=https://yourapp.com`
- Verify Supabase redirect URL is whitelisted
- Check CORS settings
- Monitor error logs

## Database Verification

### Check User Created:
```sql
SELECT id, email, email_confirmed_at, 
       raw_user_meta_data->>'role' as role,
       raw_user_meta_data->>'password_set' as password_set
FROM auth.users 
WHERE email = 'user@example.com';
```

### Check Profile Created:
```sql
SELECT * FROM profiles 
WHERE email = 'user@example.com';
```

### Check Project Assignment:
```sql
SELECT pa.*, p.name 
FROM project_assignments pa
JOIN profiles prof ON prof.id = pa.user_id
JOIN projects p ON p.id = pa.project_id
WHERE prof.email = 'user@example.com';
```

## Summary

Most issues fall into these categories:
1. **User error** - Trying to login before completing invite (most common)
2. **Email delivery** - Spam filters, SMTP issues
3. **Database** - Trigger not working, missing records
4. **Session** - Expired invite links
5. **Environment** - Wrong URLs, missing env vars

The implementation includes extensive logging, so checking browser console is the first step in debugging any issue.
