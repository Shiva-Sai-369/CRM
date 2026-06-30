# 🚀 Quick Start Guide - Production Authentication System

## For First-Time Setup

Follow these steps to get your CRM up and running with the new authentication system.

---

## 📋 Prerequisites

- Node.js 18+ installed
- Supabase account and project created
- Google OAuth credentials (optional, for Google login)

---

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies

```bash
cd d:\WebRockets\CRM
npm install
```

### Step 2: Configure Environment Variables

Create `.env.local` in the root directory:

```env
# Get these from: Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Your application URL
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

### Step 3: Run Database Schema

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `supabase-schema.sql`
3. Click "Run"
4. Wait for success message

### Step 4: Configure Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
6. Copy Client ID and Client Secret
7. In Supabase Dashboard → Authentication → Providers:
   - Enable Google
   - Paste Client ID and Secret
   - Add redirect URL: `http://localhost:3001/auth/callback`

### Step 5: Start the Application

```bash
npm run dev
```

Visit: http://localhost:3001/login

---

## 🎯 First User Setup

### Create Your First Admin Account

1. Open http://localhost:3001/login
2. Enter email and password (or use Google)
3. Click "Sign In"

**What Happens Automatically:**
- System detects you're the first user
- Creates a new company: "My Company"
- Creates your admin profile
- Links you to the company
- Redirects you to `/admin/dashboard`

You're now an admin! 🎉

---

## 👥 Create Your First Worker

### As Admin:

1. Navigate to `/admin/workers`
2. Click "Add Worker" button
3. Fill in worker details:
   - Full Name: `John Doe`
   - Email: `john@example.com`
4. Click "Create Worker"
5. **IMPORTANT:** Copy the temporary password shown
6. Share password securely with the worker

### As Worker:

1. Navigate to `/login`
2. Enter email and temporary password
3. Click "Sign In"
4. Redirected to `/worker/dashboard`

Worker can now access assigned customers and tasks!

---

## 🔐 Authentication Flows

### Email/Password Login

```
1. Visit /login
2. Enter email and password
3. System checks database for role
4. Redirect to:
   - /admin/dashboard (if admin)
   - /worker/dashboard (if worker)
```

### Google OAuth Login

```
1. Visit /login
2. Click "Continue with Google"
3. Complete Google authentication
4. System checks database for role
5. Redirect to appropriate dashboard
```

### Worker Creation by Admin

```
1. Admin logs in
2. Navigate to /admin/workers
3. Click "Add Worker"
4. System creates account with:
   - role = 'worker'
   - company_id = admin's company
   - temporary password
5. Admin shares password with worker
```

---

## 🛡️ Security Features

### Automatic Protections

✅ **Workers Cannot Self-Register**
- No signup page
- Workers created only by admins

✅ **Database-Driven Roles**
- UI cannot bypass role checks
- All role verification from database

✅ **Company Isolation**
- RLS policies enforce data separation
- Users only see their company's data

✅ **Route Protection**
- Middleware blocks unauthorized access
- Auto-redirect to correct dashboard

---

## 📱 User Interface

### Login Page
- Single authentication form
- No role selector (role from database)
- Email/password + Google OAuth options
- Password reset functionality

### Admin Dashboard
- Overview stats
- Customer management
- Worker management
- Task management
- Activity logs
- Settings

### Worker Dashboard
- Assigned customers only
- Assigned tasks only
- Personal activity logs
- Limited settings

---

## 🧪 Testing Your Setup

### Test Admin Access

```bash
# Login as admin
# Navigate to:
✅ /admin/dashboard - Should work
✅ /admin/customers - Should work
✅ /admin/workers - Should work
✅ /admin/tasks - Should work
❌ /worker/dashboard - Should redirect to admin
```

### Test Worker Access

```bash
# Login as worker
# Navigate to:
✅ /worker/dashboard - Should work
✅ /worker/customers - Should work (assigned only)
✅ /worker/tasks - Should work (assigned only)
❌ /admin/dashboard - Should redirect to worker
❌ /admin/workers - Should redirect to worker
```

