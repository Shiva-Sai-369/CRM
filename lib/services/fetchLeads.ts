import { parseLeadsFromCsv, type Lead } from '@/lib/parseLeads';
import { detectUrlType } from '@/lib/config';

interface ScriptResponse {
  leads: Record<string, string>[];
  total: number;
  sheetName: string;
  fetchedAt: string;
  error?: string;
}

interface FetchResult {
  leads: Lead[];
  total: number;
  fetchedAt: string;
  error: string | null;
}

/**
 * Converts a flat object from Apps Script into a CSV row string
 * so existing parseLeadsFromCsv() can handle it without changes
 * @param rows - raw row objects from Apps Script
 * @returns CSV string with header row
 */
function rowsToCsv(rows: Record<string, string>[]): string {
  if (rows.length === 0) return '';
  
  const headers = Object.keys(rows[0]);
  const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
  const dataRows = rows.map(row => 
    headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Fetches leads from the Google Apps Script web app proxy.
 * The script returns JSON — we convert it to CSV internally
 * so the existing parseLeadsFromCsv logic stays unchanged.
 *
 * @param scriptUrl - The deployed Apps Script web app URL
 * @returns FetchResult with leads array, total count, and error if any
 */
export async function fetchLeadsFromScript(scriptUrl: string): Promise<FetchResult> {
  if (!scriptUrl || scriptUrl.trim() === '') {
    return {
      leads: [],
      total: 0,
      fetchedAt: new Date().toISOString(),
      error: 'No Apps Script URL configured. Go to Settings to add it.',
    };
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Script returned ${response.status}: ${response.statusText}`);
    }

    const json: ScriptResponse = await response.json();

    if (json.error) {
      throw new Error(`Apps Script error: ${json.error}`);
    }

    if (!json.leads || !Array.isArray(json.leads)) {
      throw new Error('Invalid response format from Apps Script');
    }

    // Convert rows to CSV format
    const csvString = rowsToCsv(json.leads);
    
    // Parse using existing CSV parser
    const leads = parseLeadsFromCsv(csvString);

    return {
      leads,
      total: leads.length,
      fetchedAt: json.fetchedAt,
      error: null,
    };
  } catch (error) {
    console.error('Failed to fetch from Apps Script:', error);
    return {
      leads: [],
      total: 0,
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Fetches leads from a public Google Sheet published as CSV.
 * The sheet must be published via File → Share → Publish to web → CSV.
 *
 * @param csvUrl - The published CSV URL from Google Sheets
 * @returns FetchResult with leads array and error if any
 */
export async function fetchLeadsFromCsv(csvUrl: string): Promise<FetchResult> {
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
      throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();

    if (!csvText || csvText.trim() === '') {
      throw new Error('Sheet returned empty data. Make sure it is published as CSV.');
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

  // Check for HTML format specifically
  if (url.includes('/pubhtml')) {
    return {
      leads: [],
      total: 0,
      fetchedAt: new Date().toISOString(),
      error:
        'HTML format detected. Please use CSV format instead:\n' +
        '1. Open your Google Sheet\n' +
        '2. Click File → Share → Publish to web\n' +
        '3. Select "Comma-separated values (.csv)"\n' +
        '4. Click Publish and copy the CSV URL\n' +
        'Format should be: docs.google.com/spreadsheets/.../pub?output=csv',
    };
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

import type { SheetTab } from '@/lib/config';

/**
 * Fetches leads from a single SheetTab.
 * Tags each lead with sheetTab name for display in the table.
 *
 * @param tab - SheetTab object with name and url
 * @returns FetchResult with leads tagged with sheetTab field
 */
export async function fetchLeadsFromTab(tab: SheetTab): Promise<FetchResult> {
  const result = await fetchLeadsFromCsv(tab.url);
  return {
    ...result,
    leads: result.leads.map(lead => ({
      ...lead,
      sheetTab: tab.name,
    })),
  };
}

/**
 * Fetches leads from multiple SheetTabs in parallel.
 * Merges all results into a single leads array.
 * If a tab fails, its error is logged but others still load.
 *
 * @param tabs - Array of SheetTab objects to fetch
 * @returns FetchResult with merged leads from all tabs
 */
export async function fetchLeadsFromMultipleTabs(
  tabs: SheetTab[]
): Promise<FetchResult> {
  if (tabs.length === 0) {
    return {
      leads: [],
      total: 0,
      fetchedAt: new Date().toISOString(),
      error: 'No sheet tabs configured. Go to Settings to add one.',
    };
  }

  const results = await Promise.allSettled(
    tabs.map(tab => fetchLeadsFromTab(tab))
  );

  const allLeads: FetchResult['leads'] = [];
  const errors: string[] = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      if (result.value.error) {
        errors.push(`"${tabs[i].name}": ${result.value.error}`);
      } else {
        allLeads.push(...result.value.leads);
      }
    } else {
      errors.push(`"${tabs[i].name}": ${result.reason}`);
    }
  });

  return {
    leads: allLeads,
    total: allLeads.length,
    fetchedAt: new Date().toISOString(),
    error:
      errors.length > 0
        ? `Some tabs failed to load: ${errors.join(' | ')}`
        : null,
  };
}