import { describe, expect, it } from "vitest";
import { SHEET_FIELDS, SHEET_FIELD_ALIASES, SHEET_KNOWN_EXTRA_HEADERS, type SheetField } from "@/lib/constants";
import {
  getConnectionTestSummary,
  getMissingColumnsMessage,
  getRecognisedColumnsSummary,
  getUnmappedColumnsNote,
  hasIdentityColumns,
  mapSheetColumns,
  parseFieldData,
  readField,
  readLeadFields,
} from "@/lib/sheetColumns";

describe("mapSheetColumns: every accepted variant", () => {
  const cases = SHEET_FIELDS.flatMap((field) => SHEET_FIELD_ALIASES[field].map((alias) => [field, alias] as const));

  it.each(cases)("%s <- %j", (field, alias) => {
    const mapping = mapSheetColumns([alias]);
    expect(mapping.columns[field]).toEqual([alias]);
    expect(mapping.unmappedColumns).toEqual([]);
  });

  it.each(cases)("%s <- %j regardless of case, spacing and punctuation", (field, alias) => {
    const messy = [`  ${alias.toUpperCase()}  `, alias.replace(/[ _-]/g, "  "), alias.replace(/[ _-]/g, "_")];
    for (const header of messy) {
      expect(mapSheetColumns([header]).columns[field]).toEqual([header]);
    }
  });

  it("has no alias claimed by two different fields", () => {
    // "full_name" and "full name" collapse to one key; that's fine within a field, a bug across fields.
    const seen = new Map<string, SheetField>();
    for (const [field, alias] of cases) {
      const key = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
      const owner = seen.get(key);
      expect(owner === undefined || owner === field, `"${alias}" is listed under both ${owner} and ${field}`).toBe(true);
      seen.set(key, field);
    }
  });
});

describe("mapSheetColumns: edge cases", () => {
  it("handles a BOM on the first header", () => {
    expect(mapSheetColumns(["﻿Name", "Email"]).matchedFields).toEqual(["name", "email"]);
  });

  it("keeps original spelling and sheet order, and lists unmapped columns", () => {
    const mapping = mapSheetColumns(["Budget", " Full Name ", "Comments", "PHONE NUMBER"]);
    expect(mapping.columns.name).toEqual([" Full Name "]);
    expect(mapping.columns.phone).toEqual(["PHONE NUMBER"]);
    expect(mapping.unmappedColumns).toEqual(["Budget", "Comments"]);
  });

  it("does not match near-misses", () => {
    const mapping = mapSheetColumns(["First Name", "Names", "Email Verified", "Date of Birth", "Phone 2"]);
    expect(mapping.matchedFields).toEqual([]);
    expect(mapping.unmappedColumns).toHaveLength(5);
  });

  it.each(SHEET_KNOWN_EXTRA_HEADERS)("does not report parseLeads' own column %j as unrecognised", (header) => {
    const mapping = mapSheetColumns([header, header.toUpperCase(), "Budget"]);
    expect(mapping.unmappedColumns).toEqual(["Budget"]);
    expect(mapping.matchedFields).toEqual([]);
  });

  it("ignores blank header cells", () => {
    expect(mapSheetColumns(["", "   ", "Name"]).unmappedColumns).toEqual([]);
  });

  it("does not collapse non-Latin headers into a match", () => {
    expect(mapSheetColumns(["नाम", "ईमेल"]).matchedFields).toEqual([]);
  });

  it("collects several columns for one field in sheet order", () => {
    expect(mapSheetColumns(["Full Name", "Email", "Name"]).columns.name).toEqual(["Full Name", "Name"]);
  });

  it("recognises Facebook field_data without counting it as unmapped", () => {
    const mapping = mapSheetColumns(["id", "created_time", "Field_Data"]);
    expect(mapping.hasFieldData).toBe(true);
    expect(mapping.columns.date).toEqual(["created_time"]);
    expect(mapping.unmappedColumns).toEqual(["id"]);
  });
});

describe("readField", () => {
  const mapping = mapSheetColumns(["Full Name", "Name", "E-mail"]);

  it("takes the first non-empty mapped cell, trimmed", () => {
    expect(readField({ "Full Name": "  ", Name: " Asha ", "E-mail": "a@x.com" }, mapping, "name")).toBe("Asha");
    expect(readField({ "Full Name": "Ravi", Name: "Asha" }, mapping, "name")).toBe("Ravi");
  });

  it("returns '' for unmapped fields, missing cells and null values", () => {
    expect(readField({}, mapping, "phone")).toBe("");
    expect(readField({ "E-mail": null }, mapping, "email")).toBe("");
  });

  it("stringifies non-string cells", () => {
    expect(readField({ "E-mail": 12345 }, mapping, "email")).toBe("12345");
  });
});

