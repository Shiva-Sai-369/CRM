# ✅ Production Deployment Checklist

Use this checklist to ensure a smooth deployment of the new authentication system.

---

## 📋 Pre-Deployment

### Code Verification
- [x] Build completes without errors (`npm run build`)
- [x] TypeScript compiles without errors
- [x] No deprecation warnings in console
- [ ] All tests passing (if you have tests)
- [x] Git repository up to date

### Documentation Review
- [x] `AUTHENTICATION_ARCHITECTURE.md` reviewed
- [x] `MIGRATION_GUIDE.md` available
- [x] `QUICK_START.md` available
- [x] `AUTHENTICATION_REDESIGN_SUMMARY.md` reviewed

### Database Preparation
- [ ] Backup current database completed
- [ ] Backup downloaded and verified
- [ ] `supabase-schema.sql` reviewed
- [ ] Test database updated and tested

### Environment Configuration
- [ ] `.env.local` configured with production values
- [ ] Supabase URL verified
- [ ] Supabase Anon Key verified
- [ ] Site URL set to production domain
- [ ] Google OAuth credentials configured (if using)

---

## 🔧 Deployment Steps

### 1. Database Migration

**In Supabase Dashboard:**
- [ ] Navigate to SQL Editor
- [ ] Copy entire `supabase-schema.sql` content
- [ ] Execute the SQL
- [ ] Verify no errors in execution
- [ ] Check that triggers were created:
  ```sql
  SELECT routine_name 
  FROM information_schema.routines 
  WHERE routine_type = 'FUNCTION'
  AND routine_name LIKE '%user%';
  ```
- [ ] Check that tables exist:
  ```sql
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public';
  ```

### 2. Google OAuth Setup (if using)

**In Google Cloud Console:**
- [ ] Create/select project
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 Client ID
- [ ] Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
- [ ] Copy Client ID and Secret

**In Supabase Dashboard:**
- [ ] Navigate to Authentication → Providers
- [ ] Enable Google provider
- [ ] Paste Client ID
- [ ] Paste Client Secret
- [ ] Add redirect URL: `https://your-domain.com/auth/callback`
- [ ] Save configuration

### 3. Code Deployment

**Local preparation:**
- [ ] Update `.env.local` with production values
- [ ] Run `npm install` to ensure dependencies
- [ ] Run `npm run build` to verify build
- [ ] Test locally with production-like settings

**Deploy to hosting:**
- [ ] Push code to Git repository
- [ ] Deploy to your hosting platform (Vercel, Netlify, etc.)
- [ ] Set environment variables on hosting platform
- [ ] Verify deployment completed successfully
- [ ] Check deployment logs for errors

### 4. DNS & SSL

- [ ] Domain pointed to hosting
- [ ] SSL certificate active
- [ ] HTTPS working
- [ ] WWW and non-WWW both working (if applicable)

---

## 🧪 Post-Deployment Testing

### Authentication Tests

**First Admin Signup:**
- [ ] Visit production URL `/login`
- [ ] Sign up with new email/password
- [ ] Verify redirected to `/admin/dashboard`
- [ ] Check database:
  ```sql
  SELECT * FROM companies ORDER BY created_at DESC LIMIT 1;
  SELECT * FROM profiles ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Verify company was created
- [ ] Verify profile has role='admin'
- [ ] Verify profile has company_id

**Admin Login:**
- [ ] Logout
- [ ] Login with admin credentials
- [ ] Verify redirected to `/admin/dashboard`
- [ ] Check all admin menu items work

**Worker Creation:**
- [ ] Navigate to `/admin/workers`
- [ ] Click "Add Worker"
- [ ] Fill in worker details
- [ ] Verify temporary password displayed
- [ ] Check database:
  ```sql
  SELECT * FROM profiles WHERE role = 'worker' ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Verify worker profile created
- [ ] Verify worker has correct company_id

**Worker Login:**
- [ ] Logout from admin
- [ ] Login with worker credentials
- [ ] Verify redirected to `/worker/dashboard`
- [ ] Try to access `/admin/dashboard`
- [ ] Verify blocked and redirected

**Google OAuth:**
- [ ] Click "Continue with Google"
- [ ] Complete Google authentication
- [ ] Verify redirected to correct dashboard
- [ ] Check profile created correctly

**Password Reset:**
- [ ] Click "Forgot Password"
- [ ] Enter email
- [ ] Check email inbox
- [ ] Click reset link
- [ ] Set new password
- [ ] Login with new password

**Logout:**
- [ ] Click logout button
- [ ] Verify redirected to `/login`
- [ ] Try to access protected route
- [ ] Verify redirected to `/login`

### Security Tests

**Route Protection:**
- [ ] Without login, try to access `/admin/dashboard` → Should redirect to `/login`
- [ ] Without login, try to access `/worker/dashboard` → Should redirect to `/login`
- [ ] As worker, try to access `/admin/workers` → Should redirect to `/worker/dashboard`
- [ ] As admin, try to access `/worker/dashboard` → Should redirect to `/admin/dashboard`

**RLS Policies:**
- [ ] As admin, verify can see all company customers
- [ ] As worker, verify can only see assigned customers
- [ ] Create second company/admin
- [ ] Verify admin 1 cannot see admin 2's data
- [ ] Verify worker 1 cannot see company 2's data

**Database Security:**
- [ ] Try to insert profile without company_id → Should fail
- [ ] Try to insert profile with invalid role → Should fail
- [ ] Try to create auth user without metadata → Should fail (for non-first users)

### Functional Tests

