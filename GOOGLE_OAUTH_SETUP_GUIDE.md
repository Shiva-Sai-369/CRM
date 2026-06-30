# 🌐 Google OAuth Setup Guide

## 🎯 Current Status

✅ **Your application is already configured for Google OAuth!**

The "Continue with Google" button is visible on your login page and the code is ready. You just need to configure it in Google Cloud Console and Supabase.

---

## ⚙️ Setup Steps (10 minutes)

### Step 1: Google Cloud Console Setup

#### 1.1 Create/Select Project

1. Go to: https://console.cloud.google.com/
2. Click on project dropdown (top of page)
3. Click "New Project" or select existing project
4. Name it: "WebRockets CRM" (or any name you like)
5. Click "Create"

#### 1.2 Enable Google+ API (Required for OAuth)

1. In the search bar, type: "Google+ API"
2. Click on "Google+ API" in results
3. Click the blue "Enable" button
4. Wait for it to enable (takes a few seconds)

#### 1.3 Create OAuth Credentials

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" (top of page)
3. Select "OAuth 2.0 Client ID"
4. If prompted to configure consent screen:
   - Click "Configure Consent Screen"
   - Select "External" (unless you have Google Workspace)
   - Click "Create"
   - Fill in:
     - App name: "WebRockets CRM"
     - User support email: your email
     - Developer contact: your email
   - Click "Save and Continue"
   - Skip the scopes (click "Save and Continue")
   - Skip test users (click "Save and Continue")
   - Click "Back to Dashboard"

5. Now create the OAuth client:
   - Go back to: https://console.cloud.google.com/apis/credentials
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "WebRockets CRM Web Client"
   
6. Add Authorized JavaScript origins:
   ```
   http://localhost:3004
   https://grlwnzlxvolzwdyejaji.supabase.co
   ```

7. Add Authorized redirect URIs:
   ```
   http://localhost:3004/auth/callback
   https://grlwnzlxvolzwdyejaji.supabase.co/auth/v1/callback
   ```

8. Click "Create"

