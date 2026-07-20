"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import toast from "react-hot-toast";
import { filterLeads } from "@/lib/filterLeads";
import { useFilterStore } from "@/store/filterStore";
import FilterBar from "@/components/FilterBar";
import StatsStrip from "@/components/StatsStrip";
import LeadsTable from "@/components/LeadsTable";
import AddLeadModal from "@/components/AddLeadModal";
import type { Lead } from "@/lib/parseLeads";
import { useProjectStore } from "@/store/projectStore";
import type { GoogleSheet, SheetLead } from "@/types/supabase";
import { getSupabaseClient } from "@/lib/supabase";

function toUiLead(lead: SheetLead, sheet: GoogleSheet | undefined): Lead {
  const createdAt = lead.created_at ? new Date(lead.created_at) : null;
  const rawObj = (lead.raw_data && typeof lead.raw_data === "object" && !Array.isArray(lead.raw_data))
    ? (lead.raw_data as Record<string, any>)
    : {};
  const platform = rawObj.platform || rawObj.Platform || rawObj.Platform_Name || (lead.sheet_id ? "Google Sheets" : "Manual");

  return {
    name: lead.name ?? "Unknown",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    leadSource: sheet?.name ?? lead.company ?? "Sheet",
    leadStatus: lead.status ?? "new",
    tags: [],
    lastMessage: "",
    lastMessageDate: createdAt,
    notes: lead.notes ?? "",
    platform: platform,
    uniqueKey: String(lead.id),
    company: lead.company ?? "",
  };
}