**Customer Management:**
- [ ] Admin can create customer
- [ ] Admin can view all customers
- [ ] Admin can edit customer
- [ ] Admin can delete customer
- [ ] Admin can assign worker to customer
- [ ] Worker can view assigned customers
- [ ] Worker cannot view unassigned customers
- [ ] Worker can edit assigned customers

**Task Management:**
- [ ] Admin can create task
- [ ] Admin can assign task to worker
- [ ] Worker can view assigned tasks
- [ ] Worker cannot view other workers' tasks
- [ ] Worker can update task status
- [ ] Admin can view all tasks

**Activity Logs:**
- [ ] Actions create activity logs
- [ ] Admin can view all activity
- [ ] Worker can view own activity

### Performance Tests

- [ ] Page loads in < 2 seconds
- [ ] No console errors
- [ ] No network errors
- [ ] Authentication is instant
- [ ] Database queries are fast
- [ ] No memory leaks (check DevTools)

---

## 📊 Monitoring Setup

### Supabase Dashboard

**Enable monitoring:**
- [ ] Navigate to Reports → Usage
- [ ] Monitor active users
- [ ] Monitor database size
- [ ] Monitor API requests

**Set up alerts:**
- [ ] Configure email alerts for errors
- [ ] Set up usage threshold alerts
- [ ] Enable auth event notifications

### Application Monitoring

**Log checking:**
- [ ] Check application logs daily (first week)
- [ ] Monitor authentication errors
- [ ] Monitor database errors
- [ ] Monitor API errors

**Metrics tracking:**
- [ ] Track daily active users
- [ ] Track login success rate
- [ ] Track Google OAuth usage
- [ ] Track worker creation rate

---

## 🐛 Common Issues & Fixes

### Issue: "Profile not found"

**Quick Fix:**
```sql
-- Check if user exists in auth
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Check if profile exists
SELECT id, email FROM profiles WHERE email = 'user@example.com';

-- If profile missing, create manually
INSERT INTO profiles (id, company_id, full_name, email, role)
SELECT 
  id, 
  (SELECT id FROM companies LIMIT 1),
  email,
  email,
  'worker'
FROM auth.users 
WHERE email = 'user@example.com';
```

### Issue: "No company assigned"

**Quick Fix:**
```sql
-- Find companies
SELECT id, company_name FROM companies;

-- Assign user to company
UPDATE profiles 
SET company_id = 'company-uuid-here'
WHERE email = 'user@example.com';
```

### Issue: Google OAuth not working

**Check:**
1. Redirect URL in Google Console
2. Redirect URL in Supabase
3. Client ID and Secret correct
4. Google provider enabled

### Issue: Worker can access admin routes

**Quick Fix:**
```sql
-- Check user role
SELECT email, role FROM profiles WHERE email = 'worker@example.com';

-- If wrong role, fix it
UPDATE profiles SET role = 'worker' WHERE email = 'worker@example.com';
```

---

## 📝 Post-Deployment Tasks

### Immediate (Day 1)

- [ ] Send announcement email to team
- [ ] Update internal documentation
- [ ] Train admins on worker creation
- [ ] Monitor error logs closely
- [ ] Be available for support

### Short-term (Week 1)

- [ ] Review authentication logs daily
- [ ] Gather user feedback
- [ ] Fix any reported issues
- [ ] Update documentation based on feedback
- [ ] Create knowledge base articles

### Long-term (Month 1)

- [ ] Analyze usage patterns
- [ ] Identify optimization opportunities
- [ ] Plan feature enhancements
- [ ] Review security posture
- [ ] Update testing procedures

---

## 🔄 Rollback Plan

If critical issues arise:

### Step 1: Immediate Actions
- [ ] Put maintenance page up
- [ ] Document the issue
- [ ] Capture error logs
- [ ] Notify users

### Step 2: Assess Situation
- [ ] Determine severity
- [ ] Check if data is affected
- [ ] Review recent changes
- [ ] Decide: fix forward or rollback

### Step 3: Rollback (if needed)
- [ ] Restore previous code deployment
- [ ] Restore database backup (if needed)
- [ ] Test restored system
- [ ] Verify users can login
- [ ] Remove maintenance page

### Step 4: Post-Mortem
- [ ] Document what went wrong
- [ ] Identify root cause
- [ ] Plan prevention measures
- [ ] Update deployment process
- [ ] Schedule retry

---

## 📞 Support Contact

**For Critical Issues:**
- Emergency contact: [Your phone number]
- Email: [Your email]
- Slack: [Your Slack channel]

**For Questions:**
- Documentation: Review `AUTHENTICATION_ARCHITECTURE.md`
- Troubleshooting: See `QUICK_START.md`
- Migration: See `MIGRATION_GUIDE.md`

---

## ✅ Deployment Sign-Off

**Completed By:** _________________  
**Date:** _________________  
**Time:** _________________  
**Environment:** □ Development □ Staging □ Production  

**All Checks Passed:** □ Yes □ No  
**Issues Noted:** _________________  
**Next Review Date:** _________________  

---

## 🎉 Success Criteria

Deployment is successful when:

- ✅ All tests passing
- ✅ Zero critical errors
- ✅ Users can login
- ✅ Role-based access working
- ✅ Admin can create workers
- ✅ Google OAuth functioning
- ✅ Performance acceptable
- ✅ No security issues
- ✅ Monitoring active
- ✅ Team trained

**Status:** _________________  
**Production Ready:** □ Yes □ No  

---

*Use this checklist for every deployment to ensure consistency and quality.*
