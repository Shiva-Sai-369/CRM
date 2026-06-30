# 🎯 Complete Setup Checklist - Ready to Test!

## ✅ What I've Already Done For You

- ✅ **Login page** - Added Admin/Worker role selector buttons
- ✅ **Build verified** - App builds successfully with no errors
- ✅ **Supabase URL fixed** in `.env.local`
- ✅ **OAuth callback handler** - Ready to process Google login
- ✅ **Database schema** - Ready to run (in `supabase-schema.sql`)

---

## 🎬 What You Need to Do Now

### PHASE 1: Supabase Setup (5 minutes)

#### Step 1: Get Your Anon Key
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project: `grlwnzlxvolzwdyejaji`
3. Click **Settings** (gear icon) → **API**
4. Copy the **"Anon public"** key (long string starting with `eyJ`)
5. Open `.env.local` and replace:
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste-your-anon-key-here
```

#### Step 2: Run Database Schema
1. In Supabase Dashboard, click **SQL Editor**
2. Click **"New Query"**
3. Open `supabase-schema.sql` from your project root
4. Copy ALL the SQL code
5. Paste into the Supabase editor
6. Click **"Run"** (Ctrl+Enter)
7. Wait for success ✅

**What this does:**
- Creates 5 tables: companies, profiles, customers, activity_logs, tasks
- Adds 14 security policies (Row Level Security)
- Sets up indexes and foreign keys

#### Step 3: Verify Tables Created
1. In Supabase, click **Table Editor**
2. You should see:
   - ✅ `companies`
   - ✅ `profiles`
   - ✅ `customers`
   - ✅ `activity_logs`
   - ✅ `tasks`

---

### PHASE 2: Google OAuth Setup (10 minutes)

#### Step 1: Create Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. If prompted, setup OAuth consent screen:
   - User Type: **External**
   - App name: Your CRM name
   - Support email: Your email
   - Developer contact: Your email
   - **"Save and Continue"** (skip scopes) → **"Save and Continue"**
5. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
6. Application type: **Web application**
7. Name: `CRM OAuth`
8. **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   ```
9. **Authorized redirect URIs:**
   ```
   https://grlwnzlxvolzwdyejaji.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   ```
10. Click **"Create"**
11. Copy the **Client ID** and **Client Secret**

#### Step 2: Add Google OAuth to Supabase
1. Go to Supabase Dashboard
2. Click **Authentication** → **Providers**
3. Find **Google** and click to expand
4. Toggle **"Enable Sign in with Google"** → **ON**
5. Paste your:
   - **Client ID** (from Google step 11)
   - **Client Secret** (from Google step 11)
6. Click **"Save"**

---

### PHASE 3: Test It! (5 minutes)

#### Test 1: Email/Password Login

```bash
npm run dev
```

Then:
1. Go to `http://localhost:3000`
2. Click **"Worker"** button (should highlight blue)
3. Try any email/password
4. Should see error: "Invalid login credentials" ✅

This proves the app is running and connected to Supabase!

#### Test 2: Create Test Account

In Supabase:
1. Go to **Authentication** → **Users**
2. Click **"Add user"**
3. Enter:
   - Email: `test@example.com`
   - Password: `Test123!@#`
   - Auto confirm: Yes
4. Click **"Create user"**

#### Test 3: Assign to Company & Role

In Supabase SQL Editor, run:

```sql
-- First get a company ID (or create one)
INSERT INTO companies (company_name) VALUES ('Test Company') RETURNING id;
-- Copy the returned ID

-- Then create/update the profile (replace values)
INSERT INTO profiles (id, email, role, company_id, full_name)
SELECT id, email, 'worker', 'YOUR_COMPANY_ID', 'Test User'
FROM auth.users 
WHERE email = 'test@example.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'worker', company_id = 'YOUR_COMPANY_ID';
```

#### Test 4: Email/Password Login Works

1. Go to `http://localhost:3000`
2. Select **"Worker"** button
3. Enter: `test@example.com` / `Test123!@#`
4. Should redirect to `/worker/dashboard` ✅

#### Test 5: Google OAuth Works

