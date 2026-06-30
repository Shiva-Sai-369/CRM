# Google OAuth Troubleshooting Guide

## ✅ What I've Done

1. ✅ **Updated login page** with Admin/Worker role selection buttons
2. ✅ **Fixed `.env.local`** - corrected Supabase URL format
3. ✅ **Verified app builds** successfully

## 🔴 Common Google OAuth Errors

### Error 1: "redirect_uri_mismatch"
**Cause:** The redirect URI in your code doesn't match what's registered in Google Cloud Console

**Solution:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Click your OAuth 2.0 Client ID
5. Verify these **Authorized redirect URIs** are present:
   - `https://grlwnzlxvolzwdyejaji.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback`

---

### Error 2: "invalid_client" or "Client ID mismatch"
**Cause:** Wrong Client ID or Client Secret in Supabase

**Solution:**
1. Get the correct values from Google:
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Find your OAuth 2.0 Client ID
   - Copy the **Client ID** and **Client Secret**
2. Update Supabase:
   - Go to Supabase → **Authentication** → **Providers**
   - Find **Google** and expand it
   - Toggle **"Enable Sign in with Google"** ON
   - Paste the correct **Client ID** and **Client Secret**
   - Click **"Save"**

---

### Error 3: "Failed to fetch" or blank screen
**Cause:** Supabase URL or Anon Key is wrong

**Solution:**
Check your `.env.local` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://grlwnzlxvolzwdyejaji.supabase.co
```

Should be:
- `https://xxxxx.supabase.co` (NOT the dashboard URL)
- Extracted from: Supabase → Settings → API → Project URL

---

## 🔧 Step-by-Step Setup

### Step 1: Verify Your Supabase Project ID
Your project ID is: `grlwnzlxvolzwdyejaji`

Your Supabase URL should be:
```
https://grlwnzlxvolzwdyejaji.supabase.co
```

✅ This is already set in `.env.local`

---

### Step 2: Get Your Anon Key
1. Go to Supabase Dashboard
2. Click **Settings** → **API**
3. Copy the **Anon/Public Key** (starts with `eyJ`)
4. Update `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

❌ **DO NOT use the Service Role key** - only Anon Key works on frontend

---

### Step 3: Create Google OAuth Credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create/select a project
3. Go to **APIs & Services** → **Credentials**
4. Click **"Create Credentials"** → **OAuth 2.0 Client ID**
5. If prompted, configure OAuth consent screen:
   - User Type: **External**
   - App name: `CRM`
   - User support email: your email
   - Developer contact: your email
   - Click **"Save and Continue"** (2x)
6. Create OAuth Client:
   - Type: **Web application**
   - Name: `CRM OAuth`
   - Add **Authorized redirect URIs**:
     ```
     https://grlwnzlxvolzwdyejaji.supabase.co/auth/v1/callback
     http://localhost:3000/auth/callback
     ```
   - Click **"Create"**
7. Copy the **Client ID** and **Client Secret**

---

### Step 4: Add to Supabase

1. Go to Supabase Dashboard
2. Click **Authentication** → **Providers**
3. Expand **Google**
4. Toggle **"Enable Sign in with Google"** → ON
5. Paste:
   - **Client ID**
   - **Client Secret**
6. Click **"Save"**

---

### Step 5: Test Locally

```bash
npm run dev
```

Then:
1. Go to `http://localhost:3000`
2. Click the **"Continue with Google"** button
3. You should be redirected to Google login
4. After authenticating, you should be redirected back to your app

---

## 🧪 Debugging Steps

If you still get an error, follow these debugging steps:

### Debug 1: Check Browser Console
1. Open your app in browser
2. Press `F12` to open Developer Tools
3. Click **Console** tab
4. Look for error messages
5. Share the error with context

### Debug 2: Check Supabase Logs
1. Go to Supabase Dashboard
2. Click **Logs** (left sidebar)
3. Look for errors with timestamp matching your login attempt
4. Share relevant error messages

### Debug 3: Verify Configuration
Open browser console and run:
```javascript
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
```

Both should show values (not `undefined`)

---

## ✨ What Changed in Your App

### New Feature: Role Selection on Login Page

The login page now shows two buttons:
- **Admin** button - for admin login
- **Worker** button - for worker login

When you click one, it validates that your account has that role before logging in.

### Updated `.env.local`

The Supabase URL was corrected from:
```bash
# ❌ WRONG
NEXT_PUBLIC_SUPABASE_URL=https://supabase.com/dashboard/project/...

# ✅ CORRECT
NEXT_PUBLIC_SUPABASE_URL=https://grlwnzlxvolzwdyejaji.supabase.co
```

---

## 📋 Pre-Deployment Checklist

Before going to production, ensure:

- [ ] ✅ Supabase project created
- [ ] ✅ Database schema loaded (`supabase-schema.sql`)
- [ ] ✅ `.env.local` has correct Supabase URL and Anon Key
- [ ] ✅ Google OAuth credentials created
- [ ] ✅ Google OAuth enabled in Supabase
- [ ] ✅ Redirect URIs added to Google Console
- [ ] ✅ Email/password login works
- [ ] ✅ Google OAuth login works
- [ ] ✅ Admin can login to `/admin/dashboard`
- [ ] ✅ Worker can login to `/worker/dashboard`

---

## 🚀 Next Steps

1. **Test email/password login** first (easier to debug)
2. **Then test Google OAuth**
3. **If OAuth still fails:**
   - Share the exact error message you see
   - Check Supabase logs for details
   - Verify Google Console has correct redirect URIs

---

## 💡 Tips

- **Localhost testing:** Both email/password and Google OAuth should work locally
- **Production:** Update `NEXT_PUBLIC_SITE_URL` to your domain, and add production redirect URIs
- **Anon Key only:** Never put Service Role Key in `.env` files
- **Role validation:** The app now validates users have the role they're trying to login as

---

## 📞 Need Help?

If you get stuck:
1. Check the exact error message in browser console (F12)
2. Check Supabase logs for backend errors
3. Verify all URLs match exactly (case-sensitive)
4. Confirm all credentials are correct

Good luck! 🎉
