"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { fetchLeads } from "@/lib/parseLeads";
import { filterLeads } from "@/lib/filterLeads";
import { useFilterStore } from "@/store/filterStore";
import FilterBar from "@/components/FilterBar";
import StatsStrip from "@/components/StatsStrip";
import LeadsTable from "@/components/LeadsTable";
import type { Lead } from "@/lib/parseLeads";

export default function EnquiriesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterState = useFilterStore();

  // Fetch leads on mount
  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (typeof window === "undefined") {
        return;
      }

      const sheetUrl = localStorage.getItem("sheetUrl");
      const apiKey = localStorage.getItem("googleApiKey");
      const sheetRange = localStorage.getItem("sheetRange") || "Sheet1!A1:Z1000";
      const useApi = localStorage.getItem("useApi") === "true";

      console.log("Loading leads with config:", { sheetUrl, useApi, sheetRange });

      if (!sheetUrl || sheetUrl === "PASTE_YOUR_CSV_URL_HERE") {
        throw new Error("No Google Sheet URL configured. Please go to Settings.");
      }

      const { fetchLeadsFromGoogleSheet } = await import("@/lib/googleSheetsApi");
      const fetchedLeads = await fetchLeadsFromGoogleSheet(
        sheetUrl,
        useApi ? apiKey || undefined : undefined,
        sheetRange
      );
      
      console.log("Loaded leads:", fetchedLeads.length);
      setLeads(fetchedLeads);
    } catch (err) {
      console.error("Error loading leads:", err);
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  // Filter leads based on current filter state
  const filteredLeads = useMemo(() => {
    return filterLeads(leads, {
      search: filterState.search,
      leadSources: filterState.leadSources,
      leadStatuses: filterState.leadStatuses,
      tags: filterState.tags,
      fromDate: filterState.fromDate,
      toDate: filterState.toDate,
    });
  }, [leads, filterState]);

  // Extract unique values for filter options
  const filterOptions = useMemo(() => {
    const sources = new Set<string>();
    const statuses = new Set<string>();
    const allTags = new Set<string>();

    leads.forEach(lead => {
      if (lead.leadSource) sources.add(lead.leadSource);
      if (lead.leadStatus) statuses.add(lead.leadStatus);
      lead.tags.forEach(tag => allTags.add(tag));
    });

    return {
      leadSources: Array.from(sources).sort(),
      leadStatuses: Array.from(statuses).sort(),
      tags: Array.from(allTags).sort(),
    };
  }, [leads]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Leads</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-gray-600 text-sm mb-4">
              Make sure you have configured your Google Sheet CSV URL in Settings.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadLeads}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
            <Link
              href="/settings"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Go to Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <FilterBar
        totalLeads={leads.length}
        filteredCount={filteredLeads.length}
        availableLeadSources={filterOptions.leadSources}
        availableLeadStatuses={filterOptions.leadStatuses}
        availableTags={filterOptions.tags}
      />
      
      <div className="flex-1 overflow-auto px-4 pb-4">
        <StatsStrip leads={filteredLeads} />
        <LeadsTable leads={filteredLeads} loading={loading} />
      </div>
    </div>
  );
}
