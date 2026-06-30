# 🚀 Authentication System Migration Guide

## Overview

This guide walks you through migrating from the old authentication system to the new production-grade architecture.

---

## ⚠️ Important Notes

1. **Backup First:** Always backup your database before running migrations
2. **Test Locally:** Test the migration on a development database first
3. **Downtime:** Plan for a brief maintenance window
4. **User Communication:** Inform users about the changes

---

## 📋 Pre-Migration Checklist

- [ ] Backup entire Supabase database
- [ ] Export list of all existing users
- [ ] Note which users are admins vs workers
- [ ] Note which users belong to which companies
- [ ] Test new code in development environment
- [ ] Verify new environment variables are set

---

## 🔧 Step-by-Step Migration

### Step 1: Backup Database

```sql
-- Run these queries and save the results
SELECT * FROM auth.users;
SELECT * FROM profiles;
SELECT * FROM companies;
SELECT * FROM customers;
SELECT * FROM tasks;
SELECT * FROM activity_logs;
```

### Step 2: Update Environment Variables

Ensure your `.env.local` has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3001  # Update port if different
```

### Step 3: Deploy New Database Schema

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `supabase-schema.sql`
3. Execute the script
4. Verify no errors

**What This Does:**
- Updates `handle_new_user()` trigger with first-user detection
- Adds helper function `is_first_user()`
- Adds company_id constraint
- Updates all RLS policies
- No data is deleted (DROP IF EXISTS only drops and recreates functions/triggers)

### Step 4: Verify Existing Data Integrity

```sql
-- Check for users without profiles
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Check for profiles without companies
SELECT id, email, full_name
FROM profiles
WHERE company_id IS NULL;

-- Check for profiles with invalid roles
SELECT id, email, role
FROM profiles
WHERE role NOT IN ('admin', 'worker');
```

**Fix Issues:**

```sql
-- If users exist without profiles, create them manually
INSERT INTO profiles (id, company_id, full_name, email, role)
VALUES ('user-uuid', 'company-uuid', 'User Name', 'user@example.com', 'worker');

-- If profiles exist without companies, assign them
UPDATE profiles
SET company_id = 'your-company-uuid'
WHERE company_id IS NULL AND role = 'worker';

-- For admins without companies, create a company first
INSERT INTO companies (company_name) VALUES ('Company Name');
-- Then update profile
UPDATE profiles SET company_id = 'new-company-uuid' WHERE id = 'admin-uuid';
```

### Step 5: Deploy New Application Code

```bash
# Install dependencies (if any new ones)
npm install

# Build the application
npm run build

# Start the application
npm run start
```

### Step 6: Test Authentication Flows

#### Test 1: Existing Admin Login
```
1. Navigate to /login
2. Login with existing admin credentials
3. Verify redirected to /admin/dashboard
4. Verify sidebar shows all admin options
5. Navigate to /admin/workers
6. Verify can see existing workers
```

#### Test 2: Existing Worker Login
```
1. Navigate to /login
2. Login with existing worker credentials
3. Verify redirected to /worker/dashboard
4. Try to access /admin/dashboard
5. Verify blocked and redirected back
```

#### Test 3: Create New Worker
```
1. Login as admin
2. Navigate to /admin/workers
3. Click "Add Worker"
4. Fill in name and email
5. Note the temporary password
6. Logout
7. Login as new worker
8. Verify access to worker dashboard only
```

#### Test 4: Google OAuth
```
1. Navigate to /login
2. Click "Continue with Google"
3. Complete OAuth flow
4. Verify redirected to correct dashboard based on role
```

### Step 7: Update Google OAuth Settings

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Set **Redirect URLs** to:
   ```
   http://localhost:3001/auth/callback
   https://your-production-domain.com/auth/callback
   ```
4. Add your Google Client ID and Client Secret
5. In Google Cloud Console:
   - Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`

---

## 🔄 Handling Edge Cases

### Case 1: Multiple Companies in Same Database

If you have multiple companies in your system:

```sql
-- Verify each company has at least one admin
SELECT c.id, c.company_name, COUNT(p.id) as admin_count
FROM companies c
LEFT JOIN profiles p ON c.id = p.company_id AND p.role = 'admin'
GROUP BY c.id, c.company_name
HAVING COUNT(p.id) = 0;

-- If any companies have no admin, promote a worker or create an admin
UPDATE profiles
SET role = 'admin'
WHERE id = 'worker-uuid-to-promote'
AND company_id = 'company-without-admin';
```

### Case 2: Users Created Before Migration

Existing users will continue to work normally because:
- Their auth.users entries remain unchanged
- Their profiles entries remain unchanged
- New trigger only affects NEW signups
- Old users use existing authentication flow

### Case 3: First-Time Admin After Migration

If someone signs up fresh after migration:
1. They become first user (if profiles table is empty)
2. Trigger auto-creates company
3. They get admin role automatically
4. They can immediately create workers

---

## 🐛 Troubleshooting Migration Issues

### Issue: Build Errors

**Error:** `Cannot find module '@/contexts/AuthContext'`

**Fix:**
```bash
# Ensure file exists
ls -la contexts/AuthContext.tsx

# If missing, recreate from AUTHENTICATION_ARCHITECTURE.md
# Or copy from the migration files
```

