import { create } from "zustand";
import { getSupabaseClient } from "@/lib/supabase";
import type { GoogleSheet, Project, SheetLead } from "@/types/supabase";

interface ProjectStoreState {
  projects: Project[];
  sheets: GoogleSheet[];
  leads: SheetLead[];

  loading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project | null>;

  fetchSheetsForProject: (projectId: number | "all") => Promise<void>;

  fetchLeadsForProject: (projectId: number | "all") => Promise<void>;
  fetchLeadsForSheet: (sheetId: number) => Promise<void>;

  updateLeadStatus: (leadId: number, status: string) => Promise<void>;
  updateLeadNotes: (leadId: number, notes: string) => Promise<void>;

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

      set({ leads: (leads ?? []) as SheetLead[], loading: false });
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

      set({ leads: (data ?? []) as SheetLead[], loading: false });
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