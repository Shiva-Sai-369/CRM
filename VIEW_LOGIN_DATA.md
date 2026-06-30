# 👀 Quick Guide: View Login Data in Supabase

## 🎯 Where to See Your Login Data

### Method 1: Supabase Dashboard (Easiest)

**Link:** https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/users

**Steps:**
1. Open the link above
2. Login to Supabase
3. You'll see all users who have logged in

**What You'll See:**
```
┌─────────────────────────┬──────────┬──────────────────────┐
│ Email                   │ Provider │ Last Sign In         │
├─────────────────────────┼──────────┼──────────────────────┤
│ admin@example.com       │ email    │ 2 minutes ago        │
│ john@gmail.com          │ google   │ 5 minutes ago        │
│ worker@company.com      │ email    │ 1 hour ago           │
└─────────────────────────┴──────────┴──────────────────────┘
```

### Method 2: View Profile Data

**Link:** https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/editor

**Steps:**
1. Click `Table Editor` in sidebar
2. Select `profiles` table
3. See all user profiles with roles and companies

**What You'll See:**
```
┌──────────────────┬─────────────┬────────┬──────────────────────┐
│ Email            │ Full Name   │ Role   │ Company              │
├──────────────────┼─────────────┼────────┼──────────────────────┤
│ admin@example.com│ Admin User  │ admin  │ My Company           │
│ john@gmail.com   │ John Doe    │ worker │ My Company           │
└──────────────────┴─────────────┴────────┴──────────────────────┘
```

---

## 📊 SQL Queries to View Login Data

### Query 1: See All Users and Their Last Login

```sql
SELECT 
  email,
  last_sign_in_at,
  created_at,
  raw_user_meta_data->>'provider' as provider
FROM auth.users
ORDER BY last_sign_in_at DESC;
```

**Copy this:**
1. Go to: https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/sql/new
2. Paste the query above
3. Click "Run"
4. See all login data!

### Query 2: See User Profiles with Company Info

```sql
SELECT 
  p.email,
  p.full_name,
  p.role,
  c.company_name,
  p.created_at
FROM profiles p
LEFT JOIN companies c ON p.company_id = c.id
ORDER BY p.created_at DESC;
```

### Query 3: See Google OAuth Users Only

```sql
SELECT 
  email,
  created_at,
  last_sign_in_at,
  'Google' as provider
FROM auth.users
WHERE raw_user_meta_data->>'provider' = 'google'
ORDER BY created_at DESC;
```

### Query 4: Count Total Users by Provider

```sql
SELECT 
  COALESCE(raw_user_meta_data->>'provider', 'email') as provider,
  COUNT(*) as total_users
FROM auth.users
GROUP BY provider;
```

**Result:**
```
Provider | Total Users
---------|------------
email    | 5
google   | 2
```

---

## 🧪 Test Right Now

### Step-by-Step Test

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Open two browser tabs:**
   - Tab 1: http://localhost:3004/login
   - Tab 2: https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/users

3. **Login in Tab 1:**
   - Enter email: test@example.com
   - Enter password: password123
   - Click "Sign In"

4. **Refresh Tab 2:**
   - Press F5 or refresh button
   - You'll see `test@example.com` appear!

5. **Check the data:**
   - Email: test@example.com
   - Provider: email
   - Last Sign In: Just now
   - Created: Just now

---

## 🔍 What Data is Stored

### In `auth.users` Table (Automatic)

| Field              | Description                          | Example                    |
|--------------------|--------------------------------------|----------------------------|
| id                 | Unique user ID (UUID)                | 123e4567-e89b-12d3-a456... |
| email              | User's email address                 | john@example.com           |
| encrypted_password | Hashed password (secure)             | $2a$10$hash...              |
| email_confirmed_at | When email was confirmed             | 2024-06-30 10:30:00        |
| last_sign_in_at    | Last login timestamp                 | 2024-06-30 15:45:00        |
| created_at         | Account creation timestamp           | 2024-06-30 10:30:00        |
| updated_at         | Last update timestamp                | 2024-06-30 15:45:00        |
| raw_user_meta_data | Additional data (provider, name)     | {"provider": "google"}     |

### In `profiles` Table (Your Custom Table)

| Field       | Description                    | Example                    |
|-------------|--------------------------------|----------------------------|
| id          | User ID (links to auth.users)  | 123e4567-e89b-12d3-a456... |
| company_id  | Company this user belongs to   | 987e6543-e21b-34f2-b789... |
| full_name   | User's full name               | John Doe                   |
| email       | User's email (duplicate)       | john@example.com           |
| avatar_url  | Profile picture URL            | https://...                |
| role        | User role (admin/worker)       | admin                      |
| created_at  | Profile creation timestamp     | 2024-06-30 10:30:00        |

