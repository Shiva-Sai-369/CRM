import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable in process.env.");
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable in process.env.");
}

type LooseDatabase = {
  public: {
    Tables: {
      [tableName: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const isPlaceholder = supabaseUrl.includes("placeholder-url.supabase.co") || supabaseAnonKey.includes("placeholder");

// State for mock database
let mockProjects = [
  { id: 1, name: "Acme Corp Leads", description: "Leads from Acme Corp website", created_at: new Date().toISOString() },
  { id: 2, name: "Retail Campaign", description: "B2C retail campaign leads", created_at: new Date(Date.now() - 86400000).toISOString() }
];

let mockSheets = [
  { id: 10, name: "Website Contact Form", sheet_name: "Form Responses 1", project_id: 1, created_at: new Date().toISOString() },
  { id: 20, name: "FB Ads Leads", sheet_name: "Leads Sheet", project_id: 2, created_at: new Date(Date.now() - 86400000).toISOString() }
];

let mockLeads = [
  { id: 101, sheet_id: 10, name: "John Doe", email: "john@example.com", phone: "+1234567890", company: "Acme", status: "New Lead", notes: "Interested in enterprise plan", created_at: new Date().toISOString() },
  { id: 102, sheet_id: 10, name: "Jane Smith", email: "jane@example.com", phone: "+1987654321", company: "Globex", status: "Contacted", notes: "Wants a demo next week", created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 201, sheet_id: 20, name: "Bob Johnson", email: "bob@example.com", phone: "+1555555555", company: "Facebook Ads", status: "Interested", notes: "Called back, likes pricing", created_at: new Date(Date.now() - 86400000).toISOString() }
];

// Helper to create the query chain
function createMockQueryChain(initialData: any[], tableName: string, isInsert: boolean = false, isUpdate: boolean = false, updatePayload: any = null) {
  let data = [...initialData];
  let filterCol: string | null = null;
  let filterVal: any = null;
  let filterInCols: string | null = null;
  let filterInVals: any[] = [];

  const chain = {
    select(fields?: string) {
      return this;
    },
    eq(column: string, value: any) {
      filterCol = column;
      filterVal = value;
      return this;
    },
    in(column: string, values: any[]) {
      filterInCols = column;
      filterInVals = values;
      return this;
    },
    order(column: string, options?: { ascending: boolean }) {
      const ascending = options?.ascending ?? true;
      data.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];
        if (valA < valB) return ascending ? -1 : 1;
        if (valA > valB) return ascending ? 1 : -1;
        return 0;
      });
      return this;
    },
    single() {
      // Execute the query and return a single record
      let resultData = data;
      if (filterCol) {
        resultData = resultData.filter(item => item[filterCol!] === filterVal);
      }
      if (filterInCols) {
        resultData = resultData.filter(item => filterInVals.includes(item[filterInCols!]));
      }

      if (isUpdate && resultData.length > 0) {
        const item = resultData[0];
        Object.assign(item, updatePayload);
        if (tableName === "sheet_leads") {
          mockLeads = mockLeads.map(l => l.id === item.id ? { ...l, ...updatePayload } : l);
        }
        return Promise.resolve({ data: item, error: null });
      }

      return Promise.resolve({ data: resultData[0] || null, error: null });
    },
    then(onfulfilled?: (value: any) => any) {
      let resultData = data;
      if (filterCol) {
        resultData = resultData.filter(item => item[filterCol!] === filterVal);
      }
      if (filterInCols) {
        resultData = resultData.filter(item => filterInVals.includes(item[filterInCols!]));
      }

      const res = { data: resultData, error: null };
      return Promise.resolve(res).then(onfulfilled);
    }
  };
  return chain;
}

const mockSupabaseClient = {
  from(tableName: string) {
    if (tableName === "projects") {
      return {
        select(fields?: string) {
          return createMockQueryChain(mockProjects, tableName);
        },
        insert(payload: any) {
          const newProj = {
            id: mockProjects.length + 1,
            name: payload.name,
            description: payload.description || null,
            created_at: new Date().toISOString()
          };
          mockProjects.unshift(newProj);
          return {
            select(fields?: string) {
              return {
                single() {
                  return Promise.resolve({ data: newProj, error: null });
                }
              };
            }
          };
        }
      };
    }

    if (tableName === "google_sheets") {
      return {
        select(fields?: string) {
          return createMockQueryChain(mockSheets, tableName);
        }
      };
    }

    if (tableName === "sheet_leads") {
      return {
        select(fields?: string) {
          return createMockQueryChain(mockLeads, tableName);
        },
        update(payload: any) {
          return {
            eq(column: string, value: any) {
              return createMockQueryChain(mockLeads, tableName, false, true, payload).eq(column, value);
            }
          };
        }
      };
    }

    return {
      select() {
        return Promise.resolve({ data: [], error: null });
      }
    };
  }
} as any;

export const supabase = isPlaceholder 
  ? mockSupabaseClient 
  : createClient<LooseDatabase, "public">(supabaseUrl, supabaseAnonKey);

// Maintain compatibility for components/stores using the getter function
export function getSupabaseClient() {
  return supabase;
}

