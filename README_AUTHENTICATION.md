# 🔐 WebRockets CRM - Authentication Guide

## 🎉 Great News!

Your CRM application **already has full authentication working** with Supabase! Login data is automatically saved to your Supabase database.

---

## ✅ What's Already Working

### 1. Email/Password Authentication ✅
- Users can sign up with email and password
- Passwords are securely hashed by Supabase
- Login sessions are managed automatically
- **Works right now** - no additional setup needed!

### 2. User Data Automatically Saved ✅
All login data is saved to Supabase:
- User credentials in `auth.users` table
- Profile information in `profiles` table
- Company assignments
- User roles (admin/worker)
- Last login timestamps
- Authentication provider info

### 3. Google OAuth Button Ready ✅
- "Continue with Google" button is visible
- OAuth code is already implemented
- Automatic profile creation on first login
- **Needs:** Google Cloud Console setup (10 minutes)

### 4. Multi-Tenant Security ✅
- Company isolation enforced
- Row Level Security (RLS) policies active
- Users only see their company's data
- Role-based access control

---

## 📚 Documentation Overview

We've created comprehensive guides for you:

### 1. **AUTHENTICATION_SETUP_COMPLETE.md** 📖
**Complete overview** of your authentication system
- What's configured
- Where data is stored
- SQL queries for monitoring
- Troubleshooting guide
- [Read it here](./AUTHENTICATION_SETUP_COMPLETE.md)

### 2. **VIEW_LOGIN_DATA.md** 👀
**Quick guide** to view your login data in Supabase
- Direct links to Supabase dashboard
- SQL queries to run
- Real-time monitoring tips
- [Read it here](./VIEW_LOGIN_DATA.md)

### 3. **GOOGLE_OAUTH_SETUP_GUIDE.md** 🌐
**Step-by-step guide** to enable Google OAuth (optional)
- Google Cloud Console setup
- Supabase configuration
- Testing instructions
- Troubleshooting
- [Read it here](./GOOGLE_OAUTH_SETUP_GUIDE.md)

---

## 🚀 Quick Start

### Test Email/Password Login (Works Now!)

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Visit the login page:**
   ```
   http://localhost:3004/login
   ```

3. **Create an account:**
   - Enter email: `admin@example.com`
   - Enter password: `password123`
   - Click "Sign In"
   - First user becomes admin automatically!

4. **View your data in Supabase:**
   - Open: https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/users
   - You'll see your account there! ✅

### Enable Google OAuth (Optional, 10 min)

Follow the **GOOGLE_OAUTH_SETUP_GUIDE.md** to:
1. Create OAuth credentials in Google Cloud Console
2. Configure in Supabase
3. Test "Continue with Google" button

---

## 📊 Where Your Login Data Lives

### Supabase Dashboard Views:

| What You Want to See          | Where to Find It                                                          |
|-------------------------------|---------------------------------------------------------------------------|
| **All Users**                 | Authentication → Users                                                    |
| **User Profiles**             | Table Editor → profiles                                                   |
| **Companies**                 | Table Editor → companies                                                  |
| **Activity Logs**             | Table Editor → activity_logs                                              |
| **Run SQL Queries**           | SQL Editor                                                                |

### Quick Links:

- **View all users:** https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/users
- **View profiles:** https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/editor
- **Run SQL:** https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/sql/new

---

## 🔍 View Your Login Data

### Method 1: Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/users
2. See all users who have logged in
3. See their emails, last login times, and providers

### Method 2: SQL Query

In SQL Editor, run:

```sql
SELECT 
  email,
  last_sign_in_at,
  created_at,
  raw_user_meta_data->>'provider' as provider
FROM auth.users
ORDER BY last_sign_in_at DESC;
```

### Method 3: Live Test

1. Open Supabase users page in one tab
2. Login to your app in another tab
3. Refresh Supabase tab
4. See your login appear instantly!

---

## 🎯 What Data is Tracked

### On Every Login:

✅ **User credentials** in `auth.users`:
- Unique user ID (UUID)
- Email address
- Encrypted password (secure)
- Last sign-in timestamp
- Created at timestamp
- Authentication provider (email or google)

✅ **Profile information** in `profiles`:
- User ID (linked to auth.users)
- Company ID
- Full name
- Email
- Avatar URL
- Role (admin/worker)

✅ **Session data** in `auth.sessions`:
- Access token
- Refresh token
- Session expiry

---

## 🌐 Google OAuth Status

### Current Status:
- ✅ Code implemented and ready
- ✅ "Continue with Google" button visible
- ⚙️ Needs Google Cloud Console configuration
- ⚙️ Needs Supabase provider setup

### To Enable Google OAuth:
See **GOOGLE_OAUTH_SETUP_GUIDE.md** for complete instructions.

**Time required:** 10-15 minutes

**What you get:**
- Users can login with Google accounts
- Automatic profile creation
- Google profile picture imported
- Same data tracking as email/password