---

## 🌐 Google OAuth Data

When a user logs in with Google, you'll see:

### In `auth.users` Table:

- `raw_user_meta_data->>'provider'` = "google"
- `raw_user_meta_data->>'avatar_url'` = Google profile pic
- `raw_user_meta_data->>'full_name'` = Name from Google

### Example:

```json
{
  "email": "john@gmail.com",
  "provider": "google",
  "avatar_url": "https://lh3.googleusercontent.com/...",
  "full_name": "John Doe",
  "email_verified": true
}
```

---

## 📈 Real-Time Monitoring

### Watch Logins in Real-Time

1. Open Supabase users page:
   https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/users

2. Keep it open in a browser tab

3. Every time someone logs in, refresh the page

4. You'll see:
   - New users appear
   - Last sign-in timestamps update
   - Provider information (email or google)

### Auto-Refresh SQL Query

Use this query and run it periodically:

```sql
SELECT 
  email,
  last_sign_in_at,
  EXTRACT(EPOCH FROM (NOW() - last_sign_in_at)) / 60 as minutes_since_login,
  raw_user_meta_data->>'provider' as provider
FROM auth.users
WHERE last_sign_in_at > NOW() - INTERVAL '1 hour'
ORDER BY last_sign_in_at DESC;
```

This shows all logins in the last hour with "minutes since login".

---

## 🎯 Quick Links

| What You Want to See           | Link                                                                                      |
|--------------------------------|-------------------------------------------------------------------------------------------|
| All Users                      | https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/users                   |
| User Profiles (Table)          | https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/editor (select `profiles`)   |
| Run SQL Queries                | https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/sql/new                      |
| Activity Logs                  | https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/editor (select `activity_logs`) |
| Authentication Settings        | https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/providers               |

---

## 💡 Pro Tips

### Tip 1: Export User Data

In Supabase dashboard:
1. Go to Table Editor → auth.users
2. Click the "..." menu
3. Select "Download as CSV"
4. You have a backup of all users!

### Tip 2: Search for Specific User

In SQL Editor:

```sql
SELECT * FROM auth.users 
WHERE email ILIKE '%john%';
```

### Tip 3: See Who's Online

Check recent logins (last 15 minutes):

```sql
SELECT email, last_sign_in_at
FROM auth.users
WHERE last_sign_in_at > NOW() - INTERVAL '15 minutes'
ORDER BY last_sign_in_at DESC;
```

### Tip 4: Get Login Statistics

```sql
SELECT 
  DATE(last_sign_in_at) as date,
  COUNT(*) as logins
FROM auth.users
WHERE last_sign_in_at IS NOT NULL
GROUP BY DATE(last_sign_in_at)
ORDER BY date DESC
LIMIT 7;
```

Shows daily login counts for the last week.

---

## ✅ Verification Checklist

After logging in, verify this data exists:

### In `auth.users`:
- [ ] Email address is recorded
- [ ] `created_at` timestamp is set
- [ ] `last_sign_in_at` is updated
- [ ] Provider is correct (email or google)

### In `profiles`:
- [ ] User ID matches auth.users id
- [ ] Email is the same
- [ ] Role is assigned (admin or worker)
- [ ] Company ID is set

### In `companies`:
- [ ] Company exists
- [ ] Company name is set

---

## 🚀 Start Testing Now!

1. **Run your app:**
   ```bash
   npm run dev
   ```

2. **Open Supabase dashboard:**
   https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/users

3. **Login to your app:**
   http://localhost:3004/login

4. **Refresh Supabase tab:**
   See your login data appear! ✅

---

## 📞 Common Questions

### Q: Can I see passwords?
**A:** No, passwords are encrypted. You'll only see hashed values for security.

### Q: How long is login data stored?
**A:** Forever, unless you manually delete users.

### Q: Can I delete a user?
**A:** Yes, in Supabase dashboard → Authentication → Users → Click user → Delete

### Q: What if I don't see my login?
**A:** Make sure:
- Your app is connected to the internet
- Environment variables are correct (.env.local)
- You successfully completed the login (no errors)

---

## 🎉 Summary

**Your login data is already being saved!** 

Just:
1. Login to your app
2. Open Supabase dashboard
3. See your data in Authentication → Users

**That's it!** 🚀
