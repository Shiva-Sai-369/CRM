# 🔄 Sync Data Between Localhost and Production

## Understanding the Issue

**Your Setup:**
- **Localhost** (`http://localhost:3000`) → Uses one Supabase project
- **Production** (`https://your-app.onrender.com`) → Uses a different Supabase project (or the same one)

**The Problem:**
When you invite users or add data in localhost, it goes to your Supabase database. But if production uses a different environment or you haven't deployed the changes, production won't have that data.

---

## 🎯 Check Your Configuration First

### Step 1: Check Which Supabase Project Each Environment Uses

Look at your environment variables:

**Localhost** (`d:\WebRockets\CRM\.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://rkbgfvkchoexmvxephkd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIU...
```

**Production** (Render Environment Variables):
- Go to your Render dashboard
- Open your app → **Environment** tab
- Check: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Are They the Same?

#### ✅ **If YES (Same Supabase project):**
Your data SHOULD be the same on both! The issue is likely:
1. You haven't deployed latest code to Render
2. Cache issue on production
3. Different authentication state

**Solution:** Deploy your latest code to Render and hard refresh (Ctrl+Shift+R) on production

#### ❌ **If NO (Different Supabase projects):**
You need to migrate data from local Supabase to production Supabase.

---

## 🚀 Solution 1: Use the Same Supabase Project (Recommended)

The easiest approach is to use the **same Supabase project** for both environments.

### Steps:
1. Decide which Supabase project to keep (probably your production one)
2. Update your local `.env.local` to match production:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=<production_url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<production_key>
   SUPABASE_SERVICE_ROLE_KEY=<production_service_key>
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
3. Restart your dev server
4. Now localhost and production share the same database! ✅

**Pros:**
- ✅ Simple - no data migration needed
- ✅ Changes on localhost immediately reflect on production database
- ✅ Only one database to manage

**Cons:**
- ⚠️ Can't test dangerous operations safely
- ⚠️ Mistakes in dev affect production

---

## 🔄 Solution 2: Export and Import Data

If you want to keep separate environments, export data from localhost and import to production.

### Method A: Using Supabase Dashboard (Manual)

#### Export from Localhost Supabase:
1. Go to **Supabase Dashboard** (your localhost project)
2. **Table Editor** → Select table (e.g., `profiles`, `projects`)
3. Click **Export** → **CSV**
4. Download the CSV

#### Import to Production Supabase:
1. Go to **Production Supabase Dashboard**
2. **SQL Editor** → New query
3. Use this template:

```sql
-- Example: Import users/profiles
INSERT INTO profiles (id, email, role, full_name, created_at, updated_at)
VALUES
  ('uuid-here', 'user1@example.com', 'super_admin', 'User One', NOW(), NOW()),
  ('uuid-here', 'user2@example.com', 'team_member', 'User Two', NOW(), NOW());

-- Example: Import projects
INSERT INTO projects (name, description, created_at, updated_at)
VALUES
  ('Project A', 'Description here', NOW(), NOW()),
  ('Project B', 'Another project', NOW(), NOW());
```

### Method B: Using pg_dump (Advanced)

This backs up and restores the entire database:

```bash
# 1. Export from local Supabase
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres" > backup.sql

# 2. Import to production Supabase
psql "postgresql://postgres:[PASSWORD]@db.[PROD_PROJECT_ID].supabase.co:5432/postgres" < backup.sql
```

**Get connection strings from:**
Supabase Dashboard → Settings → Database → Connection string

---

## 🎯 Solution 3: Deploy Your Code to Production

If you're using the **same Supabase**, the issue might just be that production is running old code.

### Check What's Deployed:
1. Go to Render dashboard
2. Check **last deployment time**
3. Compare with your local changes

### Deploy Latest Code:
```bash
# Push to GitHub
git add .
git commit -m "Fix sync and invite features"
git push origin main

# Render will auto-deploy if connected to GitHub
# Or manually redeploy from Render dashboard
```

---

## 🐛 Common Issues After Sync

### Issue #1: Users Can't Log In
**Problem:** User IDs don't match between environments

**Solution:** Have users re-register on production, OR:
```sql
-- In production Supabase, update user IDs in profiles table
UPDATE profiles 
SET id = 'new-auth-user-id' 
WHERE email = 'user@example.com';
```

### Issue #2: Project Assignments Missing
**Problem:** `project_assignments` table not synced

**Solution:** Export and import that table too:
```sql
-- Check what's in localhost
SELECT * FROM project_assignments;

-- Copy to production
INSERT INTO project_assignments (user_id, project_id, created_at)
VALUES
  ('user-id-here', project-id-here, NOW());
```

### Issue #3: Google Sheets Not Accessible
**Problem:** Sheet URLs might be environment-specific

**Solution:** Re-configure sheets in production Settings page

---

## ✅ Recommended Workflow

For your current situation:

### **Short-term (Testing):**
Use the same Supabase for both environments:
1. Update `.env.local` to point to production Supabase
2. Work on localhost
3. Deploy to Render when ready
4. Everything stays in sync ✅

### **Long-term (Best Practice):**
Set up proper environments:
1. **Development Supabase** - for localhost testing
2. **Production Supabase** - for live app
3. Use migration scripts to sync when deploying
4. Never test on production data

---

## 🎬 What to Do RIGHT NOW

### Step 1: Check Your Configuration
Run this in your terminal:
```bash
# Show your localhost Supabase URL
cat .env.local | grep SUPABASE_URL
```

### Step 2: Check Production Configuration
1. Go to **Render Dashboard**
2. Your app → **Environment** tab
3. Look for `NEXT_PUBLIC_SUPABASE_URL`

### Step 3: Compare
- **If same URL** → Deploy your latest code to Render
- **If different URLs** → Either:
  - Update localhost to use production URL (easiest)
  - OR manually export/import data (more work)

---

## 📋 Quick Commands

### Export Single Table:
```sql
-- In Supabase SQL Editor
COPY profiles TO '/tmp/profiles.csv' WITH CSV HEADER;
```

### Import Single Table:
```sql
-- In Supabase SQL Editor
COPY profiles FROM '/path/to/profiles.csv' WITH CSV HEADER;
```

### List All Data:
```sql
-- Check what's in each table
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM project_assignments;
SELECT COUNT(*) FROM google_sheets;
SELECT COUNT(*) FROM sheet_leads;
```

---

## Need Help?

Tell me:
1. Are you using the **same Supabase** for localhost and production?
2. What's your **production URL** (Render link)?
3. Have you **deployed your latest code** to Render?

I'll guide you through the exact steps! 🚀