---

## 🧪 Testing Checklist

Use this to verify everything works:

### ✅ Email/Password Login
- [ ] Start app: `npm run dev`
- [ ] Visit: http://localhost:3004/login
- [ ] Enter email and password
- [ ] Click "Sign In"
- [ ] Redirected to dashboard
- [ ] Check Supabase: User appears in auth.users
- [ ] Check Supabase: Profile created in profiles table

### ✅ Data Storage
- [ ] Login timestamp recorded
- [ ] User email saved correctly
- [ ] Profile has role assigned
- [ ] Company ID is set
- [ ] Can query data via SQL

### ⚙️ Google OAuth (If Configured)
- [ ] "Continue with Google" button works
- [ ] Google login popup appears
- [ ] After login, redirected to dashboard
- [ ] User appears with provider='google'
- [ ] Profile auto-created

---

## 📞 Common Questions

### Q: Is my login data being saved?
**A:** Yes! Every login is saved to `auth.users` table in Supabase.

### Q: Can I see who logged in?
**A:** Yes! Go to Supabase → Authentication → Users

### Q: Do I need to set up Google OAuth?
**A:** No, it's optional. Email/password works perfectly without it.

### Q: Where are passwords stored?
**A:** In Supabase `auth.users` table, encrypted with bcrypt. Never stored as plain text.

### Q: How do I see login data in real-time?
**A:** Open Supabase users page and refresh after each login.

### Q: Can I export user data?
**A:** Yes, in Supabase Table Editor → Download as CSV

---

## 🔒 Security Features

Your authentication includes:

✅ **Password Security**
- Bcrypt hashing (Supabase built-in)
- Minimum password requirements
- Secure session management

✅ **Row Level Security (RLS)**
- Users can only access their company's data
- Admins have elevated permissions
- Workers have restricted access

✅ **Session Management**
- Automatic token refresh
- Secure cookie handling
- Session expiry

✅ **OAuth Security**
- OAuth 2.0 standard
- Google-verified tokens
- No password storage for OAuth users

---

## 🐛 Troubleshooting

### Issue: Can't see login data in Supabase

**Check:**
1. Correct Supabase URL in `.env.local`
2. Correct Supabase anon key in `.env.local`
3. Internet connection working
4. Database schema was run (supabase-schema.sql)

### Issue: Profile not created after signup

**Solution:**
1. Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
2. If missing, run `supabase-schema.sql` again

### Issue: "No company assigned" error

**Solution:**
```sql
-- Create a company
INSERT INTO companies (company_name) VALUES ('My Company')
RETURNING id;

-- Update profile
UPDATE profiles 
SET company_id = 'COMPANY_ID_FROM_ABOVE'
WHERE email = 'your-email@example.com';
```

### Issue: Google OAuth not working

**Solution:**
- Follow **GOOGLE_OAUTH_SETUP_GUIDE.md**
- Verify redirect URIs in Google Cloud Console
- Check Client ID/Secret in Supabase

---

## 📈 Next Steps

### Immediate (Works Now):
1. ✅ Test email/password login
2. ✅ View data in Supabase dashboard
3. ✅ Create admin and worker accounts

### Optional (10 minutes):
1. ⚙️ Set up Google OAuth
2. ⚙️ Configure Google Cloud Console
3. ⚙️ Enable in Supabase

### Advanced:
1. 📊 Set up activity logging
2. 📊 Create custom SQL reports
3. 📊 Export user data regularly

---

## 📖 Documentation Index

| Guide                              | Purpose                                    | Read Time |
|------------------------------------|--------------------------------------------|-----------|
| README_AUTHENTICATION.md (this)    | Overview and quick start                   | 5 min     |
| AUTHENTICATION_SETUP_COMPLETE.md   | Complete authentication documentation      | 15 min    |
| VIEW_LOGIN_DATA.md                 | How to view login data in Supabase         | 5 min     |
| GOOGLE_OAUTH_SETUP_GUIDE.md        | Step-by-step Google OAuth setup            | 10 min    |

---

## 🎉 Summary

### What You Have:
✅ Full authentication with Supabase
✅ Email/password login working
✅ User data automatically saved
✅ Profile management
✅ Company isolation
✅ Role-based access
✅ Google OAuth ready (needs setup)

### What to Do Now:
1. Start your app: `npm run dev`
2. Test login: http://localhost:3004/login
3. View data: https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/users
4. (Optional) Set up Google OAuth

### Need Help?
- Check the troubleshooting sections in each guide
- Run the SQL queries to verify data
- Review the documentation above

---

## 🚀 Ready to Go!

Your authentication is **fully configured** and **working now**. Just login and check Supabase to see your data!

**Start here:**
```bash
npm run dev
```

**Then visit:**
```
http://localhost:3004/login
```

🎉 **Enjoy your CRM!**
