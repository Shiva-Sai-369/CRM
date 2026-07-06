# CRM Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Google Apps Script

1. Open your Google Sheet with lead data
2. Make sure your sheet has a header row with column names
3. Click **Extensions → Apps Script**
4. Delete any existing code
5. Open `docs/google-apps-script.js` in this project
6. Copy all the code
7. Paste it into the Apps Script editor
8. Update `SHEET_NAME` if your tab is not named "Sheet1"
9. Click **Save** (floppy disk icon)
10. Click **Deploy → New deployment**
11. Select type: **Web app**
12. Configure:
    - Description: `CRM Lead Fetcher`
    - Execute as: **Me**
    - Who has access: **Anyone**
13. Click **Deploy**
14. Copy the **Web App URL** (looks like `https://script.google.com/macros/s/.../exec`)
15. Click **Done**

### 3. Configure the CRM

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Go to **Settings** page

4. Paste your Web App URL

5. Click **Test Connection** to verify it works

6. Click **Save**

### 4. View Your Leads

1. Go to **Enquiries** page
2. Click **Refresh** to load leads from your Google Sheet
3. Use filters to narrow down results
4. Export to CSV if needed

## Troubleshooting

### "Connection failed" error

**Problem:** The Apps Script URL is not working

**Solutions:**
- Make sure you copied the full Web App URL
- Check that "Who has access" is set to "Anyone"
- Try redeploying the Apps Script

### "No leads found" message

**Problem:** The script is working but returns no data

**Solutions:**
- Check that your sheet tab name matches `SHEET_NAME` in the script
- Make sure your sheet has at least 2 rows (header + data)
- Verify your sheet isn't completely empty

### Script timeout

**Problem:** Large sheets take too long to load

**Solutions:**
- Reduce `MAX_ROWS` in the Apps Script configuration
- Split your data into multiple sheets
- Remove unnecessary columns from your sheet

## Sheet Column Mapping

The CRM expects these common column names (case-insensitive):

- **Name**: Customer Name, Full Name, Name
- **Email**: Email, Email Address
- **Phone**: Phone, Phone Number, Mobile
- **Lead Status**: Lead Status, Status
- **Lead Source**: Lead Source, Source
- **Tags**: Tags (comma-separated)
- **Last Message**: Last Message, Message
- **Last Message Date**: Last Message Date, Date, Created Time

Other columns will be imported as-is.

## Data Privacy

- Your Google Sheet data is fetched directly in the browser
- No data is stored on any server
- The Apps Script runs under your Google account
- Only people with the Web App URL can access the data

## Next Steps

After you have the basic CRM working:
- Add user authentication
- Integrate with Supabase for persistent storage
- Add lead assignment and tracking
- Build activity logs
