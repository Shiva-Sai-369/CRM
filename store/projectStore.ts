import { create } from "zustand";
import { getSupabaseClient } from "@/lib/supabase";
import type { GoogleSheet, Project, SheetLead, LeadNote } from "@/types/supabase";

async function fetchNotesForLeads(
  supabase: ReturnType<typeof getSupabaseClient>,
  leadIds: number[]
): Promise<Record<number, LeadNote[]>> {
  if (leadIds.length === 0) return {};
  const { data: notes, error: notesErr } = await supabase
    .from("lead_notes")
    .select("*")
    .in("lead_id", leadIds)
    .order("created_at", { ascending: false });

  if (notesErr) {
    console.error("Supabase Error Details for notes bulk query:", {
      message: notesErr.message,
      details: notesErr.details,
      hint: notesErr.hint
    });
    return {};
  }

  const notesMap: Record<number, LeadNote[]> = {};
  (notes ?? []).forEach((note) => {
    const typedNote = note as LeadNote;
    const leadId = typedNote.lead_id;
    if (!notesMap[leadId]) {
      notesMap[leadId] = [];
    }
    notesMap[leadId].push(typedNote);
  });
  return notesMap;
}


interface ProjectStoreState {
  projects: Project[];
  sheets: GoogleSheet[];
  leads: SheetLead[];
  leadNotes: Record<number, LeadNote[]>;

  loading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project | null>;

  fetchSheetsForProject: (projectId: number | "all") => Promise<void>;

  fetchLeadsForProject: (projectId: number | "all") => Promise<void>;
  fetchLeadsForSheet: (sheetId: number) => Promise<void>;

  updateLeadStatus: (leadId: number, status: string) => Promise<void>;
  updateLeadNotes: (leadId: number, notes: string) => Promise<void>;
  updateLeadDetails: (
    leadId: number,
    details: {
      name: string;
      email: string;
      phone: string;
      company: string;
      platform: string;
    }
  ) => Promise<void>;
  createLeadManually: (leadData: {
    name: string;
    email: string;
    phone: string;
    company: string;
    status: string;
    sheet_id: number;
    notes?: string;
  }) => Promise<SheetLead | null>;

  fetchNotesForLead: (leadId: number) => Promise<void>;
  addNoteForLead: (leadId: number, content: string) => Promise<void>;

