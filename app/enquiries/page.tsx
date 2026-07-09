"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { filterLeads } from "@/lib/filterLeads";
import { useFilterStore } from "@/store/filterStore";
import FilterBar from "@/components/FilterBar";
import StatsStrip from "@/components/StatsStrip";
import LeadsTable from "@/components/LeadsTable";
import type { Lead } from "@/lib/parseLeads";
import { useProjectStore } from "@/store/projectStore";
import type { GoogleSheet, SheetLead } from "@/types/supabase";

function toUiLead(lead: SheetLead, sheet: GoogleSheet | undefined): Lead {
  const createdAt = lead.created_at ? new Date(lead.created_at) : null;

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
    platform: "Supabase",
    uniqueKey: String(lead.id),
  };
}

export default function EnquiriesPage() {
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
  } = useProjectStore();

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<number | "all">("all");

  const filterState = useFilterStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (projects.length === 0) return;
    if (selectedProjectId !== null) return;

    setSelectedProjectId(projects[0].id);
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId === null) return;
    void fetchSheetsForProject(selectedProjectId);
    void fetchLeadsForProject(selectedProjectId);
    setSelectedSheetId("all");
  }, [fetchLeadsForProject, fetchSheetsForProject, selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId === null) return;
    if (selectedSheetId === "all") {
      void fetchLeadsForProject(selectedProjectId);
    } else {
      void fetchLeadsForSheet(selectedSheetId);
    }
  }, [fetchLeadsForProject, fetchLeadsForSheet, selectedProjectId, selectedSheetId]);

  const leads = useMemo(() => {
    return supabaseLeads.map((lead) => toUiLead(lead, sheets.find((s) => s.id === lead.sheet_id)));
  }, [sheets, supabaseLeads]);

  // Apply filters
  const filteredLeads = useMemo(() => {
    return filterLeads(leads, filterState);
  }, [leads, filterState]);

  // Extract unique values for filters
  const availableLeadSources = useMemo(() => {
    const sources = leads.map(l => l.leadSource).filter(Boolean);
    return Array.from(new Set(sources));
  }, [leads]);

  const availableLeadStatuses = useMemo(() => {
    const statuses = leads.map(l => l.leadStatus).filter(Boolean);
    return Array.from(new Set(statuses));
  }, [leads]);

  const availableTags = useMemo(() => {
    const allTags = leads.flatMap(l => l.tags || []);
    return Array.from(new Set(allTags));
  }, [leads]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 bg-white border-b border-gray-200 px-6 py-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enquiries</h1>
            <p className="text-sm text-gray-500 mt-1">
              {selectedProjectId ? "Loaded from Supabase" : "Select a project"}
            </p>
          </div>
          
          <button
            onClick={() => {
              if (selectedProjectId === null) {
                toast.error("Select a project first");
                return;
              }
              if (selectedSheetId === "all") {
                void fetchLeadsForProject(selectedProjectId);
              } else {
                void fetchLeadsForSheet(selectedSheetId);
              }
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
        <div className="max-w-7xl mx-auto mb-6">
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
      <div className="max-w-7xl mx-auto mb-6">
        <StatsStrip leads={filteredLeads} />
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="mb-4 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-gray-700">Project:</label>
            <select
              value={selectedProjectId ?? ""}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
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
          totalLeads={leads.length}
          filteredCount={filteredLeads.length}
          availableLeadSources={availableLeadSources}
          availableLeadStatuses={availableLeadStatuses}
          availableTags={availableTags}
        />
      </div>

      {/* Leads Table */}
      <div className="max-w-7xl mx-auto">
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
                ? 'No leads found in Supabase for the current selection.'
                : 'Try adjusting your filters to see more results.'}
            </p>
          </div>
        ) : (
          <LeadsTable leads={filteredLeads} loading={loading} />
        )}
      </div>
    </div>
  );
}
