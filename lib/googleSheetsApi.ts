/**
 * Google Sheets API integration for fetching private sheet data
 */

import { parseLeadsFromCsv, type Lead } from "./parseLeads";

/**
 * Extract spreadsheet ID from Google Sheets URL
 * @param url - Google Sheets URL
 * @returns Spreadsheet ID or null
 */
function extractSpreadsheetId(url: string): string | null {
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Fetch data from Google Sheet using API key
 * @param spreadsheetId - Google Spreadsheet ID
 * @param range - Sheet range (e.g., "Sheet1!A1:Z1000")
 * @param apiKey - Google API key
 * @returns Array of Lead objects
 */
export async function fetchFromGoogleSheetsApi(
  spreadsheetId: string,
  range: string,
  apiKey: string
): Promise<Lead[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to fetch from Google Sheets API: ${response.statusText}`
    );
  }

  const data = await response.json();

  if (!data.values || data.values.length === 0) {
    return [];
  }

  // Convert to CSV format
  const csvData = data.values
    .map((row: string[]) => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return parseLeadsFromCsv(csvData);
}

/**
 * Fetch leads from Google Sheet URL or API
 * @param urlOrId - Google Sheets URL or Spreadsheet ID
 * @param apiKey - Optional Google API key for private sheets
 * @param range - Optional sheet range (defaults to "Sheet1!A1:Z1000")
 * @returns Array of Lead objects
 */
export async function fetchLeadsFromGoogleSheet(
  urlOrId: string,
  apiKey?: string,
  range: string = "Sheet1!A1:Z1000"
): Promise<Lead[]> {
  // If it's a CSV URL, fetch directly
  if (urlOrId.includes("/pub?") || urlOrId.includes("output=csv")) {
    const response = await fetch(urlOrId);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    const csvData = await response.text();
    const { parseLeadsFromCsv } = await import("./parseLeads");
    return parseLeadsFromCsv(csvData);
  }

  // Extract spreadsheet ID
  const spreadsheetId = extractSpreadsheetId(urlOrId) || urlOrId;

  // If API key is provided, use API
  if (apiKey) {
    return fetchFromGoogleSheetsApi(spreadsheetId, range, apiKey);
  }

  // Try to construct published CSV URL
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  const response = await fetch(csvUrl);

  if (!response.ok) {
    throw new Error(
      "Unable to fetch sheet. Please either:\n1. Publish the sheet as CSV (File → Share → Publish to web), or\n2. Provide a Google API key in Settings"
    );
  }

  const csvData = await response.text();
  const { parseLeadsFromCsv } = await import("./parseLeads");
  return parseLeadsFromCsv(csvData);
}
