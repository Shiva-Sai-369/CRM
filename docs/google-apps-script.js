// ─────────────────────────────────────────────────────────────
// CRM Lead Fetcher — Google Apps Script
// 
// HOW TO SET UP (one time only):
// 1. Open your Google Sheet
// 2. Click Extensions → Apps Script
// 3. Delete all existing code in the editor
// 4. Paste this entire file
// 5. Click Save (floppy disk icon)
// 6. Click Deploy → New deployment
// 7. Type: Select type → Web app
// 8. Description: CRM Lead Fetcher
// 9. Execute as: Me
// 10. Who has access: Anyone
// 11. Click Deploy → copy the Web App URL
// 12. Paste that URL into your CRM Settings page
// ─────────────────────────────────────────────────────────────

// Configuration — update SHEET_NAME if your sheet tab is not "Sheet1"
const CONFIG = {
  SHEET_NAME: 'Sheet1',
  MAX_ROWS: 2000,Update the data fetching layer to support BOTH a public Google Sheet
CSV URL and a Google Apps Script URL from the same Settings input.
Auto-detect which one was pasted and fetch accordingly.

DO NOT touch anything outside the files listed below.

═══════════════════════════════════════════════
TASK 1 — UPDATE lib/config.ts
═══════════════════════════════════════════════
Replace the existing getSheetScriptUrl and saveSheetScriptUrl
functions with these more generic ones:

/**
 * Returns the sheet data source URL from localStorage.
 * Can be either a published CSV URL or an Apps Script URL.
 */
export function getSheetUrl(): string {
  if (typeof window !== 'undefined') {
    return (
      localStorage.getItem('sheetUrl') ||
      localStorage.getItem('sheetScriptUrl') || // backwards compat
      localStorage.getItem('sheetCsvUrl') ||    // backwards compat
      ''
    );
  }
  return '';
}

/**
 * Saves the sheet URL to localStorage under the unified key 'sheetUrl'.
 */
export function saveSheetUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sheetUrl', url.trim());
  }
}

/**
 * Detects whether a URL is a public Google Sheet CSV URL
 * or a Google Apps Script web app URL.
 * @returns 'csv' | 'script' | 'unknown'
 */
export function detectUrlType(
  url: string
): 'csv' | 'script' | 'unknown' {
  if (!url) return 'unknown';
  if (
    url.includes('docs.google.com/spreadsheets') &&
    (url.includes('output=csv') || url.includes('/pub'))
  ) {
    return 'csv';
  }
  if (url.includes('script.google.com/macros/s/')) {
    return 'script';
  }
  return 'unknown';
}

═══════════════════════════════════════════════
TASK 2 — UPDATE lib/services/fetchLeadsFromScript.ts
═══════════════════════════════════════════════
Rename this file to: lib/services/fetchLeads.ts

Keep the existing fetchLeadsFromScript() function as-is.

Add a new function below it:

/**
 * Fetches leads from a public Google Sheet published as CSV.
 * The sheet must be published via File → Share → Publish to web → CSV.
 *
 * @param csvUrl - The published CSV URL from Google Sheets
 * @returns FetchResult with leads array and error if any
 */