1. Go to `http://localhost:3000`
2. Click **"Continue with Google"** button
3. Should redirect to Google login
4. After authenticating, should redirect back to your dashboard ✅

---

## 🔍 Troubleshooting Google OAuth Errors

### Error: "redirect_uri_mismatch"

**Check:**
1. Go to Google Console → Credentials → Your OAuth Client
2. Verify **Authorized redirect URIs** includes:
   ```
   https://grlwnzlxvolzwdyejaji.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   ```
3. If missing, add them and click Save

### Error: "invalid_client" or blank

**Check:**
1. Verify Client ID and Secret in Supabase are correct
2. Go to Supabase → Authentication → Providers → Google
3. Paste your correct Client ID and Secret
4. Click Save

### Error: "Failed to fetch"

**Check:**
1. Your `.env.local` has correct values:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://grlwnzlxvolzwdyejaji.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (not placeholder)
   ```
2. Run `npm run dev` and check browser console for errors (F12)

---

## ✨ New Features on Login Page

### Admin/Worker Role Selection

The login page now has two buttons at the top:

```
┌─────────────────────────────┐
│  [Admin]   [Worker]         │  ← Select your role
│                             │
│  Email: [____________]      │
│  Password: [__________]     │
│  [Sign In]                  │
│                             │
│  Continue with Google       │
│  [Google OAuth Button]      │
└─────────────────────────────┘
```

**How it works:**
1. Click "Admin" or "Worker" button
2. Enter your credentials
3. App validates your account has that role
4. If correct role → Logged in ✅
5. If wrong role → Error message shown

---

## 📋 Pre-Launch Checklist

Before you test, verify:

- [ ] ✅ `.env.local` has actual Anon Key (not "placeholder")
- [ ] ✅ Supabase database schema loaded (`supabase-schema.sql` executed)
- [ ] ✅ Tables created: companies, profiles, customers, activity_logs, tasks
- [ ] ✅ Google OAuth Client ID and Secret created
- [ ] ✅ Google OAuth redirect URIs added to Google Console
- [ ] ✅ Google OAuth enabled in Supabase (Authentication → Providers → Google)
- [ ] ✅ Test account created in Supabase
- [ ] ✅ Test account assigned to company with role (SQL executed)
- [ ] ✅ Build succeeds: `npm run build`

---

## 🚀 Full Test Flow

```
1. npm run dev
   ↓
2. Go to http://localhost:3000/login
   ↓
3. Click "Worker" button
   ↓
4. Enter: test@example.com / Test123!@#
   ↓
5. Should see Worker Dashboard ✅
   ↓
6. Go back to /login
   ↓
7. Click "Continue with Google"
   ↓
8. Google login screen appears
   ↓
9. Authenticate with Google
   ↓
10. Should redirect to Dashboard ✅
```

If any step fails:
- Check browser console (F12) for error
- Check Supabase logs for backend errors
- Refer to troubleshooting section above

---

## 💡 Key Points

1. **Your Supabase Project ID:** `grlwnzlxvolzwdyejaji`
2. **Your Supabase URL:** `https://grlwnzlxvolzwdyejaji.supabase.co`
3. **Anon Key location:** Supabase → Settings → API → Anon public
4. **Google OAuth location:** Supabase → Authentication → Providers → Google
5. **Test locally first** before deploying

---

## 📚 Full Documentation Files

- `RECENT_UPDATES.md` - What changed in your code
- `GOOGLE_OAUTH_TROUBLESHOOTING.md` - OAuth debugging guide
- `SUPABASE_SETUP.md` - Ultra-detailed setup guide
- `QUICKSTART.md` - Quick start reference
- `IMPLEMENTATION_SUMMARY.md` - Complete feature list

---

## ✅ You're Ready!

Everything is set up. Just need to:
1. Add your Anon Key to `.env.local`
2. Run the database schema
3. Create a test account
4. Run `npm run dev` and test!

Let me know what error you see when testing, and I'll help you fix it! 🎉

---

**Version:** 2026-06-29  
**Status:** ✅ Ready to Test  
**Next:** Run `npm run dev` and test!