### Issue: TypeScript Errors

**Error:** `Property 'isAdmin' does not exist on type 'AuthContext'`

**Fix:**
```typescript
// Make sure you're importing from the new context
import { useAuth } from '@/contexts/AuthContext'; // ✅ NEW
// NOT from
import { useAuth } from '@/hooks/useAuth'; // ❌ OLD
```

### Issue: Infinite Redirect Loop

**Symptom:** Page keeps redirecting between /login and /admin/dashboard

**Causes:**
1. Middleware and AuthContext fighting
2. Profile not being fetched correctly
3. Cookies not being set

**Fix:**
```typescript
// Check middleware.ts uses correct cookie API
// Check AuthContext.tsx is wrapped in root layout
// Clear browser cookies and localStorage
// Logout and login again
```

### Issue: Worker Can Access Admin Routes

**Cause:** Middleware not running or RLS policies wrong

**Fix:**
```sql
-- Verify user role in database
SELECT id, email, role FROM profiles WHERE email = 'worker@example.com';

-- Verify middleware.ts is in root directory
-- Check middleware config matcher
```

### Issue: "New users must be created by an administrator"

**Cause:** Someone tried to self-register as worker

**Expected Behavior:** This is correct! Workers can't self-register.

**Fix:** Admin must create worker through `/admin/workers`

---

## 📊 Post-Migration Verification

Run these checks after migration:

### 1. Database Integrity

```sql
-- All profiles should have companies
SELECT COUNT(*) FROM profiles WHERE company_id IS NULL;
-- Expected: 0

-- All profiles should have valid roles
SELECT COUNT(*) FROM profiles WHERE role NOT IN ('admin', 'worker');
-- Expected: 0

-- All companies should have at least one admin
SELECT company_id, COUNT(*) 
FROM profiles 
WHERE role = 'admin' 
GROUP BY company_id;
-- Expected: At least 1 per company
```

### 2. Authentication Logs

Check Supabase Dashboard → Authentication → Logs for:
- ✅ Successful logins
- ❌ Failed login attempts
- ✅ OAuth callbacks
- ❌ Any errors

### 3. RLS Policy Test

```sql
-- Test as admin (set your session)
SELECT set_config('request.jwt.claims', '{"sub": "admin-uuid"}', true);
SELECT COUNT(*) FROM customers;
-- Should see all company customers

-- Test as worker
SELECT set_config('request.jwt.claims', '{"sub": "worker-uuid"}', true);
SELECT COUNT(*) FROM customers WHERE assigned_worker = 'worker-uuid';
-- Should only see assigned customers
```

### 4. Frontend Tests

- [ ] Admin can login
- [ ] Worker can login
- [ ] Google OAuth works
- [ ] Admin can create workers
- [ ] Worker creation generates password
- [ ] Role-based redirects work
- [ ] Protected routes blocked
- [ ] Logout works
- [ ] Password reset works

---

## 🔙 Rollback Plan

If something goes wrong, follow this rollback procedure:

### 1. Revert Database Changes

```sql
-- Restore old trigger (if you saved it)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name, email, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'role', 'worker')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Revert Code

```bash
# If using git
git revert HEAD

# Or restore from backup
cp -r backup/* .

# Rebuild
npm run build
npm run start
```

### 3. Restore Backup Data

```sql
-- Only if data was corrupted (unlikely)
-- Restore from your pg_dump backup
```

---

## 📝 Migration Checklist

Use this checklist during your migration:

**Pre-Migration:**
- [ ] Backup database completed
- [ ] Environment variables verified
- [ ] New code tested in dev
- [ ] Users notified of maintenance window

**During Migration:**
- [ ] Database schema updated
- [ ] Trigger deployed
- [ ] New code deployed
- [ ] Environment restarted
- [ ] Smoke tests passed

**Post-Migration:**
- [ ] All existing users can login
- [ ] Admin features work
- [ ] Worker features work
- [ ] Google OAuth works
- [ ] Worker creation works
- [ ] RLS policies enforced
- [ ] No errors in logs
- [ ] Performance is good

**Cleanup:**
- [ ] Remove old useAuth hook from `hooks/useAuth.ts` (keep for reference if needed)
- [ ] Remove any unused signup pages
- [ ] Update documentation
- [ ] Notify users migration complete

---

## 🎯 Success Criteria

Migration is successful when:

1. ✅ All existing users can login
2. ✅ Role-based access works correctly
3. ✅ Admins can create new workers
4. ✅ Workers cannot self-register
5. ✅ Google OAuth functions properly
6. ✅ No data loss
7. ✅ No security regressions
8. ✅ Application is stable

---

## 📞 Support

If you encounter issues during migration:

1. Check troubleshooting section above
2. Review `AUTHENTICATION_ARCHITECTURE.md`
3. Check Supabase logs for specific errors
4. Verify all files are in correct locations
5. Ensure no typos in environment variables

---

## 🎉 Completion

Once migration is complete:

1. Remove this file (or archive it)
2. Update your README.md
3. Document the new authentication flow for your team
4. Consider adding integration tests
5. Monitor error logs for first few days

Congratulations! Your authentication system is now production-ready. 🚀
