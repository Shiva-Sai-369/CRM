"use client";

import { useState, useEffect } from "react";
import { useFilterStore } from "@/store/filterStore";
import MultiSelect from "./MultiSelect";

interface FilterBarProps {
  totalLeads: number;
  filteredCount: number;
  availableLeadSources: string[];
  availableLeadStatuses: string[];
  availableTags: string[];
}

export default function FilterBar({
  totalLeads,
  filteredCount,
  availableLeadSources,
  availableLeadStatuses,
  availableTags,
}: FilterBarProps) {
  const {
    search,
    leadSources,
    leadStatuses,
    tags,
    fromDate,
    toDate,
    setSearch,
    setLeadSources,
    setLeadStatuses,
    setTags,
    setFromDate,
    setToDate,
    clearFilters,
  } = useFilterStore();

  const [searchInput, setSearchInput] = useState(search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, setSearch]);

  const formatDateForInput = (date: Date | null): string => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFromDate(value ? new Date(value) : null);
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setToDate(value ? new Date(value) : null);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    clearFilters();
  };

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
      <div className="p-4">
        <div className="flex flex-wrap gap-3 mb-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search name, email, phone, message..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Lead Source */}
          <MultiSelect
            label="Lead Source"
            options={availableLeadSources}
            selected={leadSources}
            onChange={setLeadSources}
          />

          {/* Lead Status */}
          <MultiSelect
            label="Status"
            options={availableLeadStatuses}
            selected={leadStatuses}
            onChange={setLeadStatuses}
          />

          {/* Tags */}
          <MultiSelect
            label="Tags"
            options={availableTags}
            selected={tags}
            onChange={setTags}
          />

          {/* From Date */}
          <div className="min-w-[150px]">
            <input
              type="date"
              value={formatDateForInput(fromDate)}
              onChange={handleFromDateChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* To Date */}
          <div className="min-w-[150px]">
            <input
              type="date"
              value={formatDateForInput(toDate)}
              onChange={handleToDateChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Clear Filters and Result Count */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
          >
            🗑️ Clear Filters
          </button>
          
          <p className="text-base text-gray-700">
            Showing <span className="font-black text-blue-600 text-lg">{filteredCount}</span> of{" "}
            <span className="font-black text-lg">{totalLeads}</span> leads
          </p>
        </div>
      </div>
    </div>
  );
}
