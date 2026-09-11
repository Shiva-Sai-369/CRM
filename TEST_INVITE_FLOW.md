# Testing the Client Invite Flow

## Quick Test Guide

Follow these steps to test the complete invite-to-project flow.

## Prerequisites

- [ ] Development server running (`npm run dev`)
- [ ] Supabase database configured
- [ ] Super admin account created
- [ ] At least one project exists
- [ ] Access to a real email account for testing

## Step-by-Step Test

### 1. Login as Super Admin

1. Navigate to http://localhost:3000/login
2. Enter super admin credentials
3. Click "Sign In"
4. Should redirect to `/projects`

**✅ Success:** You see the projects list page

### 2. Navigate to Team Management

1. Click "Team" in the sidebar
2. Should see team members list page

**✅ Success:** You see the team management interface

### 3. Send Client Invite

1. Click "Invite Client" button
2. Enter a test email address (must be a real email you can access)
3. Select a project from dropdown
4. Click "Send Invite"

**✅ Success:** 
- Success message appears
- Invitation sent confirmation

**📧 Email Check:**
- Open the email inbox for the test email
- Look for email from your Supabase project
- Subject should be: "You have been invited"

### 4. Click Invite Link

1. Open the invite email
2. Click the confirmation link
3. Should redirect through `/auth/callback`

**✅ Success:**
- Redirects to `/set-password` page
- Email field is pre-filled (read-only)
- Password fields are empty and ready

**🔍 Check Console:**
```
[auth/callback] Request received: { code: 'present', projectIdParam: '1' }
[auth/callback] Code exchange successful
[auth/callback] User authenticated: { id: '...', email: '...', password_set: false }
[auth/callback] Profile loaded: { role: 'client' }
[auth/callback] Project assignment created successfully
[auth/callback] Redirecting to password setup with destination: /analytics/1
```

### 5. Set Password

1. On `/set-password` page:
   - Enter password (minimum 8 characters)
   - Confirm password (must match)
2. Click "Set Password & Continue"

**✅ Success:**
- No error messages
- Redirects to project analytics page
- URL is `/analytics/[projectId]`

**❌ Common Errors:**
- "Password must be at least 8 characters" → Use longer password
- "Passwords do not match" → Re-enter matching passwords

### 6. Verify Analytics Page Access

1. Should land on `/analytics/[projectId]`
2. Should see project analytics dashboard
3. Should see project name in header

**✅ Success:**
- You see the analytics page
- Project data is visible
- No redirect loops

**🔍 URL Check:**
```
http://localhost:3000/analytics/1
```

### 7. Test Unauthorized Access

1. Try to navigate to `/projects`
2. Try to navigate to `/team`
3. Try to navigate to another project's analytics

**✅ Success:**
- All attempts redirect back to your assigned project
- No access to admin pages

**🔍 Expected Behavior:**
- `/projects` → Redirects to `/analytics/1`
- `/team` → Redirects to `/analytics/1`
- `/analytics/999` → Access denied or redirect

### 8. Test Logout and Login

1. Logout (click profile → Logout)
2. Navigate to `/login`
3. Notice the blue informational box about first-time users
4. Enter the test email and password you just set
5. Click "Sign In"

**✅ Success:**
- Login succeeds
- Automatically redirects to `/analytics/[projectId]`
- No password setup page (already set)

**🔍 Check Console:**
```
[login] Attempting sign in with password...
[login] Sign in successful, fetching user profile...
[login] Profile loaded, role: client
[login] Redirecting client to analytics: 1
```

## Advanced Tests

### Test 9: Multiple Project Assignments

If you want to test a client with multiple projects:

1. As super admin, assign client to another project
2. Login as client
3. Should redirect to FIRST assigned project
4. Client can switch projects via UI (if implemented)

### Test 10: Invite Link Re-use

1. Try clicking the same invite link again
2. Should still work (idempotent)
3. Should not create duplicate assignments

**✅ Success:**
- No errors
- No duplicate rows in `project_assignments`

### Test 11: Team Member Invite

1. As super admin, invite a team member
2. Use `/api/invite-team-member` endpoint
3. Follow same flow (email → set password)
4. Should redirect to `/projects` instead of analytics

## Database Verification

### Check Profile Created

```sql
SELECT * FROM profiles WHERE email = 'test@example.com';
```

**Expected:**
- One row
- `role = 'client'`
- `is_active = true`

### Check Project Assignment

```sql
SELECT pa.*, p.name as project_name
FROM project_assignments pa
JOIN projects p ON p.id = pa.project_id
WHERE pa.user_id = (SELECT id FROM profiles WHERE email = 'test@example.com');
```

**Expected:**
- One row
- `project_id` matches invited project
- `created_at` timestamp is recent

### Check Auth User