function EnquiriesContent() {
  const {
    projects,
    sheets,
    leads: supabaseLeads,
    loading,
    error,
    fetchProjects,
    fetchSheetsForProject,
    fetchLeadsForProject,
    fetchLeadsForSheet,
    addLead,
    updateLead,
    deleteLead,
  } = useProjectStore();

  const [selectedProjectId, setSelectedProjectId] = useState<number | "all" | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<number | "all">("all");
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filterState = useFilterStore();

  const updateLastUpdatedTime = () => {
    const now = new Date();
    setLastUpdated(now.toLocaleTimeString());
  };

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Load selection from sessionStorage or fallback to default when projects are fetched
  useEffect(() => {
    if (projects.length === 0) return;
    
    // Only initialize once when selectedProjectId is still null
    if (selectedProjectId === null) {
      const savedProjectId = typeof window !== "undefined" ? sessionStorage.getItem("selectedProjectId") : null;
      const savedSheetId = typeof window !== "undefined" ? sessionStorage.getItem("selectedSheetId") : null;
      
      if (savedProjectId !== null) {
        setSelectedProjectId(savedProjectId === "all" ? "all" : Number(savedProjectId));
      } else {
        setSelectedProjectId(projects[0].id);
      }
      
      if (savedSheetId !== null) {
        setSelectedSheetId(savedSheetId === "all" ? "all" : Number(savedSheetId));
      }
    }
  }, [projects, selectedProjectId]);

  // Fetch sheets when project changes
  useEffect(() => {
    if (selectedProjectId === null) return;
    void fetchSheetsForProject(selectedProjectId);
  }, [fetchSheetsForProject, selectedProjectId]);

  // Fetch leads when project or sheet changes
  useEffect(() => {
    if (selectedProjectId === null) return;
    if (selectedSheetId === "all") {
      void fetchLeadsForProject(selectedProjectId).then(updateLastUpdatedTime);
    } else {
      void fetchLeadsForSheet(selectedSheetId).then(updateLastUpdatedTime);
    }
  }, [fetchLeadsForProject, fetchLeadsForSheet, selectedProjectId, selectedSheetId]);

  // Save selection changes to sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined" && selectedProjectId !== null) {
      sessionStorage.setItem("selectedProjectId", String(selectedProjectId));
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("selectedSheetId", String(selectedSheetId));
    }
  }, [selectedSheetId]);

  // Subscribe to Supabase Realtime changes
  useEffect(() => {
    if (selectedProjectId === null) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("sheet_leads_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sheet_leads" },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === "INSERT") {
            const lead = newRecord as SheetLead;
            if (!lead.sheet_id) return;

            const isAllProjects = selectedProjectId === "all";
            const belongsToCurrentProject = sheets.some((s) => s.id === lead.sheet_id);

            // Add the lead if we are in "All Projects" scope, or if the lead belongs to the current project
            if (isAllProjects || belongsToCurrentProject) {
              addLead(lead);
              updateLastUpdatedTime();
            }
          } else if (eventType === "UPDATE") {
            const lead = newRecord as SheetLead;
            updateLead(lead);
            updateLastUpdatedTime();
          } else if (eventType === "DELETE") {
            const leadId = (oldRecord as { id: number }).id;
            deleteLead(leadId);
            updateLastUpdatedTime();
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsLive(true);
        } else {
          setIsLive(false);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
      setIsLive(false);
    };
  }, [selectedProjectId, selectedSheetId, sheets, addLead, updateLead, deleteLead]);

  const leads = useMemo(() => {
    return supabaseLeads
      .filter((lead) => {
        // If not All Projects scope, filter out leads not belonging to the current project's sheets
        if (selectedProjectId !== "all") {
          const belongsToCurrentProject = sheets.some((s) => s.id === lead.sheet_id);
          if (!belongsToCurrentProject) return false;
        }
        // If a specific sheet filter is active, filter out other sheets
        if (selectedSheetId !== "all" && lead.sheet_id !== selectedSheetId) {
          return false;
        }
        return true;
      })
      .map((lead) => toUiLead(lead, sheets.find((s) => s.id === lead.sheet_id)));
  }, [sheets, supabaseLeads, selectedProjectId, selectedSheetId]);

  // Apply filters
  const filteredLeads = useMemo(() => {
    return filterLeads(leads, filterState);
  }, [leads, filterState]);

  // Extract unique values for filters
  const availableLeadSources = useMemo(() => {
    const sources = leads.map((l) => l.leadSource).filter(Boolean);
    return Array.from(new Set(sources));
  }, [leads]);

  const availableLeadStatuses = useMemo(() => {
    const statuses = leads.map((l) => l.leadStatus).filter(Boolean);
    return Array.from(new Set(statuses));
  }, [leads]);

  const availableTags = useMemo(() => {
    const allTags = leads.flatMap((l) => l.tags || []);
    return Array.from(new Set(allTags));
  }, [leads]);

  // Determine total leads count based on requirement:
  // "When a new lead comes in via realtime and it doesn't match the currently selected Project/Sheet filter,
  // don't add it to the visible table, but do update the total count if we're on 'All Projects' scope."
  const totalLeadsCount = useMemo(() => {
    if (selectedProjectId === "all") {
      return supabaseLeads.length;
    }
    return leads.length;
  }, [selectedProjectId, supabaseLeads.length, leads.length]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="w-full mb-6 bg-white border-b border-gray-200 px-6 py-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-sans">Enquiries</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 select-none">
              <span className="text-sm text-gray-500">
                {selectedProjectId ? "Loaded from Supabase" : "Select a project"}
              </span>
              {lastUpdated && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-sm text-gray-500 font-mono">Last updated: {lastUpdated}</span>
                </>
              )}
              {isLive && (
                <>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Live</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              if (selectedProjectId === null) {
                toast.error("Select a project first");
                return;
              }
              const promise =
                selectedSheetId === "all"
                  ? fetchLeadsForProject(selectedProjectId)
                  : fetchLeadsForSheet(selectedSheetId);
              void promise.then(() => {
                updateLastUpdatedTime();
                toast.success("Leads refreshed successfully");
              });
            }}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Leads
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="w-full mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-red-900">Error loading leads</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="w-full mb-6">
        <StatsStrip leads={filteredLeads} />
      </div>

      {/* Filters */}
      <div className="w-full mb-6">
        <div className="mb-4 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-gray-700">Project:</label>
            <select
              value={selectedProjectId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedProjectId(val === "all" ? "all" : Number(val));
                setSelectedSheetId("all");
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <label className="text-sm font-semibold text-gray-700">Sheet:</label>
            <select
              value={selectedSheetId === "all" ? "all" : String(selectedSheetId)}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedSheetId(value === "all" ? "all" : Number(value));
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All sheets</option>
              {sheets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.sheet_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        <FilterBar
          totalLeads={totalLeadsCount}
          filteredCount={filteredLeads.length}
          availableLeadSources={availableLeadSources}
          availableLeadStatuses={availableLeadStatuses}
          availableTags={availableTags}
        />
      </div>

      {/* Leads Table */}
      <div className="w-full">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-600">
              {leads.length === 0
                ? "No leads found in Supabase for the current selection."
                : "Try adjusting your filters to see more results."}
            </p>
          </div>
        ) : (
          <LeadsTable
            leads={filteredLeads}
            loading={loading}
            onAddLeadClick={() => setIsAddModalOpen(true)}
          />
        )}
      </div>

      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        selectedProjectId={selectedProjectId}
      />
    </div>
  );
}

export default function EnquiriesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-650 font-semibold">Loading enquiries...</p>
        </div>
      </div>
    }>
      <EnquiriesContent />
    </Suspense>
  );
}
