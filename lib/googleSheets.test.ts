import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublishedSheetCsv, isPublishedSheetCsvUrl, SheetFetchError } from "@/lib/googleSheets";

const PUBLISHED = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQabc_DEF-123/pub?output=csv";
const PUBLISHED_TAB = "https://docs.google.com/spreadsheets/d/1AbC_def-GHI/pub?gid=42&single=true&output=csv";

describe("isPublishedSheetCsvUrl", () => {
  it("accepts published CSV links", () => {
    expect(isPublishedSheetCsvUrl(PUBLISHED)).toBe(true);
    expect(isPublishedSheetCsvUrl(PUBLISHED_TAB)).toBe(true);
  });

  it.each([
    ["other host with /pub", "https://evil.example/spreadsheets/d/x/pub?output=csv"],
    ["docs.google.com as a path segment", "https://evil.example/docs.google.com/spreadsheets/d/x/pub?output=csv"],
    ["docs.google.com as a subdomain prefix", "https://docs.google.com.evil.example/spreadsheets/d/x/pub?output=csv"],
    ["userinfo trick", "https://docs.google.com@evil.example/spreadsheets/d/x/pub?output=csv"],
    ["cloud metadata endpoint", "http://169.254.169.254/latest/meta-data/pub?output=csv"],
    ["plain http", "http://docs.google.com/spreadsheets/d/x/pub?output=csv"],
    ["explicit port", "https://docs.google.com:8443/spreadsheets/d/x/pub?output=csv"],
    ["credentials", "https://user:pw@docs.google.com/spreadsheets/d/x/pub?output=csv"],
    ["pubhtml", "https://docs.google.com/spreadsheets/d/x/pubhtml?output=csv"],
    ["path traversal", "https://docs.google.com/spreadsheets/d/../../evil/pub?output=csv"],
    ["not csv", "https://docs.google.com/spreadsheets/d/x/pub?output=html"],
    ["missing output", "https://docs.google.com/spreadsheets/d/x/pub"],
    ["other google path", "https://docs.google.com/document/d/x/pub?output=csv"],
    ["garbage", "not a url"],
    ["empty", ""],
  ])("rejects %s", (_label, url) => {
    expect(isPublishedSheetCsvUrl(url)).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isPublishedSheetCsvUrl(undefined)).toBe(false);
    expect(isPublishedSheetCsvUrl(null)).toBe(false);
    expect(isPublishedSheetCsvUrl({ toString: () => PUBLISHED })).toBe(false);
  });
});

describe("fetchPublishedSheetCsv", () => {
  afterEach(() => vi.unstubAllGlobals());

  const redirect = (to: string) => new Response(null, { status: 307, headers: { location: to } });

  it("never calls fetch for a disallowed URL", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchPublishedSheetCsv("http://169.254.169.254/pub?output=csv")).rejects.toBeInstanceOf(SheetFetchError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("follows Google's redirect to googleusercontent.com and returns the CSV", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect("https://doc-0c-8g-sheets.googleusercontent.com/pub/abc/csv"))
      .mockResolvedValueOnce(new Response("Name,Email\nA,a@x.com\n", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPublishedSheetCsv(PUBLISHED)).resolves.toBe("Name,Email\nA,a@x.com\n");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toBe(PUBLISHED);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
  });

  it.each([
    ["internal host", "http://169.254.169.254/latest/meta-data/"],
    ["https internal host", "https://internal.corp.local/secret"],
    ["look-alike googleusercontent host", "https://evilgoogleusercontent.com/x"],
    ["Google login page", "https://accounts.google.com/ServiceLogin"],
  ])("refuses a redirect to %s", async (_label, target) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(redirect(target));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchPublishedSheetCsv(PUBLISHED)).rejects.toBeInstanceOf(SheetFetchError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after too many redirects", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => redirect("https://docs.google.com/spreadsheets/d/e/x/pub?output=csv"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchPublishedSheetCsv(PUBLISHED)).rejects.toThrow(/too many redirects/i);
  });

  it("reports HTTP errors and network failures as SheetFetchError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("nope", { status: 404, statusText: "Not Found" })));
    await expect(fetchPublishedSheetCsv(PUBLISHED)).rejects.toThrow(/Not Found/);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")));
    await expect(fetchPublishedSheetCsv(PUBLISHED)).rejects.toBeInstanceOf(SheetFetchError);
  });
});
