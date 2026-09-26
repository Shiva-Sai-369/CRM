import {
  SHEET_FIELDS,
  SHEET_FIELD_ALIASES,
  SHEET_FIELD_DATA_HEADER,
  SHEET_FIELD_LABELS,
  SHEET_IDENTITY_FIELDS,
  SHEET_KNOWN_EXTRA_HEADERS,
  SHEET_MESSAGE_MAX_COLUMNS,
  type SheetField,
} from "@/lib/constants";

/**
 * Shared header matching for Google Sheets, used by the Supabase sync and by the in-app preview /
 * connection test so a sheet is understood identically in both places.
 *
 * Pure functions only: callers decide what to log and which HTTP status or toast to use.
 */

export interface SheetColumnMapping {
  /** For each field, the sheet's own header spellings that map to it, in sheet order. */
  columns: Record<SheetField, string[]>;
  /** Fields that have at least one column. */
  matchedFields: SheetField[];
  /** Non-empty headers that matched no field, in sheet order, original spelling. */
  unmappedColumns: string[];
  /** The sheet has a Facebook Lead Ads `field_data` JSON column (it carries name/email/phone). */
  hasFieldData: boolean;
  /** The sheet's own spelling of the `field_data` header, or null when there is none. */
  fieldDataHeader: string | null;
}

/** One lead's values for every mapped field; "" where the sheet has nothing. */
export type LeadFields = Record<SheetField, string>;

/** Case-, whitespace- and punctuation-insensitive form of a header. Keeps letters/digits of any script. */
function normalizeHeader(header: string): string {
  return header
    .normalize("NFKC")
    .replace(/^﻿/, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

const FIELD_BY_ALIAS: ReadonlyMap<string, SheetField> = new Map(
  SHEET_FIELDS.flatMap((field) =>
    SHEET_FIELD_ALIASES[field].map((alias): [string, SheetField] => [normalizeHeader(alias), field])
  )
);

const FIELD_DATA_KEY = normalizeHeader(SHEET_FIELD_DATA_HEADER);

const KNOWN_EXTRA_KEYS: ReadonlySet<string> = new Set(SHEET_KNOWN_EXTRA_HEADERS.map(normalizeHeader));

function emptyColumns(): Record<SheetField, string[]> {
  return { name: [], email: [], phone: [], status: [], date: [], company: [] };
}

function emptyFields(): LeadFields {
  return { name: "", email: "", phone: "", status: "", date: "", company: "" };
}

export function mapSheetColumns(headers: readonly string[]): SheetColumnMapping {
  const columns = emptyColumns();
  const unmappedColumns: string[] = [];
  let fieldDataHeader: string | null = null;

  for (const header of headers) {
    const key = normalizeHeader(header);
    if (key === "") continue; // blank header cells aren't worth reporting

    const field = FIELD_BY_ALIAS.get(key);
    if (field) {
      columns[field].push(header);
    } else if (key === FIELD_DATA_KEY) {
      fieldDataHeader ??= header;
    } else if (!KNOWN_EXTRA_KEYS.has(key)) {
      unmappedColumns.push(header);
    }
  }

  return {
    columns,
    matchedFields: SHEET_FIELDS.filter((field) => columns[field].length > 0),
    unmappedColumns,
    hasFieldData: fieldDataHeader !== null,
    fieldDataHeader,
  };
}

/**
 * Value of a field for one row: the first non-empty, trimmed value among the columns mapped to it
 * (sheet order). Returns "" when the field has no column or every mapped cell is blank.
 */
export function readField(
  row: Readonly<Record<string, unknown>>,
  mapping: SheetColumnMapping,
  field: SheetField
): string {
  for (const header of mapping.columns[field]) {
    const value = row[header];
    const text = value === null || value === undefined ? "" : String(value).trim();
    if (text !== "") return text;
  }
  return "";
}

/**
 * Parses a Facebook Lead Ads `field_data` cell, e.g.
 *   [{"name":"full_name","values":["John Doe"]},{"name":"email","values":["x@y.com"]}]
 * into { full_name: "John Doe", email: "x@y.com" }. Returns null when the cell isn't that shape.
 */
export function parseFieldData(raw: unknown): Record<string, string> | null {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed)) return null;

  const flat: Record<string, string> = {};
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const { name, values } = item as { name?: unknown; values?: unknown };
    if (typeof name !== "string" || name === "") continue;
    const first = Array.isArray(values) ? values[0] : values;
    flat[name] = first === null || first === undefined ? "" : String(first).trim();
  }
  return flat;
}