```sql
SELECT id, email, email_confirmed_at, 
       raw_user_meta_data->>'password_set' as password_set,
       raw_user_meta_data->>'role' as role
FROM auth.users 
WHERE email = 'test@example.com';
```

**Expected:**
- `email_confirmed_at` is set
- `password_set = 'true'` (after password setup)
- `role = 'client'`

## Troubleshooting

### Issue: Email not received

**Checks:**
1. Check Supabase Dashboard → Authentication → Users
   - User should appear in list
2. Check Supabase Dashboard → Authentication → Email Templates
   - Invite template should be enabled
3. Check spam folder
4. Verify email is valid format

**Fix:**
- Use a different email provider
- Check Supabase email settings
- Use a testing email service (Mailtrap, Mailhog)

### Issue: Profile not created

**Checks:**
1. Verify database trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

2. Check trigger function:
```sql
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
```

**Fix:**
- Recreate the trigger
- Check Supabase logs for errors
- Manually create profile if needed

### Issue: Project assignment not created

**Checks:**
1. Check console logs in `/auth/callback`
2. Look for `project_id` in URL
3. Check user metadata:
```sql
SELECT raw_user_meta_data FROM auth.users WHERE email = 'test@example.com';
```

**Fix:**
- Verify `project_id` parameter in invite URL
- Check for database errors in console
- Manually create assignment:
```sql
INSERT INTO project_assignments (user_id, project_id)
VALUES ('user-uuid', 1)
ON CONFLICT (user_id, project_id) DO NOTHING;
```

### Issue: Redirect loop

**Symptoms:**
- Browser shows "too many redirects"
- Unable to access any page

**Checks:**
1. Check middleware.ts logic
2. Verify profile.role value
3. Check console for middleware logs

**Fix:**
- Clear browser cookies
- Check role in database
- Verify middleware public routes

### Issue: Cannot login after password setup

**Checks:**
1. Verify password was set:
```sql
SELECT encrypted_password IS NOT NULL as has_password
FROM auth.users 
WHERE email = 'test@example.com';
```

2. Check user metadata:
```sql
SELECT raw_user_meta_data->>'password_set' as password_set
FROM auth.users 
WHERE email = 'test@example.com';
```

**Fix:**
- Reset password via Supabase Dashboard
- Use password reset flow
- Check for auth errors in console

## Success Criteria

All tests pass if:

- ✅ Client receives invite email
- ✅ Invite link works on first click
- ✅ Account is created automatically
- ✅ Password setup page appears
- ✅ Password can be set successfully
- ✅ Redirects to correct project analytics
- ✅ Login works with email + password
- ✅ Login redirects to analytics page
- ✅ Unauthorized pages are blocked
- ✅ No console errors
- ✅ No database errors
- ✅ Profile exists with correct role
- ✅ Project assignment exists

## Performance Check

For production readiness:

- [ ] Invite API responds < 500ms
- [ ] Callback handler completes < 2s
- [ ] Password setup saves < 1s
- [ ] Login redirects < 1s
- [ ] No memory leaks
- [ ] No excessive database queries

## Security Check

For production readiness:

- [ ] Invite links are single-use (code expires)
- [ ] Passwords are hashed (never plaintext)
- [ ] Sessions are HTTP-only cookies
- [ ] RBAC is enforced at middleware level
- [ ] RLS policies prevent data leakage
- [ ] No sensitive data in logs
- [ ] No service role key in client code

## Cleanup After Testing

1. Delete test users:
```sql
-- This will cascade delete profile and assignments
DELETE FROM auth.users WHERE email = 'test@example.com';
```

2. Or deactivate instead:
```sql
UPDATE profiles SET is_active = false WHERE email = 'test@example.com';
```

## Next Steps

After successful testing:

1. ✅ Deploy to staging environment
2. ✅ Test with real email addresses
3. ✅ Customize invite email template
4. ✅ Add error monitoring (Sentry, LogRocket)
5. ✅ Document for end users
6. ✅ Train admins on invite process
7. ✅ Set up support process for invite issues

## Test Report Template

```markdown
# Invite Flow Test Report

**Date:** YYYY-MM-DD
**Tester:** Your Name
**Environment:** Development / Staging / Production

## Test Results

| Step | Status | Notes |
|------|--------|-------|
| Admin login | ✅ / ❌ | |
| Send invite | ✅ / ❌ | |
| Receive email | ✅ / ❌ | |
| Click invite link | ✅ / ❌ | |
| Set password | ✅ / ❌ | |
| Redirect to analytics | ✅ / ❌ | |
| Access control | ✅ / ❌ | |
| Login works | ✅ / ❌ | |

## Issues Found

1. [Description of any issues]

## Screenshots

[Attach screenshots of key steps]

## Conclusion

Pass / Fail / Needs Work
```
