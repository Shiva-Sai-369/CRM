/**
 * Global CRM configuration
 */
export const CONFIG = {
  refreshIntervalMs: 0,
};

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
export function detectUrlType(url: string): 'csv' | 'script' | 'unknown' {
  if (!url) return 'unknown';
  
  // Check for CSV URL formats
  if (url.includes('docs.google.com/spreadsheets')) {
    // CSV export format
    if (url.includes('output=csv')) {
      return 'csv';
    }
    // Pub format (can be CSV or HTML)
    if (url.includes('/pub')) {
      // Check if it's HTML format
      if (url.includes('/pubhtml')) {
        return 'unknown'; // HTML format not supported
      }
      return 'csv'; // Assume CSV for /pub URLs
    }
  }
  
  if (url.includes('script.google.com/macros/s/')) {
    return 'script';
  }
  
  return 'unknown';
}