/** Facebook exports prefix phone numbers with "p:" (e.g. "p:+918367630604"). */
function cleanPhone(value: string): string {
  return value.replace(/^p:/i, "").trim();
}

/**
 * Every mapped field for one row. Plain columns win; blanks are filled from the row's `field_data`
 * answers, whose question names go through the same alias table ("full_name", "phone_number", ...).
 */
export function readLeadFields(row: Readonly<Record<string, unknown>>, mapping: SheetColumnMapping): LeadFields {
  const answers = mapping.fieldDataHeader === null ? null : parseFieldData(row[mapping.fieldDataHeader]);
  const fromAnswers: Partial<Record<SheetField, string>> = {};
  for (const [question, answer] of Object.entries(answers ?? {})) {
    const field = FIELD_BY_ALIAS.get(normalizeHeader(question));
    if (field && answer !== "" && fromAnswers[field] === undefined) fromAnswers[field] = answer;
  }

  const fields = emptyFields();
  for (const field of SHEET_FIELDS) {
    fields[field] = readField(row, mapping, field) || fromAnswers[field] || "";
  }
  fields.phone = cleanPhone(fields.phone);
  return fields;
}

/** True when the sheet has something a lead can be built from (a name/email/phone column or field_data). */
export function hasIdentityColumns(mapping: SheetColumnMapping): boolean {
  return mapping.hasFieldData || SHEET_IDENTITY_FIELDS.some((field) => mapping.columns[field].length > 0);
}

function quotedList(names: readonly string[]): string {
  const shown = names.slice(0, SHEET_MESSAGE_MAX_COLUMNS).map((name) => `"${name}"`);
  const more = names.length - shown.length;
  return more > 0 ? `${shown.join(", ")} and ${more} more` : shown.join(", ");
}

/**
 * Error to show when the sheet can't produce leads, or null when it can. `allHeaders` is the sheet's
 * full header row, so the message can tell the user what we did see.
 */
export function getMissingColumnsMessage(
  mapping: SheetColumnMapping,
  allHeaders: readonly string[]
): string | null {
  if (hasIdentityColumns(mapping)) return null;

  const seen = allHeaders.map((header) => header.trim()).filter((header) => header !== "");
  const found = seen.length > 0 ? quotedList(seen) : "none (the first row looks empty)";
  return (
    `We couldn't find a name, email or phone column in this sheet. ` +
    `Column headers must be in the first row and look like "Name", "Email" or "Phone" ` +
    `(for example "Full Name", "E-mail" or "Mobile"). ` +
    `Columns we found: ${found}. Rename the headers to match and sync again.`
  );
}

/** Note about headers that were not mapped to a field, or null when there are none. */
export function getUnmappedColumnsNote(mapping: SheetColumnMapping): string | null {
  if (mapping.unmappedColumns.length === 0) return null;
  return (
    `Columns not recognised: ${quotedList(mapping.unmappedColumns)} ` +
    `(their values are kept in the lead's raw data).`
  );
}

/** "Recognised: Name, Email, Phone" for connection tests and previews. */
export function getRecognisedColumnsSummary(mapping: SheetColumnMapping): string {
  const labels = mapping.matchedFields.map((field) => SHEET_FIELD_LABELS[field]);
  if (mapping.hasFieldData) labels.push("Facebook form answers");
  return labels.length > 0 ? `Recognised: ${labels.join(", ")}.` : "No recognised columns.";
}

/**
 * Outcome of Settings → Test Connection: a failure carrying the missing-columns message, or a success
 * that says how many leads were read plus which columns were and weren't recognised.
 */
export function getConnectionTestSummary(
  mapping: SheetColumnMapping,
  allHeaders: readonly string[],
  leadCount: number
): { success: boolean; message: string } {
  const missing = getMissingColumnsMessage(mapping, allHeaders);
  if (missing) return { success: false, message: missing };

  const lines = [`Connected — ${leadCount} leads found.`, getRecognisedColumnsSummary(mapping)];
  const unmapped = getUnmappedColumnsNote(mapping);
  if (unmapped) lines.push(unmapped);
  return { success: true, message: lines.join("\n") };
}
