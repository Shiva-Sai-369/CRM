# 📊 SQL Queries Cheatsheet - Monitor Your CRM Logins

Copy and paste these queries into Supabase SQL Editor to monitor your authentication data.

**SQL Editor Link:** https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/sql/new

---

## 👥 USER QUERIES

### See All Users
```sql
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at,
  raw_user_meta_data->>'provider' as provider
FROM auth.users
ORDER BY created_at DESC;
```

### See Users Who Logged In Today
```sql
SELECT 
  email,
  last_sign_in_at,
  raw_user_meta_data->>'provider' as provider
FROM auth.users
WHERE DATE(last_sign_in_at) = CURRENT_DATE
ORDER BY last_sign_in_at DESC;
```

### See Most Recent Logins (Last 24 Hours)
```sql
SELECT 
  email,
  last_sign_in_at,
  EXTRACT(EPOCH FROM (NOW() - last_sign_in_at)) / 60 as minutes_ago
FROM auth.users
WHERE last_sign_in_at > NOW() - INTERVAL '24 hours'
ORDER BY last_sign_in_at DESC;
```

### Count Total Users
```sql
SELECT COUNT(*) as total_users FROM auth.users;
```

### Search for Specific User by Email
```sql
SELECT * FROM auth.users 
WHERE email ILIKE '%john%';  -- Replace 'john' with search term
```

---

## 🌐 GOOGLE OAUTH QUERIES

### See All Google OAuth Users
```sql
SELECT 
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE raw_user_meta_data->>'provider' = 'google'
ORDER BY created_at DESC;
```

### Count Users by Provider
```sql
SELECT 
  COALESCE(raw_user_meta_data->>'provider', 'email') as provider,
  COUNT(*) as user_count
FROM auth.users
GROUP BY provider
ORDER BY user_count DESC;
```

### See Email vs Google Split
```sql
SELECT 
  CASE 
    WHEN raw_user_meta_data->>'provider' = 'google' THEN 'Google'
    ELSE 'Email/Password'
  END as login_method,
  COUNT(*) as total
FROM auth.users
GROUP BY login_method;
```

---

## 👤 PROFILE QUERIES

### See All Profiles with Company Info
```sql
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  c.company_name,
  p.created_at
FROM profiles p
LEFT JOIN companies c ON p.company_id = c.id
ORDER BY p.created_at DESC;
```

### Count Users by Role
```sql
SELECT 
  role,
  COUNT(*) as total
FROM profiles
GROUP BY role;
```

### See Admin Users Only
```sql
SELECT 
  email,
  full_name,
  company_id,
  created_at
FROM profiles
WHERE role = 'admin'
ORDER BY created_at DESC;
```

### See Worker Users Only
```sql
SELECT 
  email,
  full_name,
  company_id,
  created_at
FROM profiles
WHERE role = 'worker'
ORDER BY created_at DESC;
```

### Find Users Without Company
```sql
SELECT 
  email,
  full_name,
  role,
  created_at
FROM profiles
WHERE company_id IS NULL;
```

---

## 🏢 COMPANY QUERIES

### See All Companies with User Counts
```sql
SELECT 
  c.id,
  c.company_name,
  c.created_at,
  COUNT(p.id) as total_users,
  COUNT(CASE WHEN p.role = 'admin' THEN 1 END) as admin_count,
  COUNT(CASE WHEN p.role = 'worker' THEN 1 END) as worker_count
FROM companies c
LEFT JOIN profiles p ON c.id = p.company_id
GROUP BY c.id, c.company_name, c.created_at
ORDER BY c.created_at DESC;
```

### See Users in Specific Company
```sql
SELECT 
  p.email,
  p.full_name,
  p.role,
  u.last_sign_in_at
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.company_id = 'YOUR_COMPANY_ID_HERE'
ORDER BY p.role, p.email;
```

---

## 📈 ACTIVITY QUERIES

### See Recent Activity (All Users)
```sql
SELECT 
  al.created_at,
  p.email,
  p.role,
  al.action,
  al.details
FROM activity_logs al
LEFT JOIN profiles p ON al.worker_id = p.id
ORDER BY al.created_at DESC
LIMIT 50;
```

### See Activity for Specific User
```sql
SELECT 
  created_at,
  action,
  details
FROM activity_logs
WHERE worker_id = (
  SELECT id FROM profiles WHERE email = 'user@example.com'
)
ORDER BY created_at DESC;
```

### Count Actions by Type
```sql
SELECT 
  action,
  COUNT(*) as count
FROM activity_logs
GROUP BY action
ORDER BY count DESC;
```

---

## 📊 STATISTICS QUERIES

### Daily Login Statistics (Last 7 Days)
```sql
SELECT 
  DATE(last_sign_in_at) as login_date,
  COUNT(*) as login_count
FROM auth.users
WHERE last_sign_in_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(last_sign_in_at)
ORDER BY login_date DESC;
```

### User Growth Over Time
```sql
SELECT 
  DATE(created_at) as signup_date,
  COUNT(*) as new_users,
  SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as total_users
FROM auth.users
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;
```

