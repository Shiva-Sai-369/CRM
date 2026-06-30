# Supabase CRM Authentication Setup Guide

This guide will walk you through setting up Supabase Authentication, Google OAuth, and the database for your CRM system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Project Setup](#supabase-project-setup)
3. [Database Schema Setup](#database-schema-setup)
4. [Google OAuth Configuration](#google-oauth-configuration)
5. [Environment Variables](#environment-variables)
6. [Creating Your First Admin User](#creating-your-first-admin-user)
7. [Testing the Application](#testing-the-application)

---

## Prerequisites

- Node.js 18+ installed
- A Supabase account (sign up at [supabase.com](https://supabase.com))
- A Google Cloud Platform account (for Google OAuth)

---

## Supabase Project Setup

### Step 1: Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in:
   - **Project Name**: `CRM` (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to your users
4. Click **"Create new project"**
5. Wait for the project to be provisioned (2-3 minutes)

### Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, click **"Settings"** (gear icon) in the sidebar
2. Click **"API"** in the settings menu
3. You'll see:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **Anon/Public Key**: `eyJhbGc...` (long string)
4. **Keep this page open** - you'll need these values

---

## Database Schema Setup

### Step 1: Run the SQL Schema

1. In your Supabase dashboard, click **"SQL Editor"** in the sidebar
2. Click **"New Query"**
3. Open the file `supabase-schema.sql` from your project root
4. Copy **ALL** the SQL code from that file
5. Paste it into the Supabase SQL Editor
6. Click **"Run"** (or press Ctrl/Cmd + Enter)
7. You should see: **"Success. No rows returned"**

### Step 2: Verify Tables Created

1. Click **"Table Editor"** in the sidebar
2. You should see these tables:
   - `companies`
   - `profiles`
   - `customers`
   - `activity_logs`
   - `tasks`

---

## Google OAuth Configuration

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Click **"APIs & Services"** → **"Credentials"**
4. Click **"Create Credentials"** → **"OAuth 2.0 Client IDs"**
5. If prompted, configure the OAuth consent screen:
   - User Type: **External**
   - App name: **Your CRM Name**
   - User support email: **Your email**
   - Developer contact: **Your email**
   - Click **"Save and Continue"**
   - Skip Scopes (click **"Save and Continue"**)
   - Add test users if needed
   - Click **"Save and Continue"**
6. Back to **"Create OAuth Client ID"**:
   - Application type: **Web application**
   - Name: **CRM OAuth Client**
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for local dev)
     - `https://your-production-domain.com` (for production)
   - **Authorized redirect URIs**:
     - `https://xxxxxxxxxxxxx.supabase.co/auth/v1/callback` (replace with your Supabase project URL)
     - `http://localhost:3000/auth/callback` (for local dev)
   - Click **"Create"**
7. Copy the **Client ID** and **Client Secret**

### Step 2: Configure Google OAuth in Supabase

1. In Supabase dashboard, click **"Authentication"** in the sidebar
2. Click **"Providers"**
3. Find **"Google"** and click to expand
4. Toggle **"Enable Sign in with Google"** to ON
5. Paste your:
   - **Client ID** (from Google)
   - **Client Secret** (from Google)
6. Click **"Save"**

---

## Environment Variables

### Step 1: Create `.env.local` File

1. In your project root, create a file named `.env.local`
2. Add these lines:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key-here...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. Replace:
   - `https://xxxxxxxxxxxxx.supabase.co` with your Supabase Project URL
   - `eyJhbGc...` with your Supabase Anon Key
   - For production, change `NEXT_PUBLIC_SITE_URL` to your actual domain

### Step 2: Add `.env.local` to `.gitignore`

Make sure `.env.local` is in your `.gitignore` file (it should already be there).

---

## Creating Your First Admin User

### Method 1: Manual SQL (Recommended for first admin)

1. **Sign up through the application**:
   - Run `npm run dev`
   - Go to `http://localhost:3000/login`
   - Click "Continue with Google" or sign up with email/password
   - Complete the signup

2. **Get your User ID**:
   - Go to Supabase Dashboard
   - Click **"Authentication"** → **"Users"**
   - Find your newly created user
   - Copy the **UUID** (e.g., `abc12345-6789-...`)

3. **Create a company**:
   - Click **"SQL Editor"** in Supabase
   - Run this SQL (replace `Your Company Name`):

   ```sql
   INSERT INTO companies (company_name)
   VALUES ('Your Company Name')
   RETURNING id;
   ```

   - Copy the returned company `id`

4. **Make yourself an admin**:
   - Run this SQL (replace `YOUR_USER_ID` and `YOUR_COMPANY_ID`):

   ```sql
   UPDATE profiles 
   SET role = 'admin', company_id = 'YOUR_COMPANY_ID' 
   WHERE id = 'YOUR_USER_ID';
   ```

5. **Logout and login again** - you should now see the Admin Dashboard!

### Method 2: Admin Creation (After first admin exists)

Once you have at least one admin, they can create new workers through the UI:

1. Login as admin
2. Go to **Workers** page
3. Click **"Add Worker"**
4. Fill in details and create the account

---

## Testing the Application

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Run Development Server

```bash
npm run dev
```

### Step 3: Test Login

1. Go to `http://localhost:3000`
2. You should be redirected to `/login`
3. Try logging in with:
   - **Google OAuth**: Click "Continue with Google"
   - **Email/Password**: Enter credentials

### Step 4: Verify Role-Based Access

- **Admin users** should see:
  - Admin Dashboard
  - Full access to all customers
  - Worker management
  - Activity logs

- **Worker users** should see:
  - Worker Dashboard
  - Only assigned customers
  - Their tasks
  - Their activity

### Step 5: Test Google Sheets Integration (if using)

1. Login as admin
2. Go to **Settings**
3. Configure your Google Sheet CSV URL
4. Import customers

---

## Troubleshooting

### Issue: "Your account has not been assigned to a company"

**Solution**: Make sure you've run the SQL to assign the user to a company (see "Creating Your First Admin User")

### Issue: "Failed to fetch" or CORS errors

**Solution**: 
- Check that your `.env.local` file has the correct Supabase URL
- Verify the URL in Supabase Settings → API matches your .env

### Issue: Google OAuth not working

**Solution**:
- Verify redirect URI in Google Cloud Console matches: `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback`
- Check that Google OAuth is enabled in Supabase → Authentication → Providers
- Ensure Client ID and Secret are correctly entered in Supabase

### Issue: Workers can see all customers

**Solution**:
- This means Row Level Security (RLS) is not working
- Go to Supabase → SQL Editor
- Re-run the RLS policies from `supabase-schema.sql`
- Check that RLS is enabled: `ALTER TABLE customers ENABLE ROW LEVEL SECURITY;`

### Issue: Cannot create workers as admin

**Solution**:
- Verify your user's `role` is set to `'admin'` in the profiles table
- Check company_id is set for your admin user
- Verify RLS policies allow admins to insert into profiles table

---

## Production Deployment

### Step 1: Update Environment Variables

In your hosting platform (Vercel, Netlify, etc.), add:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

### Step 2: Update Google OAuth Redirect URIs

Add your production URL to:
- Google Cloud Console → OAuth Client → Authorized redirect URIs
- Format: `https://xxxxxxxxxxxxx.supabase.co/auth/v1/callback`

### Step 3: Update Site URL in Supabase

1. Supabase Dashboard → **Settings** → **API**
2. Under **"Authentication"** → **"Site URL"**
3. Set to: `https://your-production-domain.com`
4. Click **"Save"**

---

## Security Best Practices

✅ **DO:**
- Keep `.env.local` in `.gitignore`
- Use strong passwords for admin accounts
- Regularly review activity logs
- Enable email verification in Supabase Authentication settings
- Use the Anon Key on frontend (never Service Role key)

❌ **DON'T:**
- Commit `.env.local` to git
- Share your Service Role key
- Disable Row Level Security
- Give all Google users admin access by default

---

## Need Help?

If you encounter issues:

1. Check the browser console for errors
2. Check Supabase Logs: Dashboard → Logs
3. Verify environment variables are loaded: `console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)`
4. Test Supabase connection in SQL Editor
5. Review Row Level Security policies

---

## Next Steps

Once authentication is working:

1. ✅ Create worker accounts
2. ✅ Import customers from Google Sheets
3. ✅ Assign customers to workers
4. ✅ Create tasks for workers
5. ✅ Monitor activity logs
6. ✅ Customize the UI as needed

Good luck with your CRM! 🚀