9. **IMPORTANT:** Copy these values (you'll need them):
   - Client ID (looks like: 123456789-abc123.apps.googleusercontent.com)
   - Client Secret (looks like: GOCSPX-abc123def456)

---

### Step 2: Supabase Configuration

#### 2.1 Enable Google Provider

1. Go to: https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/providers
2. Scroll down to "Google" provider
3. Toggle it ON (switch should turn blue)

#### 2.2 Enter Credentials

1. In the Google provider settings:
   - **Client ID (for OAuth):** Paste your Client ID from Step 1.9
   - **Client Secret (for OAuth):** Paste your Client Secret from Step 1.9

2. Leave other settings as default

3. Click "Save"

#### 2.3 Verify Site URL (Important!)

1. In the same page, scroll to top
2. Find "URL Configuration" section
3. Make sure these URLs are set:

   **Site URL:**
   ```
   http://localhost:3004
   ```

   **Redirect URLs (Additional):**
   ```
   http://localhost:3004/auth/callback
   http://localhost:3004/**
   ```

4. Click "Save" if you made changes

---

### Step 3: Test Google OAuth

#### 3.1 Start Your Application

```bash
npm run dev
```

#### 3.2 Test the Flow

1. Open: http://localhost:3004/login
2. Click "Continue with Google"
3. Select your Google account
4. Grant permissions
5. You should be redirected to your dashboard!

#### 3.3 Verify in Supabase

1. Go to: https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/users
2. You should see your Google email with provider = 'google'
3. Go to: https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/editor
4. Select `profiles` table
5. You should see your profile created automatically

---

## 🎯 What Happens During Google OAuth

### The Flow:

```
1. User clicks "Continue with Google"
   ↓
2. App redirects to Google login
   ↓
3. User authenticates with Google
   ↓
4. Google redirects to: /auth/callback?code=...
   ↓
5. Your callback handler:
   - Exchanges code for session
   - Fetches/creates user profile
   - Checks company assignment
   - Determines user role
   ↓
6. Redirects to appropriate dashboard:
   - Admin → /admin/dashboard
   - Worker → /worker/dashboard
```

### What Gets Created:

1. **User in auth.users:**
   - ID: UUID
   - Email: From Google
   - Provider: google
   - Metadata: Name, avatar from Google

2. **Profile in profiles table:**
   - ID: Same UUID as auth.users
   - Email: Same as auth.users
   - Full name: From Google
   - Avatar: From Google profile pic
   - Role: admin (if first user) or worker
   - Company ID: Auto-assigned

---

## 🔍 Troubleshooting

### Issue 1: "redirect_uri_mismatch" Error

**Cause:** Redirect URI not added to Google Cloud Console

**Solution:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", make sure you have:
   ```
   http://localhost:3004/auth/callback
   https://grlwnzlxvolzwdyejaji.supabase.co/auth/v1/callback
   ```
4. Click "Save"
5. Wait 5 minutes for changes to propagate
6. Try again

### Issue 2: "Access Blocked: This app's request is invalid"

**Cause:** Consent screen not configured properly

**Solution:**
1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Make sure:
   - App name is filled in
   - User support email is set
   - Developer contact is set
3. Save changes
4. Try again

### Issue 3: User Created But No Profile

**Cause:** Database trigger might not have completed

**Solution:**
Your app already has retry logic (waits up to 1.5 seconds). If still failing:

1. Check database schema was run:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. If trigger doesn't exist, run `supabase-schema.sql` again

3. Delete the user and try again:
   - Go to Supabase → Authentication → Users
   - Delete the user
   - Try Google login again

### Issue 4: "No Company Assigned" Error

**Cause:** Profile created but company_id is NULL

**Solution:**

If you're the first user:
```sql
-- Create a company
INSERT INTO companies (company_name) VALUES ('My Company')
RETURNING id;

-- Update your profile with the company ID
UPDATE profiles 
SET company_id = 'COMPANY_ID_FROM_ABOVE'
WHERE email = 'your-google-email@gmail.com';
```

If you're not the first user:
- Have an admin create a worker account with your Google email
- Then login with Google

### Issue 5: Button Doesn't Work / No Redirect

**Cause:** Check browser console for errors

**Solution:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Click "Continue with Google"
4. Look for errors

Common errors:
- Network error → Check internet connection
- CORS error → Check Supabase URL in .env.local
- Invalid credentials → Verify Client ID/Secret

---

## 📊 Verify Google OAuth is Working

### Checklist:

- [ ] Google Cloud project created
- [ ] Google+ API enabled
- [ ] OAuth 2.0 Client ID created
- [ ] Redirect URIs added (both localhost and Supabase)
- [ ] Client ID and Secret copied
- [ ] Supabase Google provider enabled
- [ ] Client ID and Secret pasted in Supabase
- [ ] Site URL configured in Supabase
- [ ] App is running (npm run dev)
- [ ] "Continue with Google" button visible
- [ ] Clicking button opens Google login popup
- [ ] After login, redirected to dashboard
- [ ] User appears in Supabase with provider='google'

---

## 🎯 Testing Different Scenarios

### Scenario 1: First Google User (Creates Admin)

1. Make sure no users exist in Supabase (or delete all)
2. Visit: http://localhost:3004/login
3. Click "Continue with Google"
4. Login with your Google account
5. Expected:
   - Creates new company "My Company"
   - Creates admin profile
   - Redirects to /admin/dashboard
6. Verify in Supabase:
   - User with provider='google'
   - Profile with role='admin'
   - Company created

### Scenario 2: Second Google User (Different Account)

1. First user (admin) is already logged in
2. Admin creates worker via /admin/workers
3. Enter worker's Gmail address
4. Worker visits: http://localhost:3004/login
5. Worker clicks "Continue with Google"
6. Worker logs in with that Gmail
7. Expected:
   - Uses existing profile
   - Redirects to /worker/dashboard
8. Verify in Supabase:
   - Second user with provider='google'
   - Profile with role='worker'
   - Same company_id as admin

### Scenario 3: Existing Email User Logs In With Google

**Important:** Supabase treats email and Google as separate auth methods!

If someone:
- Signs up with email: john@gmail.com
- Then logs in with Google: john@gmail.com

These create **two different users** in Supabase!

To link them, you need to handle account linking manually.

---

## 🔒 Security Considerations

### What's Secure:

✅ OAuth 2.0 flow (industry standard)
✅ Tokens are encrypted
✅ Client secret is never exposed to browser
✅ Supabase handles all OAuth complexity
✅ HTTPS required for production

### Best Practices:

1. **Never commit Client Secret to git**
   - Store in .env.local (already gitignored)

2. **Use different OAuth credentials for production**
   - Create separate OAuth client for production
   - Use production URL in redirect URIs

3. **Verify email is from Google**
   - Supabase does this automatically
   - Trust the provider='google' metadata

4. **Restrict OAuth to your domain (optional)**
   - In Google Cloud Console
   - OAuth consent screen → Internal
   - Only works if you have Google Workspace

---

## 🌐 Production Setup

When deploying to production:

### 1. Get Production URL

Example: `https://yourcrm.com`

### 2. Update Google Cloud Console

1. Go to your OAuth client
2. Add production redirect URI:
   ```
   https://yourcrm.com/auth/callback
   https://grlwnzlxvolzwdyejaji.supabase.co/auth/v1/callback
   ```
3. Add production origin:
   ```
   https://yourcrm.com
   ```

### 3. Update Supabase

1. Go to Authentication → URL Configuration
2. Update Site URL:
   ```
   https://yourcrm.com
   ```
3. Add to Redirect URLs:
   ```
   https://yourcrm.com/auth/callback
   https://yourcrm.com/**
   ```

### 4. Update Environment Variables

In your production environment:
```env
NEXT_PUBLIC_SITE_URL=https://yourcrm.com
```

---

## 📞 Quick Reference

### Google Cloud Console Links:

| What                    | Link                                                        |
|-------------------------|-------------------------------------------------------------|
| Create Project          | https://console.cloud.google.com/projectcreate              |
| Enable Google+ API      | https://console.cloud.google.com/apis/library/plus.googleapis.com |
| Create Credentials      | https://console.cloud.google.com/apis/credentials           |
| Configure Consent Screen| https://console.cloud.google.com/apis/credentials/consent   |

### Supabase Links:

| What                    | Link                                                                      |
|-------------------------|---------------------------------------------------------------------------|
| Authentication Providers| https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/providers|
| View Users              | https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/users    |
| URL Configuration       | https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/url-configuration |

---

## ✅ Summary

### What You Need:

1. ✅ Google Cloud project
2. ✅ OAuth 2.0 Client ID + Secret
3. ✅ Redirect URIs configured
4. ✅ Supabase Google provider enabled
5. ✅ Client ID/Secret in Supabase

### Time Required:

⏱️ **10-15 minutes** for first-time setup

### Result:

🎉 Users can login with their Google accounts and data is automatically saved to Supabase!

---

## 🚀 Get Started Now

1. **Follow Step 1:** Create OAuth credentials in Google Cloud Console
2. **Follow Step 2:** Configure in Supabase
3. **Follow Step 3:** Test it out!

**Need help?** Check the Troubleshooting section above.

**Ready to test?** Just run `npm run dev` and click "Continue with Google"!

🎉 Good luck!
