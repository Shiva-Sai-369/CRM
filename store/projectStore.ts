import { create } from "zustand";
import { createBrowserClient } from '@supabase/ssr';
import type { GoogleSheet, Project, SheetLead, LeadNote } from "@/types/supabase";
import { getProjects as getLocalProjects } from '@/lib/projectStorage';

// Create a function to get the SSR browser client
function getSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

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
    console.error("Error fetching notes:", notesErr.message);
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
      
      // Get current user and their role
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        set({ projects: [], loading: false });
        return;
      }

      // Fetch user profile to get role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[fetchProjects] Profile error:', profileError.message);
      }

      const userRole = (profile as { role?: string } | null)?.role;
      let supabaseProjects: Project[] = [];

      // Super admins see all projects
      if (userRole === 'super_admin') {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error('[fetchProjects] Error fetching projects:', error.message);
          throw error;
        }
        supabaseProjects = (data ?? []) as Project[];
      } else {
        // Team members and clients only see assigned projects
        const { data: assignments, error: assignErr } = await supabase
          .from("project_assignments")
          .select("project_id")
          .eq("user_id", user.id);

        if (assignErr) {
          console.error('[fetchProjects] Assignments error:', assignErr.message);
          throw assignErr;
        }

        const projectIds = (assignments ?? []).map((a: { project_id: number }) => a.project_id);

        if (projectIds.length > 0) {
          const { data, error } = await supabase
            .from("projects")
            .select("*")
            .in("id", projectIds)
            .order("created_at", { ascending: false });

          if (error) {
            console.error('[fetchProjects] Error fetching assigned projects:', error.message);
            throw error;
          }
          supabaseProjects = (data ?? []) as Project[];
        }
      }

      // Also fetch localStorage projects (from Google Sheets assignment flow)
      const localProjects = getLocalProjects();
      
      // Convert localStorage projects to Supabase Project format (with negative IDs to avoid conflicts)
      // Use negative IDs so they don't conflict with Supabase numeric IDs
      const localAsSupabase: Project[] = localProjects.map((lp, index) => ({
        id: -(index + 1), // Negative IDs for localStorage projects
        name: lp.name,
        description: lp.description,
        created_at: lp.createdAt,
        updated_at: lp.updatedAt,
        _localStorage: true, // Mark as localStorage project
        _localId: lp.id, // Store original UUID
      } as Project & { _localStorage?: boolean; _localId?: string }));

      // Merge: Supabase projects first, then localStorage projects
      const allProjects = [...supabaseProjects, ...localAsSupabase];
      
      // Sort by created_at descending
      allProjects.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      set({ projects: allProjects, loading: false });
    } catch (err) {
      console.error('[fetchProjects] Error:', err instanceof Error ? err.message : 'Unknown error');
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
        throw new Error(`Failed to compute row number: ${maxRowError.message}`);
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
        throw new Error(error.message);
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
          throw new Error(`Lead created, but initial note failed: ${notesError.message}`);
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