### Active Users (Logged in Last 7 Days)
```sql
SELECT COUNT(*) as active_users
FROM auth.users
WHERE last_sign_in_at > NOW() - INTERVAL '7 days';
```

### Inactive Users (Not Logged in Last 30 Days)
```sql
SELECT 
  email,
  last_sign_in_at,
  EXTRACT(DAY FROM (NOW() - last_sign_in_at)) as days_since_login
FROM auth.users
WHERE last_sign_in_at < NOW() - INTERVAL '30 days'
ORDER BY last_sign_in_at ASC;
```

---

## 🔍 DEBUGGING QUERIES

### Find Users Without Profiles
```sql
SELECT 
  u.id,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;
```

### Find Profiles Without Auth Users (Orphaned)
```sql
SELECT 
  p.id,
  p.email,
  p.created_at
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;
```

### Check Trigger Exists
```sql
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

### Verify RLS is Enabled
```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## 🛠️ ADMIN QUERIES

### Create Admin User Manually
```sql
-- First, create company if needed
INSERT INTO companies (company_name) 
VALUES ('My Company')
RETURNING id;

-- Then update user profile (replace YOUR_COMPANY_ID and YOUR_EMAIL)
UPDATE profiles 
SET company_id = 'YOUR_COMPANY_ID', role = 'admin'
WHERE email = 'YOUR_EMAIL';
```

### Assign Company to User
```sql
UPDATE profiles 
SET company_id = 'YOUR_COMPANY_ID'
WHERE email = 'user@example.com';
```

### Change User Role
```sql
UPDATE profiles 
SET role = 'admin'  -- or 'worker'
WHERE email = 'user@example.com';
```

### Delete User (and all related data)
```sql
-- This will cascade delete profile, activity logs, etc.
DELETE FROM auth.users 
WHERE email = 'user@example.com';
```

---

## 📤 EXPORT QUERIES

### Export All Users as CSV-Friendly Format
```sql
SELECT 
  u.email,
  p.full_name,
  p.role,
  c.company_name,
  u.created_at::date as signup_date,
  u.last_sign_in_at::date as last_login_date,
  COALESCE(u.raw_user_meta_data->>'provider', 'email') as auth_provider
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN companies c ON p.company_id = c.id
ORDER BY u.created_at DESC;
```

### Export Login Activity
```sql
SELECT 
  p.email,
  al.action,
  al.created_at,
  al.details
FROM activity_logs al
LEFT JOIN profiles p ON al.worker_id = p.id
ORDER BY al.created_at DESC;
```

---

## 🎯 QUICK REFERENCE

### Most Useful Queries:

**1. Who's logged in today?**
```sql
SELECT email, last_sign_in_at 
FROM auth.users 
WHERE DATE(last_sign_in_at) = CURRENT_DATE;
```

**2. How many users do I have?**
```sql
SELECT COUNT(*) FROM auth.users;
```

**3. Show me all admins:**
```sql
SELECT email, full_name FROM profiles WHERE role = 'admin';
```

**4. Who logged in recently?**
```sql
SELECT email, last_sign_in_at 
FROM auth.users 
WHERE last_sign_in_at > NOW() - INTERVAL '1 hour'
ORDER BY last_sign_in_at DESC;
```

**5. Find specific user:**
```sql
SELECT * FROM auth.users WHERE email = 'user@example.com';
```

---

## 💡 Pro Tips

### 1. Save Favorite Queries
In Supabase SQL Editor:
- Click "Save" button
- Name your query
- Access it anytime from "Saved Queries"

### 2. Schedule Reports
Run these queries weekly:
- User growth statistics
- Active vs inactive users
- Login patterns

### 3. Export Data
In Supabase:
- Run query
- Click "Download CSV"
- Open in Excel/Google Sheets

### 4. Real-Time Monitoring
Keep these queries open in tabs:
- All users (refresh periodically)
- Recent logins (last 24 hours)
- Activity logs

---

## 🚀 Quick Links

- **Run Queries:** https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/sql/new
- **View Users:** https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/users
- **Table Editor:** https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/editor

---

## 📝 Notes

- Replace `'YOUR_COMPANY_ID'` with actual company UUID
- Replace `'user@example.com'` with actual email
- Dates are in UTC timezone
- Use `ILIKE` for case-insensitive search
- `%` is wildcard in LIKE/ILIKE

---

## ✅ Quick Test

Run this to verify everything is working:

```sql
SELECT 
  'Total Users' as metric, 
  COUNT(*)::text as value 
FROM auth.users
UNION ALL
SELECT 
  'Total Profiles', 
  COUNT(*)::text 
FROM profiles
UNION ALL
SELECT 
  'Total Companies', 
  COUNT(*)::text 
FROM companies
UNION ALL
SELECT 
  'Logins Today', 
  COUNT(*)::text 
FROM auth.users 
WHERE DATE(last_sign_in_at) = CURRENT_DATE;
```

Expected result: All counts should match except possibly "Logins Today".

---

🎉 **Happy Querying!** Save this file for future reference.
