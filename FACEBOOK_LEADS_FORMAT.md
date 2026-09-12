# ✅ FIXED: Facebook Lead Ads Format Support

## What Was the Problem?

Your Google Sheet has **Facebook Lead Ads data**, which uses a different format:

### Standard Format (what the code expected):
```csv
Name,Email,Phone,Company
John Doe,john@example.com,+919876543210,ABC Corp
```

### Facebook Lead Ads Format (what you have):
```csv
created_time,id,ad_id,form_id,field_data
2024-01-15,123456,ad_789,form_012,"[{""name"":""email"",""values"":[""john@example.com""]}]"
```

The actual lead data (name, email, phone) is stored **inside the `field_data` column as JSON**, not as separate columns.

---

## ✅ What I Fixed

I updated the sync API (`app/api/sync-sheet-to-supabase/route.ts`) to:

1. **Detect Facebook Lead Ads format** (when it sees `field_data` column)
2. **Parse the JSON inside `field_data`** to extract:
   - Email (looks for fields with "email" or "e-mail" in the name)
   - Phone (looks for fields with "phone", "mobile", or "number")
   - Name (looks for fields with "name" or "full_name")
   - Company (looks for fields with "company" or "organization")
3. **Use the `created_time`** from Facebook as the lead timestamp
4. **Fall back to standard format** if `field_data` doesn't exist

---

## 🚀 How to Test It Now

### Step 1: Sync Again
1. Go to **Settings** page
2. Find "Nizampet leads" sheet
3. Click **"🔄 Sync to Supabase"**
4. Watch your **Terminal/CMD** for logs:
   ```
   [sync] Parsed Facebook lead: { name: 'John Doe', email: 'john@...', phone: '+91...' }
   ```

### Step 2: Check the Result
The sync response should now show:
```json
{
  "success": true,
  "message": "Synced 123 new leads",
  "insertedRows": 123,
  "skippedRows": 0
}
```

### Step 3: View Leads
1. Go to **Enquiries** page
2. Select your project
3. Select "Nizampet leads" sheet
4. **Your 123 leads should now appear!** 🎉

---

## 🔍 Understanding Facebook Lead Ads Format

When you export leads from Facebook, each lead's data is stored like this:

```json
[
  {
    "name": "email",
    "values": ["john@example.com"]
  },
  {
    "name": "full_name",
    "values": ["John Doe"]
  },
  {
    "name": "phone_number",
    "values": ["+919876543210"]
  }
]
```

This gets stringified and stored in the `field_data` column of your CSV.

The updated code now:
1. Detects this format automatically
2. Parses the JSON
3. Extracts the relevant fields
4. Stores them in the standard format in your database

---

## 📋 Supported Formats Now

### Format 1: Standard CSV ✅
```csv
Name,Email,Phone,Company,Status
John Doe,john@example.com,+919876543210,ABC Corp,new
```

### Format 2: Facebook Lead Ads ✅
```csv
created_time,id,ad_id,form_id,field_data
2024-01-15T10:30:00+0000,123456,789,012,"[{""name"":""email"",""values"":[""john@example.com""]}]"
```

### Format 3: Alternative Column Names ✅
```csv
full_name,email,phone_number,lead_status
John Doe,john@example.com,+919876543210,new_lead
```

---

## 🎯 Next Steps

1. **Sync your "Nizampet leads"** sheet again
2. **Check Enquiries page** - your 123 leads should appear
3. If you have other sheets with Facebook format, they'll work automatically now

---

## 📝 About Your Second Issue (Users Not Visible)

You mentioned:
> "I have invited some users in localhost and it's not visible if I open my account in render link"

This is a **separate issue** - your localhost database and production (Render) database are different!

**Why this happens:**
- `localhost:3000` uses your **local Supabase** (or local data)
- `your-app.render.com` uses your **production Supabase**
- They're **completely separate databases**

**To see users in production:**
1. Log into your **production URL** (Render link)
2. Invite users from there
3. OR migrate your local Supabase data to production

Want me to help you with that next?

---

## ✅ Summary

- ✅ Fixed Facebook Lead Ads format parsing
- ✅ Your sync should work now for "Nizampet leads"
- ✅ All 123 leads should appear in Enquiries
- ⏳ Next: Sync localhost users to production (if needed)

**Try syncing now and let me know if it works!** 🚀
