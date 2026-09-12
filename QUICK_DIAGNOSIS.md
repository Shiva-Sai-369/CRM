# 🚀 QUICK DIAGNOSIS - "Synced 0 Leads" Issue

## Your Situation
✅ CSV URL is correct (file downloads)  
✅ You have 123 rows in your sheet  
❌ Sync says "Synced 0 new leads"  
❌ Enquiries page shows "0 of 0 leads"  

---

## 🎯 DO THIS RIGHT NOW (3 Minutes):

### Step 1: Open Debug Page
Navigate to: **http://localhost:3000/debug-leads**

This shows exactly what's in your database.

### Step 2: Check "Total Leads in DB"

#### If it shows **123** (or close to it):
✅ **Your leads ARE synced!** The problem is just the filter selection.

**Fix:**
1. Go to `/enquiries`
2. Change the **Project** dropdown - try each one
3. Change the **Sheet** dropdown - try "All sheets"
4. Your leads are there!

#### If it shows **0**:
❌ **Sync never worked**. Continue to Step 3.

---

### Step 3: Check Terminal Logs (Dev Server)

I added detailed logging. When you click "Sync to Supabase":

1. Look at your **Terminal/CMD** where `npm run dev` is running
2. You'll see output like:
   ```
   [sync] Parsed rows count: 123
   [sync] Existing leads count: ???
   [sync] Leads to insert: ???
   [sync] Duplicates skipped: ???
   ```

**What it means:**

| Leads to insert | Duplicates | What's wrong | Solution |
|----------------|------------|--------------|----------|
| 123 | 0 | ✅ All good! | Leads should be in DB now. Check Enquiries page. |
| 0 | 123 | All are duplicates | Clear old data (see below) and re-sync |
| 0 | 0 | Empty sheet or wrong columns | Check sheet structure (see below) |

---

## 🔧 COMMON FIXES:

### Fix #1: Clear Duplicate Data

If `Duplicates skipped: 123`, your leads already exist. Clear them:

**In Supabase SQL Editor:**
```sql
-- See all sheets
SELECT id, name, project_id FROM google_sheets;

-- Delete leads for a specific sheet (replace 1 with actual sheet ID)
DELETE FROM sheet_leads WHERE sheet_id = 1;
```

Then re-sync in Settings.

---

### Fix #2: Check Sheet Structure

Your sheet MUST have these columns (at least one):
- `Name` or `full_name`
- `Email` or `email`
- `Phone` or `phone_number`

**Test your sheet:**
1. Download your CSV (paste URL in browser)
2. Open in Notepad/Excel
3. Check first row - are headers spelled correctly?
4. Check second row - is there actual data?

---

### Fix #3: Assign Yourself to Project

If debug page shows "Your Project Access = Empty":

**In Supabase SQL Editor:**
```sql
-- Get your user ID
SELECT id, email FROM auth.users;

-- Get project IDs
SELECT id, name FROM projects;

-- Assign yourself (replace with actual IDs)
INSERT INTO project_assignments (user_id, project_id)
VALUES ('your-user-id-here', project-id-here);
```

---

## 📱 Quick Contact Points:

### Files I Created to Help:
1. **`DUPLICATE_LEADS_FIX.md`** - Detailed troubleshooting guide
2. **`SHEETS_FETCH_DEBUG.md`** - Complete debugging checklist  
3. **`/debug-leads`** - Visual diagnostic page (http://localhost:3000/debug-leads)
4. **Enhanced sync API** - Now logs everything to terminal

### Where to Look:
1. **Terminal logs** - Shows sync details in real-time
2. **Browser DevTools** → Network tab → Check `/api/sync-sheet-to-supabase` response
3. **Supabase Dashboard** → Table Editor → `sheet_leads` table
4. **Debug page** → http://localhost:3000/debug-leads

---

## 🎬 Most Likely Solution:

Based on "file downloads when pasted in browser" + "synced 0 leads":

**Your leads are already in the database from a previous sync.**

**Fix it in 60 seconds:**
1. Open Supabase SQL Editor
2. Run: `DELETE FROM sheet_leads;`
3. Go to CRM Settings
4. Click "🔄 Sync to Supabase"
5. Check terminal → Should say "Leads to insert: 123"
6. Go to Enquiries → Your leads should appear!

---

## ❓ Still Not Working?

**Share this info with me:**

1. Output from: http://localhost:3000/debug-leads (screenshot)
2. Terminal logs when you click "Sync to Supabase" (copy/paste)
3. This SQL query result from Supabase:
   ```sql
   SELECT COUNT(*) as total_leads FROM sheet_leads;
   SELECT COUNT(*) as total_sheets FROM google_sheets;
   SELECT COUNT(*) as total_projects FROM projects;
   ```

I'll tell you exactly what's wrong!
