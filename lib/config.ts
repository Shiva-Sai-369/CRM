/**
 * Get the CSV URL from localStorage or use default
 * @returns CSV URL string
 */
export function getSheetCsvUrl(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("sheetCsvUrl") || "PASTE_YOUR_CSV_URL_HERE";
  }
  return "PASTE_YOUR_CSV_URL_HERE";
}

export const CONFIG = {
  refreshIntervalMs: 0,
};