export async function fetchLeadsFromCsv(
  csvUrl: string
): Promise<FetchResult> {
  if (!csvUrl || csvUrl.trim() === '') {
    return {
      leads: [],
      total: 0,
      fetchedAt: new Date().toISOString(),
      error: 'No sheet URL configured. Go to Settings to add it.',
    };
  }

  try {
    const response = await fetch(csvUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch sheet: ${response.status} ${response.statusText}`
      );
    }

    const csvText = await response.text();

    if (!csvText || csvText.trim() === '') {
      throw new Error(
        'Sheet returned empty data. Make sure it is published as CSV.'
      );
    }

    const leads = parseLeadsFromCsv(csvText);

    return {
      leads,
      total: leads.length,
      fetchedAt: new Date().toISOString(),
      error: null,
    };

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      leads: [],
      total: 0,
      fetchedAt: new Date().toISOString(),
      error: message,
    };
  }
}

Add a third unified function that auto-detects and routes:

/**
 * Master fetch function. Detects whether the URL is a public CSV
 * or an Apps Script endpoint and calls the appropriate fetcher.
 *
 * @param url - Either a published CSV URL or Apps Script web app URL
 * @returns FetchResult
 */
export async function fetchLeads(url: string): Promise<FetchResult> {
  const type = detectUrlType(url);

  if (type === 'csv') {
    return fetchLeadsFromCsv(url);
  }

  if (type === 'script') {
    return fetchLeadsFromScript(url);
  }

  return {
    leads: [],
    total: 0,
    fetchedAt: new Date().toISOString(),
    error:
      'Unrecognized URL format. Paste either:\n' +
      '• A published CSV URL: docs.google.com/spreadsheets/.../pub?output=csv\n' +
      '• An Apps Script URL: script.google.com/macros/s/.../exec',
  };
}

═══════════════════════════════════════════════
TASK 3 — UPDATE app/enquiries/page.tsx
═══════════════════════════════════════════════
- Replace the import of fetchLeadsFromScript with:
  import { fetchLeads } from '@/lib/services/fetchLeads';
- Replace the import of getSheetScriptUrl with:
  import { getSheetUrl } from '@/lib/config';
- Replace the fetch call with:
  const url = getSheetUrl();
  const result = await fetchLeads(url);
- Everything else stays identical.

═══════════════════════════════════════════════
TASK 4 — UPDATE app/settings/page.tsx
═══════════════════════════════════════════════
1. Change the input label to:
   "Google Sheet URL"

2. Change the placeholder to:
   "Paste a published CSV URL or Apps Script URL"

3. Add helper text below the input (replace existing helper):
   Two options:
   • Public sheet: File → Share → Publish to web → CSV → copy URL
   • Private sheet: use the Apps Script method in docs/google-apps-script.js

4. Add a live URL type indicator that appears as soon as the user
   types or pastes a URL. Show it directly below the helper text:
   - If detectUrlType returns 'csv'    → green badge: "✓ Public CSV URL"
   - If detectUrlType returns 'script' → green badge: "✓ Apps Script URL"  
   - If detectUrlType returns 'unknown' and input is non-empty
                                       → yellow badge: "⚠ Unrecognized URL format"
   - If input is empty                 → show nothing

5. On save, call saveSheetUrl(url) from lib/config.ts.

6. On "Test Connection" button click:
   - Call fetchLeads(url) with the current input value
   - Show a loading spinner on the button while fetching
   - On success: show "✓ Connected — X leads found" in green
   - On error: show the error message from result.error in red
   - Use existing react-hot-toast for the success/error notification
     AND show inline below the button as well

═══════════════════════════════════════════════
TASK 5 — TYPE CHECK
═══════════════════════════════════════════════
Run: npx tsc --noEmit
Fix only errors introduced by changes in this session.

═══════════════════════════════════════════════
FINAL OUTPUT
═══════════════════════════════════════════════
List every file modified or created.
Confirm the old localStorage keys (sheetScriptUrl, sheetCsvUrl)
are still read as fallbacks so existing saved URLs don't break.
};

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      return buildResponse({ error: `Sheet "${CONFIG.SHEET_NAME}" not found` }, 404);
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow < 2) {
      return buildResponse({ leads: [], total: 0, fetchedAt: new Date().toISOString() });
    }

    // Read header row + data rows
    const rowCount = Math.min(lastRow, CONFIG.MAX_ROWS);
    const range = sheet.getRange(1, 1, rowCount, lastCol);
    const values = range.getValues();
    
    const headers = values[0].map(h => String(h).trim());
    const rows = values.slice(1);

    // Convert rows to objects, skip completely empty rows
    const leads = rows
      .filter(row => row.some(cell => cell !== '' && cell !== null))
      .map(row => {
        const lead = {};
        headers.forEach((header, index) => {
          const cell = row[index];
          // Format dates as ISO strings, keep everything else as string
          if (cell instanceof Date) {
            lead[header] = cell.toISOString();
          } else {
            lead[header] = cell !== null && cell !== undefined 
              ? String(cell).trim() 
              : '';
          }
        });
        return lead;
      });

    return buildResponse({
      leads,
      total: leads.length,
      sheetName: CONFIG.SHEET_NAME,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return buildResponse({ error: error.message }, 500);
  }
}

// Builds a CORS-enabled JSON response
function buildResponse(data, statusCode) {
  const payload = JSON.stringify(data);
  const output = ContentService.createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// Test this function manually inside Apps Script editor
// before deploying — click Run → testFetch to verify it works
function testFetch() {
  const result = doGet({});
  Logger.log(result.getContent());
}