### Test Authentication

```bash
# Test cases:
✅ Admin can login
✅ Worker can login
✅ Google OAuth works
✅ Wrong password rejected
✅ Unregistered email rejected
✅ Logout works
✅ Protected routes blocked when logged out
```

---

## 🔧 Common Tasks

### Add a New Worker

```typescript
// As admin, use the UI:
1. /admin/workers
2. Click "Add Worker"
3. Fill form
4. Share generated password
```

### Reset a User's Password

```typescript
// User clicks "Forgot Password" on login page
// Or admin can:
1. Delete user in Supabase Dashboard → Authentication
2. Recreate user through worker creation form
3. Share new temporary password
```

### Change User Role

```sql
-- In Supabase SQL Editor:
UPDATE profiles
SET role = 'admin'  -- or 'worker'
WHERE email = 'user@example.com';
```

### Assign Worker to Customer

```typescript
// As admin, in customer management:
1. Click on customer
2. Select worker from dropdown
3. Save
```

---

## 📊 Monitoring

### Check Active Users

```sql
-- In Supabase SQL Editor:
SELECT 
  p.full_name,
  p.email,
  p.role,
  c.company_name,
  p.created_at
FROM profiles p
JOIN companies c ON p.company_id = c.id
ORDER BY p.created_at DESC;
```

### Check Authentication Logs

```
Supabase Dashboard → Authentication → Logs
```

### Check Error Logs

```
Supabase Dashboard → Logs
Filter by: Error
```

---

## 🐛 Troubleshooting

### "Profile not found"

**Cause:** User exists in auth but not in profiles table

**Fix:**
```sql
-- Manually create profile
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

### "No company assigned"

**Cause:** Profile has NULL company_id

**Fix:**
```sql
UPDATE profiles
SET company_id = (SELECT id FROM companies WHERE company_name = 'Your Company')
WHERE email = 'user@example.com';
```

### Google OAuth Not Working

**Check:**
1. Redirect URL in Google Console matches Supabase
2. Redirect URL in Supabase matches your app
3. Google provider enabled in Supabase
4. Client ID and Secret are correct

### Cannot Access Admin Routes

**Check:**
```sql
-- Verify user role
SELECT email, role FROM profiles WHERE email = 'your@email.com';
-- Should show role = 'admin'

-- If worker, update to admin:
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

---

## 🎯 Next Steps

After basic setup:

1. **Customize Company Name**
   ```sql
   UPDATE companies SET company_name = 'Your Company Name' WHERE id = 'your-company-id';
   ```

2. **Add More Workers**
   - Use admin dashboard worker creation

3. **Import Customers**
   - Use customer import feature (if available)
   - Or manually add through UI

4. **Configure Settings**
   - Update profile information
   - Configure email notifications (if implemented)

5. **Explore Features**
   - Customer management
   - Task assignment
   - Activity tracking
   - Reporting

---

## 📚 Additional Resources

- **Architecture Details:** See `AUTHENTICATION_ARCHITECTURE.md`
- **Migration Guide:** See `MIGRATION_GUIDE.md`
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs

---

## 💡 Pro Tips

1. **Use Google OAuth** - Easier for users, no password management
2. **Regular Backups** - Export database regularly
3. **Monitor Logs** - Check Supabase logs for issues
4. **Test in Dev First** - Always test changes in development
5. **Document Changes** - Keep notes on customizations

---

## ✅ Setup Complete!

You now have a production-ready CRM with:
- ✅ Secure authentication
- ✅ Role-based access control
- ✅ Admin and worker dashboards
- ✅ Google OAuth support
- ✅ Database-driven security

Start adding customers and managing your business! 🚀

---

## 🆘 Need Help?

- Check troubleshooting section above
- Review `AUTHENTICATION_ARCHITECTURE.md`
- Check Supabase logs for errors
- Verify environment variables are correct
- Ensure database schema ran successfully
