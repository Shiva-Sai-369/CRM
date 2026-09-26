// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type LeadRow = Record<string, unknown>;

const state = vi.hoisted(() => ({
  csv: "",
  inserted: [] as LeadRow[][],
  tables: [] as string[],
  existing: [] as { email: string | null; phone: string | null }[],
}));

vi.mock("@/lib/googleSheets", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/googleSheets")>()),
  fetchPublishedSheetCsv: async () => state.csv,
}));

/** Minimal chainable stand-in for the Supabase query builder; records inserts into sheet_leads. */
vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
    from(table: string) {
      state.tables.push(table);
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      builder.select = chain;
      builder.eq = chain;
      builder.update = chain;
      builder.maybeSingle = async () => ({ data: { id: 1 } });
      builder.single = async () => ({ data: { id: 7 }, error: null });
      builder.insert = (rows: LeadRow[]) => {
        if (table === "sheet_leads") state.inserted.push(rows);
        return { select: chain, single: builder.single, error: null };
      };
      // `await supabase.from("sheet_leads").select().eq()` resolves to the existing leads.
      builder.then = (resolve: (value: unknown) => void) =>
        resolve({ data: table === "sheet_leads" ? state.existing : null, error: null });
      return builder;
    },
  }),
}));

import { POST } from "@/app/api/sync-sheet-to-supabase/route";

function sync() {
  return POST(
    new NextRequest("http://localhost/api/sync-sheet-to-supabase", {
      method: "POST",
      body: JSON.stringify({
        sheetUrl: "https://docs.google.com/spreadsheets/d/e/x/pub?output=csv",
        projectId: 1,
        sheetName: "Test sheet",
      }),
    })
  );
}

beforeEach(() => {
  state.csv = "";
  state.inserted = [];
  state.tables = [];
  state.existing = [];
});

describe("POST /api/sync-sheet-to-supabase", () => {
  it("maps header aliases onto lead fields", async () => {
    state.csv = [
      "Contact Name,E-mail,Phone No,Organisation,Created At,Lead Status,Budget",
      "Asha,ASHA@x.com,p:+919999999999,Acme,2026-01-02,Hot,5k",
    ].join("\n");

    const res = await sync();

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ insertedRows: 1, duplicates: 0, emptyRows: 0 });
    expect(state.inserted[0][0]).toMatchObject({
      name: "Asha",
      email: "asha@x.com",
      phone: "+919999999999",
      company: "Acme",
      status: "hot",
      created_at: "2026-01-02",
    });
  });

  it("builds leads from Facebook field_data and skips rows whose field_data can't be parsed", async () => {
    const fieldData = JSON.stringify([
      { name: "full_name", values: ["Fb Person"] },
      { name: "email", values: ["FB@X.com"] },
      { name: "phone_number", values: ["p:+911111111111"] },
    ]).replace(/"/g, '""');
    state.csv = [
      "id,created_time,field_data",
      `1,2026-02-03T00:00:00Z,"${fieldData}"`,
      "2,2026-02-03T00:00:00Z,not json",
    ].join("\n");

    const res = await sync();

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ insertedRows: 1, emptyRows: 1 });
    expect(state.inserted[0]).toHaveLength(1);
    expect(state.inserted[0][0]).toMatchObject({
      name: "Fb Person",
      email: "fb@x.com",
      phone: "+911111111111",
      status: "new",
      created_at: "2026-02-03T00:00:00Z",
    });
  });

  it("skips leads whose email or phone already exists in the sheet", async () => {
    state.existing = [
      { email: "known@x.com", phone: null },
      { email: null, phone: "+919999999999" },
    ];
    state.csv = [
      "Name,Email,Mobile",
      "Known,KNOWN@x.com,",
      "Same phone,,p:+919999999999",
      "New person,new@x.com,+918888888888",
    ].join("\n");

    const res = await sync();

    expect(await res.json()).toMatchObject({ insertedRows: 1, duplicates: 2 });
    expect(state.inserted[0]).toHaveLength(1);
    expect(state.inserted[0][0]).toMatchObject({ name: "New person" });
  });

  it("skips rows with no name, email or phone", async () => {
    state.csv = ["Name,Email,Phone", "Asha,asha@x.com,", ",,"].join("\n");

    const res = await sync();

    expect(await res.json()).toMatchObject({ insertedRows: 1, emptyRows: 1 });
  });

  it("rejects a sheet with no usable columns with a 400 listing what it found, and writes nothing", async () => {
    state.csv = "Customer,Query\nAsha,hello";

    const res = await sync();
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('Columns we found: "Customer", "Query"');
    expect(state.tables).not.toContain("google_sheets");
    expect(state.inserted).toEqual([]);
  });
});
