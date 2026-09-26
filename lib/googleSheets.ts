import { GOOGLE_SHEETS } from "@/lib/constants";

/** A problem with the sheet link or with fetching it; the message is safe to show to the user. */
export class SheetFetchError extends Error {}

function parseHttpsUrl(value: string, base?: URL): URL | null {
  try {
    const url = new URL(value, base);
    const isPlainHttps = url.protocol === "https:" && url.port === "" && !url.username && !url.password;
    return isPlainHttps ? url : null;
  } catch {
    return null;
  }
}

/**
 * True only for a published-to-web CSV link on docs.google.com, e.g.
 *   https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv
 *   https://docs.google.com/spreadsheets/d/<id>/pub?gid=0&single=true&output=csv
 * Anything else (other hosts, http, credentials, ports, other paths, /pubhtml) is rejected.
 */
export function isPublishedSheetCsvUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const url = parseHttpsUrl(value);
  return (
    url !== null &&
    url.hostname === GOOGLE_SHEETS.HOST &&
    GOOGLE_SHEETS.PUBLISHED_PATH.test(url.pathname) &&
    url.searchParams.get("output") === "csv"
  );
}

function isAllowedRedirectTarget(url: URL): boolean {
  return (
    url.hostname === GOOGLE_SHEETS.HOST || url.hostname.endsWith(GOOGLE_SHEETS.REDIRECT_HOST_SUFFIX)
  );
}

/**
 * Fetches a published sheet as CSV text. Redirects are followed by hand (at most MAX_REDIRECTS) and every
 * hop must stay on docs.google.com or *.googleusercontent.com, so a redirect can't be used to reach
 * another host. Throws SheetFetchError for anything the caller should report to the user.
 */
export async function fetchPublishedSheetCsv(sheetUrl: string): Promise<string> {
  if (!isPublishedSheetCsvUrl(sheetUrl)) {
    throw new SheetFetchError(
      "Invalid Google Sheets CSV URL. Use the link from File → Share → Publish to web → CSV (docs.google.com)."
    );
  }

  let current = new URL(sheetUrl);

  for (let hop = 0; hop <= GOOGLE_SHEETS.MAX_REDIRECTS; hop++) {
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(GOOGLE_SHEETS.FETCH_TIMEOUT_MS),
      });
    } catch {
      throw new SheetFetchError("Could not reach Google Sheets. Please try again.");
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const next = location ? parseHttpsUrl(location, current) : null;
      if (!next || !isAllowedRedirectTarget(next)) {
        throw new SheetFetchError(
          "Google did not return the sheet. Make sure it is published to the web as CSV."
        );
      }
      current = next;
      continue;
    }

    if (!response.ok) {
      throw new SheetFetchError(`Failed to fetch sheet data: ${response.statusText || response.status}`);
    }
    return response.text();
  }

  throw new SheetFetchError("Google sent too many redirects while fetching the sheet.");
}
