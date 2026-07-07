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