# Quick Start Guide - Supabase CRM Authentication

Get your CRM up and running with authentication in 5 minutes!

## Step 1: Install Dependencies ✓ (Already Done)

```bash
npm install @supabase/supabase-js @supabase/ssr react-hot-toast
```

## Step 2: Set Up Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Project Name**: CRM
   - **Database Password**: (save this!)
   - **Region**: Select closest to you
4. Click **"Create new project"** and wait 2-3 minutes

## Step 3: Get Your Credentials

1. Once created, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** - looks like `https://xxxxx.supabase.co`
   - **Anon Public key** - long string starting with `eyJhb...`

## Step 4: Create .env.local

Create a file named `.env.local` in your project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Replace the values with your actual credentials from Step 3.

## Step 5: Set Up Database

1. In Supabase Dashboard, click **SQL Editor**
2. Click **"New Query"**
3. Open the file `supabase-schema.sql` from your project
4. Copy ALL the SQL code
5. Paste into the query editor
6. Click **"Run"** or press `Ctrl+Enter`
7. Wait for success message ✓

## Step 6: (Optional) Configure Google OAuth

**Skip this if you only want email/password login**

### Part A: Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Go to **APIs & Services** → **Credentials**
4. Click **"Create Credentials"** → **OAuth 2.0 Client ID**
5. Choose **Web application**
6. Add these **Authorized redirect URIs**:
   - `https://your-project-id.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback`
7. Click **Create** and copy the **Client ID** and **Client Secret**

### Part B: Supabase Dashboard

1. Go to Supabase → **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Toggle **Enable Sign in with Google** to ON
4. Paste your **Client ID** and **Client Secret**
5. Click **Save**

## Step 7: Create Your First Admin Account

1. Run the app: `npm run dev`
2. Go to `http://localhost:3000`
3. You'll be redirected to `/login`
4. Sign up with email/password (or use Google)
5. Wait for your account to be created

### Make Yourself Admin

1. Open Supabase Dashboard
2. Go to **Authentication** → **Users**
3. Find your newly created user and copy the **UUID**
4. Go to **SQL Editor** → **New Query**
5. Run this SQL:

```sql
-- Create a company
INSERT INTO companies (company_name) 
VALUES ('My Company') 
RETURNING id;
```

6. Copy the returned `id` value
7. Run this SQL (replace values):

```sql
UPDATE profiles 
SET role = 'admin', company_id = 'paste-company-id-here'
WHERE id = 'paste-your-user-id-here';
```

8. Logout and login again
9. You should now see the **Admin Dashboard**! 🎉

## Step 8: Test the App

### As Admin:
- ✅ Login to `/login`
- ✅ See Admin Dashboard at `/admin/dashboard`
- ✅ Navigate: Dashboard, Customers, Workers, Activity, Tasks, Settings

### Create a Worker:
1. Go to **Workers** page
2. Click **"Add Worker"** (feature coming soon)
3. Alternatively, create via Supabase SQL:

```sql
-- Create a worker user through Supabase Auth
-- Then:
UPDATE profiles 
SET role = 'worker', company_id = 'your-company-id'
WHERE email = 'worker@example.com';
```

### As Worker:
- ✅ Login with worker account
- ✅ See Worker Dashboard at `/worker/dashboard`
- ✅ See only assigned customers
- ✅ View tasks and activity

## 🔐 Security Check

Your CRM is now secure with:

✅ **Authentication** - Users must login  
✅ **Authorization** - Row-level security prevents data leaks  
✅ **Encryption** - Passwords hashed by Supabase  
✅ **Sessions** - Automatic logout after inactivity  
✅ **OAuth** - Safe third-party login option  

## 🚀 Deploy to Production

### Option 1: Vercel (Recommended)

```bash
# 1. Push to GitHub
git add .
git commit -m "Add Supabase authentication"
git push origin main

# 2. Go to vercel.com
# 3. Connect your GitHub repo
# 4. Add environment variables:
#    - NEXT_PUBLIC_SUPABASE_URL
#    - NEXT_PUBLIC_SUPABASE_ANON_KEY
#    - NEXT_PUBLIC_SITE_URL (your production domain)
# 5. Deploy

# 6. Update Google OAuth redirect URIs:
#    https://your-production-domain.com/auth/callback
```

### Option 2: Self-Hosted

```bash
npm run build
npm run start
# Then point your domain to this server
```

## ✨ What's Included

✅ Multi-user authentication  
✅ Email/password login  
✅ Google OAuth  
✅ Admin & Worker roles  
✅ Role-based access control  
✅ Row-level security at database level  
✅ Activity logging  
✅ Task management  
✅ Admin dashboard with stats  
✅ Worker dashboard  
✅ Password reset  
✅ Session management  

## 📚 Next Steps

1. **Customize** - Edit dashboards in `/app/admin` and `/app/worker`
2. **Add Features** - See `IMPLEMENTATION_SUMMARY.md` for extension ideas
3. **Invite Team** - Create workers and assign customers
4. **Monitor** - Check activity logs in admin dashboard
5. **Export** - Integrate with Google Sheets (already supported!)

## 🆘 Troubleshooting

**"Page says 'required to create Supabase client'"**  
→ Check your `.env.local` file has correct credentials

**"Can't login with Google"**  
→ Verify Google OAuth is enabled in Supabase → Authentication → Providers

**"Worker can see all customers"**  
→ RLS might not be enabled; re-run the `supabase-schema.sql`

**"Stuck on login page"**  
→ Clear browser cookies and try again

## 📞 Need Help?

See detailed guides:
- `SUPABASE_SETUP.md` - Detailed Supabase configuration
- `IMPLEMENTATION_SUMMARY.md` - Complete feature list
- `README.md` - Original CRM documentation

## 🎉 You're Done!

Your CRM now has:
- ✅ Secure authentication
- ✅ Multi-user support  
- ✅ Role-based access
- ✅ Admin & worker dashboards
- ✅ Production-ready security

**Next:** Invite your team and start managing customers!

---

**Questions?** Check the logs:
- Browser console: `F12` → Console tab
- Server logs: Terminal where you ran `npm run dev`
- Supabase logs: Dashboard → Logs section
