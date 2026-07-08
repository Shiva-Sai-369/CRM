/**
 * Represents a single sheet tab with a name and CSV URL.
 */
export interface SheetTab {
  id: string;        // uuid generated on creation
  name: string;      // user-defined label e.g. "Nizampet Leads"
  url: string;       // published Google Sheet CSV URL
  addedAt: string;   // ISO timestamp
}

export const CONFIG = {
  refreshIntervalMs: 0,
};

const STORAGE_KEY = 'sheetTabs';

/**
 * Returns all saved sheet tabs from localStorage.
 * Falls back to migrating the old single URL if present.
 */
export function getSheetTabs(): SheetTab[] {
  if (typeof window === 'undefined') return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as SheetTab[];
    } catch {
      return [];
    }
  }

  // Migrate old single URL to new format automatically
  const oldUrl =
    localStorage.getItem('sheetDBUrl') ||
    localStorage.getItem('sheetUrl') ||
    localStorage.getItem('sheetScriptUrl') ||
    localStorage.getItem('sheetCsvUrl') ||
    '';

  if (oldUrl) {
    const migrated: SheetTab[] = [
      {
        id: crypto.randomUUID(),
        name: 'Sheet 1',
        url: oldUrl,
        addedAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  }

  return [];
}

/**
 * Saves a new tab. If a tab with the same URL already exists,
 * updates its name instead of duplicating.
 */
export function saveSheetTab(tab: Omit<SheetTab, 'id' | 'addedAt'>): SheetTab {
  const tabs = getSheetTabs();
  const existing = tabs.find(t => t.url === tab.url);

  if (existing) {
    existing.name = tab.name;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
    return existing;
  }

  const newTab: SheetTab = {
    id: crypto.randomUUID(),
    name: tab.name,
    url: tab.url,
    addedAt: new Date().toISOString(),
  };

  tabs.push(newTab);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  return newTab;
}

/**
 * Deletes a sheet tab by its id.
 */
export function deleteSheetTab(id: string): void {
  if (typeof window === 'undefined') return;
  const tabs = getSheetTabs().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
}

/**
 * Updates the name of an existing tab by id.
 */
export function renameSheetTab(id: string, newName: string): void {
  if (typeof window === 'undefined') return;
  const tabs = getSheetTabs().map(t =>
    t.id === id ? { ...t, name: newName } : t
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
}

/**
 * Returns true if URL looks like a Google Sheets published CSV.
 */
export function isValidCsvUrl(url: string): boolean {
  return (
    url.includes('docs.google.com/spreadsheets') &&
    (url.includes('output=csv') || url.includes('/pub'))
  );
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

/**
 * Extracts the Sheet ID from a full Google Sheets URL.
 * Also accepts a raw Sheet ID passed directly.
 *
 * Handles:
 *   https://docs.google.com/spreadsheets/d/SHEET_ID/edit
 *   https://docs.google.com/spreadsheets/d/SHEET_ID/pub
 *   SHEET_ID (raw string, 20+ alphanumeric chars)
 *
 * @param input - full Sheets URL or raw Sheet ID
 * @returns extracted Sheet ID or null if unrecognized
 */
export function extractSheetId(input: string): string | null {
  if (!input?.trim()) return null;
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) return input.trim();
  return null;
}

/**
 * Builds a published CSV URL for a specific tab using
 * the Sheet ID and the tab's numeric gid.
 *
 * @param sheetId - Google Sheet ID
 * @param gid - numeric gid of the tab
 * @returns full published CSV URL string
 */
export function buildCsvUrl(sheetId: string, gid: number): string {
  return (
    `https://docs.google.com/spreadsheets/d/${sheetId}` +
    `/pub?gid=${gid}&single=true&output=csv`
  );
}

/**
 * Persists the last used public Sheet ID to localStorage
 * so it reappears when the user returns to Settings.
 */
export function savePublicSheetId(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('publicSheetId', id);
  }
}

/** Returns the last used public Sheet ID from localStorage. */
export function getPublicSheetId(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('publicSheetId') || '';
  }
  return '';
}