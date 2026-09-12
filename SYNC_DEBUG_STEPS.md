# 🔧 Debug Steps - Why Sync Still Shows 0 Leads

## What Your Terminal Showed:

```
[sync] Existing leads count: 0
[sync] Existing emails: 0
[sync] Existing phones: 0
[sync] Leads to insert: 0          ← PROBLEM!
[sync] Duplicates skipped: 0
[sync] Empty rows skipped: 135     ← ALL rows treated as empty!
[sync] Sample lead to insert: undefined
```

**This means:** The code is not finding any `field_data` to parse, OR the parsing is failing silently.

---

## 🎯 IMMEDIATE ACTION - Sync Again with New Logs

I just added much better logging. Now when you sync, you'll see:

```
[sync] First row keys: [...all columns...]
[sync] First row sample: {...actual data...}
[sync] field_data type: string (or object)
[sync] field_data exists?: true/false
[sync] Processing field: email = john@example.com
[sync] Processing field: phone = +919876543210
[sync] Parsed Facebook lead: { name: 'John', email: 'john@...', phone: '+91...' }
```

### Do This NOW:
1. **Stop your dev server** (Ctrl+C)
2. **Restart it**: `npm run dev`
3. Go to **Settings** → Click **"🔄 Sync to Supabase"** for "Nizampet leads"
4. **Watch your terminal carefully**
5. **Copy the entire terminal output** and send it to me

---

## 🔍 What We're Looking For:

### Scenario A: field_data doesn't exist
```
[sync] field_data exists?: false
```
**Means:** Your CSV structure changed, or we're reading the wrong sheet

### Scenario B: field_data is there but empty
```
[sync] field_data type: string
[sync] field_data exists?: true
[sync] Parsed field_data: []
```
**Means:** The field_data column is empty

### Scenario C: JSON parsing fails
```
[sync] Failed to parse field_data: SyntaxError: ...
```
**Means:** The JSON format is invalid

### Scenario D: Fields are there but names don't match
```
[sync] Processing field: correo_electronico = john@example.com
```
**Means:** Column names are in a different language or format

---

## 🚀 Alternative: Manual CSV Check

While waiting for logs, do this:

1. **Download your CSV**:
   - Paste your CSV URL in browser
   - Save the file as `test.csv`

2. **Open in Notepad** (NOT Excel - it hides issues)

3. **Check the first 3 lines** - send them to me

**Example of what I need:**
```
created_time,id,ad_id,form_id,field_data
2024-01-15,123,456,789,"[{""name"":""email"",""values"":[""test@test.com""]}]"
2024-01-16,124,457,790,"[{""name"":""phone"",""values"":[""9876543210""]}]"
```

---

## 🎬 Most Likely Causes:

### Cause #1: CSV Parser Escaping Issues (90%)
The CSV parser might be treating the JSON string incorrectly. The quotes inside `field_data` might be getting mangled.

### Cause #2: Wrong Sheet Selected
You might be syncing a different sheet than the one shown in the test-csv page.

### Cause #3: Field Names in Different Language
Facebook field names might be in Hindi/Telugu/another language.

---

## ✅ Quick Test - Use Apps Script Instead

If the CSV parsing keeps failing, let's use Google Apps Script which gives us clean JSON:

### Steps:
1. Open your Google Sheet with "Nizampet leads"
2. Click **Extensions → Apps Script**
3. Delete all code
4. Copy code from `docs/google-apps-script.js`
5. **Update line 9:** Change `SHEET_NAME: 'Sheet1'` to `SHEET_NAME: 'Nizampet leads'` (or whatever your actual tab name is)
6. Click **Deploy → New deployment → Web app**
7. Execute as: **Me**
8. Who has access: **Anyone**
9. Click **Deploy** → Copy the URL
10. In CRM Settings, use that URL instead of the CSV URL

This bypasses all CSV parsing issues!

---

## 📋 Summary

**Right now:**
1. Restart dev server
2. Sync again
3. Copy ALL terminal output
4. Send it to me

**Or alternatively:**
1. Download your CSV
2. Open in Notepad
3. Copy first 3 lines
4. Send them to me

I'll tell you exactly what's wrong! 🚀
