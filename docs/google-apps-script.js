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
  MAX_ROWS: 2000,
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