  addLead: (lead: SheetLead) => void;
  updateLead: (lead: SheetLead) => void;
  deleteLead: (leadId: number) => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  projects: [],
  sheets: [],
  leads: [],
  leadNotes: {},
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      set({ projects: (data ?? []) as Project[], loading: false });
    } catch (err) {
      set({ error: getErrorMessage(err), loading: false });
    }
  },

  createProject: async (name, description) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabaseClient();
      const payload: Pick<Project, "name" | "description"> = {
        name,
        description: description?.trim() ? description.trim() : null,
      };

      const { data, error } = await supabase
        .from("projects")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const created = data as Project;

      set((state) => ({
        projects: [created, ...state.projects],
        loading: false,
      }));

      return created;
    } catch (err) {
      set({ error: getErrorMessage(err), loading: false });
      return null;
    }
  },

  fetchSheetsForProject: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabaseClient();
      let query = supabase.from("google_sheets").select("*");
      if (projectId !== "all") {
        query = query.eq("project_id", projectId);
      }
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      set({ sheets: (data ?? []) as GoogleSheet[], loading: false });
    } catch (err) {
      set({ error: getErrorMessage(err), loading: false });
    }
  },

  fetchLeadsForProject: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabaseClient();
      let query = supabase.from("google_sheets").select("id");
      if (projectId !== "all") {
        query = query.eq("project_id", projectId);
      }
      const { data: sheetRows, error: sheetErr } = await query;

      if (sheetErr) {
        throw sheetErr;
      }

      const sheetIds = (sheetRows ?? []).map((row) => (row as { id: number }).id);
      if (sheetIds.length === 0) {
        set({ leads: [], loading: false });
        return;
      }

      const { data: leads, error: leadsErr } = await supabase
        .from("sheet_leads")
        .select("*")
        .in("sheet_id", sheetIds)
        .order("created_at", { ascending: false });

      if (leadsErr) {
        throw leadsErr;
      }

      const sheetLeads = (leads ?? []) as SheetLead[];
      const leadIds = sheetLeads.map((l) => l.id);
      const notesMap = await fetchNotesForLeads(supabase, leadIds);

      set((state) => ({
        leads: sheetLeads,
        leadNotes: {
          ...state.leadNotes,
          ...notesMap,
        },
        loading: false,
      }));
    } catch (err) {
      set({ error: getErrorMessage(err), loading: false });
    }
  },

  fetchLeadsForSheet: async (sheetId) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("sheet_leads")
        .select("*")
        .eq("sheet_id", sheetId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const sheetLeads = (data ?? []) as SheetLead[];
      const leadIds = sheetLeads.map((l) => l.id);
      const notesMap = await fetchNotesForLeads(supabase, leadIds);

      set((state) => ({
        leads: sheetLeads,
        leadNotes: {
          ...state.leadNotes,
          ...notesMap,
        },
        loading: false,
      }));
    } catch (err) {
      set({ error: getErrorMessage(err), loading: false });
    }
  },

  updateLeadStatus: async (leadId, status) => {
    set({ error: null });
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("sheet_leads")
        .update({ status })
        .eq("id", leadId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const updated = data as SheetLead;
      set((state) => ({
        leads: state.leads.map((lead) => (lead.id === leadId ? updated : lead)),
      }));
    } catch (err) {
      set({ error: getErrorMessage(err) });
    }
  },

  updateLeadNotes: async (leadId, notes) => {
    set({ error: null });
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("sheet_leads")
        .update({ notes })
        .eq("id", leadId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const updated = data as SheetLead;
      set((state) => ({
        leads: state.leads.map((lead) => (lead.id === leadId ? updated : lead)),
      }));
    } catch (err) {
      set({ error: getErrorMessage(err) });
    }
  },

  updateLeadDetails: async (leadId, details) => {
    set({ error: null });
    try {
      const supabase = getSupabaseClient();
      
      const currentLead = get().leads.find((l) => l.id === leadId);
      const currentRawData = (currentLead?.raw_data && typeof currentLead.raw_data === 'object' && !Array.isArray(currentLead.raw_data))
        ? (currentLead.raw_data as Record<string, any>)
        : {};

      const updatedRawData = {
        ...currentRawData,
        platform: details.platform,
      };

      const { data, error } = await supabase
        .from("sheet_leads")
        .update({
          name: details.name.trim() || null,
          email: details.email.trim() || null,
          phone: details.phone.trim() || null,
          company: details.company.trim() || null,
          raw_data: updatedRawData,
        })
        .eq("id", leadId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const updated = data as SheetLead;
      set((state) => ({
        leads: state.leads.map((lead) => (lead.id === leadId ? updated : lead)),
      }));
    } catch (err) {
      set({ error: getErrorMessage(err) });
      throw err;
    }
  },

  createLeadManually: async (leadData) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabaseClient();

      let nextRowNumber = 1;
      const { data: maxRowData, error: maxRowError } = await supabase
        .from("sheet_leads")
        .select("row_number")
        .eq("sheet_id", leadData.sheet_id)
        .order("row_number", { ascending: false })
        .limit(1);

      if (maxRowError) {
        console.error("Supabase Error Details for max row query:", {
          message: maxRowError.message,
          details: maxRowError.details,
          hint: maxRowError.hint
        });
        let detailedMsg = maxRowError.message;
        if (maxRowError.details) detailedMsg += ` | Details: ${maxRowError.details}`;
        if (maxRowError.hint) detailedMsg += ` | Hint: ${maxRowError.hint}`;
        throw new Error(`Failed to compute row number: ${detailedMsg}`);
      }

      if (maxRowData && maxRowData.length > 0) {
        const currentMax = maxRowData[0].row_number;
        if (currentMax !== null && currentMax !== undefined) {
          nextRowNumber = currentMax + 1;
        }
      }

      const nowStr = new Date().toISOString();
      const payload = {
        name: leadData.name.trim() || null,
        email: leadData.email.trim() || null,
        phone: leadData.phone.trim() || null,
        company: leadData.company.trim() || null,
        status: (leadData.status || 'new').trim().toLowerCase(),
        sheet_id: leadData.sheet_id,
        notes: null,
        row_number: nextRowNumber,
        raw_data: {
          Name: leadData.name.trim(),
          Email: leadData.email.trim(),
          Phone: leadData.phone.trim(),
          Company: leadData.company.trim(),
          Timestamp: nowStr,
          platform: 'Manual',
        },
        notified: false,
        notified_at: null,
        created_at: nowStr,
        updated_at: nowStr,
      };

      const { data, error } = await supabase
        .from("sheet_leads")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        console.error("Supabase Error Details for lead insert:", {
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        let detailedMsg = error.message;
        if (error.details) detailedMsg += ` | Details: ${error.details}`;
        if (error.hint) detailedMsg += ` | Hint: ${error.hint}`;
        throw new Error(detailedMsg);
      }

      const createdLead = data as SheetLead;

      let insertedNote: LeadNote | null = null;
      if (leadData.notes?.trim()) {
        const { data: newNote, error: notesError } = await supabase
          .from("lead_notes")
          .insert({
            lead_id: createdLead.id,
            content: leadData.notes.trim(),
          })
          .select("*")
          .single();
        
        if (notesError) {
          console.error("Supabase Error Details for lead note insert:", {
            message: notesError.message,
            details: notesError.details,
            hint: notesError.hint
          });
          let detailedMsg = notesError.message;
          if (notesError.details) detailedMsg += ` | Details: ${notesError.details}`;
          if (notesError.hint) detailedMsg += ` | Hint: ${notesError.hint}`;
          throw new Error(`Lead created, but initial note failed: ${detailedMsg}`);
        }
        insertedNote = newNote as LeadNote;
      }

      set((state) => {
        const newLeadNotes = { ...state.leadNotes };
        if (insertedNote) {
          newLeadNotes[createdLead.id] = [insertedNote, ...(newLeadNotes[createdLead.id] || [])];
        }
        return {
          leads: [createdLead, ...state.leads],
          leadNotes: newLeadNotes,
          loading: false,
        };
      });

      return createdLead;
    } catch (err) {
      set({ error: getErrorMessage(err), loading: false });
      throw err;
    }
  },

  fetchNotesForLead: async (leadId) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("lead_notes")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      set((state) => ({
        leadNotes: {
          ...state.leadNotes,
          [leadId]: (data ?? []) as LeadNote[],
        },
      }));
    } catch (err) {
      console.error("Error fetching notes:", err);
      throw err;
    }
  },

  addNoteForLead: async (leadId, content) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("lead_notes")
        .insert({ lead_id: leadId, content })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const newNote = data as LeadNote;
      set((state) => ({
        leadNotes: {
          ...state.leadNotes,
          [leadId]: [newNote, ...(state.leadNotes[leadId] || [])],
        },
      }));
    } catch (err) {
      console.error("Error adding note:", err);
      throw err;
    }
  },

  addLead: (lead) => {
    set((state) => {
      if (state.leads.some((l) => l.id === lead.id)) {
        return state;
      }
      return {
        leads: [lead, ...state.leads],
      };
    });
  },

  updateLead: (lead) => {
    set((state) => ({
      leads: state.leads.map((l) => (l.id === lead.id ? lead : l)),
    }));
  },

  deleteLead: (leadId) => {
    set((state) => ({
      leads: state.leads.filter((l) => l.id !== leadId),
    }));
  },
}));