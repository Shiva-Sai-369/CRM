# Google Sheets Fetch - Debug Checklist

## Current Issue
You're seeing **"0 of 0 leads"** on the Enquiries page, even after clicking "Sync to Supabase".

## Common Causes & How to Fix

### 1. ✅ **Sheet URL Format**

The most common issue! Your sheet MUST be published as CSV.

#### Check Your Current URL Format:
```
❌ WRONG: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
❌ WRONG: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/pubhtml
✅ CORRECT: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/pub?output=csv
✅ CORRECT: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/pub?gid=0&output=csv
```

#### How to Get the Correct URL:

**Option A: Use the Settings Page Discovery Tool** (Recommended)
1. Go to **Settings** page
2. Under "Public Sheet" section
3. Paste your full sheet URL (the one with /edit)
4. Click **"Fetch Tabs"**
5. The tool will automatically discover all tabs and generate correct CSV URLs
6. Select the tabs you want → Click "Save Selected Tabs"
7. Then click **"🔄 Sync to Supabase"**

**Option B: Manual Publishing**
1. Open your Google Sheet
2. Click **File → Share → Publish to web**
3. In the dropdown, select **"Comma-separated values (.csv)"** (NOT "Web page")
4. Choose which sheet tab to publish
5. Click **"Publish"**
6. Copy the generated URL - it should contain `pub?output=csv`
7. Paste this URL in Settings

---

### 2. 📊 **Sheet Structure**

Your Google Sheet must have:
- **Header row** in row 1
- **Required columns**: Name, Email, or Phone (at least one)
- **Optional columns**: Company, Status, Timestamp, Platform

#### Check Your Headers:
```csv
Name,Email,Phone,Company,Status,Timestamp
```

The code looks for these column names (case-insensitive):
- **Name** or **full_name**
- **Email** or **email**
- **Phone** or **phone_number**
- **Status** or **lead_status**

---

### 3. 🔐 **Permission Issues**

#### For Published Sheets:
- Sheet must be set to **"Anyone with the link can view"**
- OR properly published to web

#### To Check:
1. Open your sheet
2. Click **Share** button
3. Under "General access", ensure it's NOT "Restricted"
4. Should be **"Anyone with the link"** → **Viewer**

---

### 4. 🔍 **Debug Steps**

#### Step 1: Test the Sheet URL Directly
1. Open your **Settings** page
2. Find the sheet tab you configured
3. Copy the CSV URL
4. Open the URL in a new browser tab (incognito/private mode)
5. **What you should see:**
   - ✅ CSV data displays as plain text
   - ❌ If you see HTML or "Access Denied" → Permission issue
   - ❌ If you see 404 → Wrong URL format

#### Step 2: Check What's in Supabase
1. Go to your **Supabase Dashboard**
2. Click **Table Editor** on the left
3. Open the **`sheet_leads`** table
4. **Check:**
   - Are there ANY rows?
   - Do they have the correct `sheet_id`?
   - Is the data properly filled in?

#### Step 3: Check Your Project Assignment
1. Still in Supabase, open **`project_assignments`** table
2. Find your `user_id` (from the `profiles` table)
3. **Verify:** You're assigned to the project that owns the sheet

#### Step 4: Check the Sync API Response
1. Go to **Settings** page
2. Open **Browser DevTools** (F12)
3. Go to **Network** tab
4. Click **"🔄 Sync to Supabase"**
5. Find the request to `/api/sync-sheet-to-supabase`
6. Click on it → **Response** tab
7. **Check the response:**
   ```json
   {
     "success": true,
     "message": "Synced 43 new leads",
     "insertedRows": 43,
     "skippedRows": 0
   }
   ```
   - If `insertedRows: 0` → All leads were duplicates OR no data in sheet
   - If you see an error → That's your problem!

---

### 5. 🎯 **Quick Fix Script**

If you want to test your sheet URL quickly, open **Browser Console** (F12 → Console) and run:

```javascript
// Replace with your actual CSV URL
const testUrl = 'YOUR_CSV_URL_HERE';

fetch(testUrl)
  .then(res => res.text())
  .then(csv => {
    console.log('✅ Sheet fetched successfully!');
    console.log('First 500 characters:', csv.substring(0, 500));
    console.log('Total length:', csv.length, 'characters');
    
    // Parse CSV
    const lines = csv.split('\n');
    console.log('Total rows:', lines.length);
    console.log('Headers:', lines[0]);
    console.log('First data row:', lines[1]);
  })
  .catch(err => {
    console.error('❌ Failed to fetch sheet:', err);
  });
```

---

### 6. 🚨 **Still Not Working?**

#### Run This Debug Query in Browser Console:

```javascript
// On the Enquiries page, run this:
const supabase = (await import('@supabase/ssr')).createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Check current user
const { data: { user } } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email);

// Check projects you have access to
const { data: assignments } = await supabase
  .from('project_assignments')
  .select('project_id, projects(name)')
  .eq('user_id', user.id);
console.log('📁 Your projects:', assignments);

// Check all sheets
const { data: sheets } = await supabase
  .from('google_sheets')
  .select('*');
console.log('📊 All sheets in database:', sheets);

// Check total leads
const { count } = await supabase
  .from('sheet_leads')
  .select('*', { count: 'exact', head: true });
console.log('📈 Total leads in database:', count);

// Check leads for your projects
const projectIds = assignments?.map(a => a.project_id) || [];
const { data: yourSheets } = await supabase
  .from('google_sheets')
  .select('id, name, sheet_name')
  .in('project_id', projectIds);
console.log('📊 Your sheets:', yourSheets);

if (yourSheets && yourSheets.length > 0) {
  const sheetIds = yourSheets.map(s => s.id);
  const { data: yourLeads, count: yourCount } = await supabase
    .from('sheet_leads')
    .select('*', { count: 'exact' })
    .in('sheet_id', sheetIds);
  console.log('📈 Your leads count:', yourCount);
  console.log('📝 Sample lead:', yourLeads?.[0]);
}
```

**What to look for:**
- If `Total leads in database: 0` → Sync never worked
- If `Your projects: []` → You're not assigned to any projects
- If `Your sheets: []` → No sheets linked to your projects
- If leads exist but count is 0 → RLS (Row Level Security) issue

---

## Most Likely Solutions

### Solution 1: Use Apps Script Instead (More Reliable)

If CSV publishing keeps failing, use the Apps Script proxy:

1. Open your Google Sheet
2. Click **Extensions → Apps Script**
3. Delete any existing code
4. Copy the entire content from `docs/google-apps-script.js`
5. Paste it in
6. Change `SHEET_NAME: 'Sheet1'` to match your tab name
7. Click **Deploy → New deployment**
8. Type: **Web app**
9. Execute as: **Me**
10. Who has access: **Anyone**
11. Click **Deploy** → Copy the URL
12. In CRM Settings, paste this URL in the **"Private Sheet"** section
13. Click **Test Connection** → Should show lead count
14. Click **Save** → Then **"🔄 Sync to Supabase"**

### Solution 2: Fix Your CSV URL Format

1. Go to Settings
2. Under "Saved Tabs", find your sheet
3. Click the 🗑️ icon to delete it
4. Use the **"Public Sheet"** discovery tool at the top
5. Paste your sheet URL → Click "Fetch Tabs"
6. Select your tab → Click "Save Selected Tabs"
7. Assign to project → Click **"🔄 Sync to Supabase"**

---

## Expected Flow

When everything works correctly:

1. **Settings Page:**
   - Add sheet URL → Discover tabs → Save tabs → Assign to project
   - Click "🔄 Sync to Supabase"
   - See: "Synced 43 new leads" (or however many)

2. **Supabase Database:**
   - `projects` table: Has your project
   - `google_sheets` table: Has your sheet record
   - `sheet_leads` table: Has your lead data
   - `project_assignments` table: Links you to the project

3. **Enquiries Page:**
   - Select the project from dropdown
   - Select the sheet from dropdown
   - See your leads in the table!

---

## Still Stuck?

Send me:
1. The CSV URL you're using (remove the actual Sheet ID for privacy)
2. The format: `https://docs.google.com/spreadsheets/d/XXXXX/pub?gid=0&output=csv`
3. What happens when you open that URL in browser
4. The response from the sync API (from Network tab)
5. Results from the debug query above