describe("identity check and messages", () => {
  it("requires a name, email or phone column, or field_data", () => {
    expect(hasIdentityColumns(mapSheetColumns(["Timestamp", "Status", "Company"]))).toBe(false);
    expect(hasIdentityColumns(mapSheetColumns(["Mobile"]))).toBe(true);
    expect(hasIdentityColumns(mapSheetColumns(["field_data"]))).toBe(true);
  });

  it("returns no error message when the sheet is usable", () => {
    const headers = ["Name", "Budget"];
    expect(getMissingColumnsMessage(mapSheetColumns(headers), headers)).toBeNull();
  });

  it("lists what it found when nothing usable matched", () => {
    const headers = ["Customer", "Contact", "Query"];
    expect(getMissingColumnsMessage(mapSheetColumns(headers), headers)).toBe(
      `We couldn't find a name, email or phone column in this sheet. ` +
        `Column headers must be in the first row and look like "Name", "Email" or "Phone" ` +
        `(for example "Full Name", "E-mail" or "Mobile"). ` +
        `Columns we found: "Customer", "Contact", "Query". Rename the headers to match and sync again.`
    );
  });

  it("truncates a long header list and handles an empty header row", () => {
    const many = Array.from({ length: 12 }, (_, i) => `Col${i + 1}`);
    expect(getMissingColumnsMessage(mapSheetColumns(many), many)).toContain(`"Col8" and 4 more.`);
    expect(getMissingColumnsMessage(mapSheetColumns([]), [])).toContain("none (the first row looks empty)");
  });

  it("describes unmapped columns and recognised fields", () => {
    const mapping = mapSheetColumns(["Name", "Email", "Budget", "Comments", "field_data"]);
    expect(getUnmappedColumnsNote(mapping)).toBe(
      `Columns not recognised: "Budget", "Comments" (their values are kept in the lead's raw data).`
    );
    expect(getUnmappedColumnsNote(mapSheetColumns(["Name"]))).toBeNull();
    expect(getRecognisedColumnsSummary(mapping)).toBe("Recognised: Name, Email, Facebook form answers.");
    expect(getRecognisedColumnsSummary(mapSheetColumns(["x"]))).toBe("No recognised columns.");
  });
});

describe("parseFieldData", () => {
  it("flattens Facebook answers, trimming and taking the first value", () => {
    const raw = JSON.stringify([
      { name: "full_name", values: [" John Doe "] },
      { name: "email", values: ["x@y.com", "z@y.com"] },
      { name: "city", values: "Pune" },
    ]);
    expect(parseFieldData(raw)).toEqual({ full_name: "John Doe", email: "x@y.com", city: "Pune" });
  });

  it("returns null for anything that isn't an answers array", () => {
    expect(parseFieldData("not json")).toBeNull();
    expect(parseFieldData('{"a":1}')).toBeNull();
    expect(parseFieldData(undefined)).toBeNull();
  });
});

describe("readLeadFields", () => {
  it("reads plain columns through the alias table and strips the Facebook phone prefix", () => {
    const mapping = mapSheetColumns(["Contact Name", "WhatsApp", "Organisation", "Submitted At"]);
    expect(
      readLeadFields(
        { "Contact Name": "Asha", WhatsApp: "p:+918367630604", Organisation: "Acme", "Submitted At": "2026-01-02" },
        mapping
      )
    ).toEqual({ name: "Asha", email: "", phone: "+918367630604", status: "", date: "2026-01-02", company: "Acme" });
  });

  it("fills blanks from field_data, but plain columns win", () => {
    const mapping = mapSheetColumns(["created_time", "Email", "field_data"]);
    const field_data = JSON.stringify([
      { name: "full_name", values: ["Ravi"] },
      { name: "email", values: ["from-data@x.com"] },
      { name: "phone_number", values: ["p:+911111111111"] },
    ]);
    const fields = readLeadFields({ created_time: "t", Email: "plain@x.com", field_data }, mapping);
    expect(fields.name).toBe("Ravi");
    expect(fields.email).toBe("plain@x.com");
    expect(fields.phone).toBe("+911111111111");
    expect(fields.date).toBe("t");
  });

  it("tolerates an unparseable field_data cell", () => {
    const mapping = mapSheetColumns(["Name", "field_data"]);
    expect(readLeadFields({ Name: "Asha", field_data: "{oops" }, mapping).name).toBe("Asha");
  });
});

describe("getConnectionTestSummary", () => {
  it("reports recognised and unrecognised columns on success", () => {
    const headers = ["Name", "Phone no", "Budget"];
    expect(getConnectionTestSummary(mapSheetColumns(headers), headers, 12)).toEqual({
      success: true,
      message:
        "Connected — 12 leads found.\nRecognised: Name, Phone.\n" +
        `Columns not recognised: "Budget" (their values are kept in the lead's raw data).`,
    });
  });

  it("fails with the missing-columns message when nothing usable matched", () => {
    const headers = ["Customer"];
    const result = getConnectionTestSummary(mapSheetColumns(headers), headers, 3);
    expect(result.success).toBe(false);
    expect(result.message).toContain(`Columns we found: "Customer"`);
  });
});
