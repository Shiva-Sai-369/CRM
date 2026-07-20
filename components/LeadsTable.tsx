"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { sortLeads, type SortColumn, type SortDirection } from "@/lib/sortLeads";
import { exportLeadsToCSV } from "@/lib/exportCsv";
import { ROWS_PER_PAGE } from "@/lib/constants";
import { useFilterStore } from "@/store/filterStore";
import { useProjectStore } from "@/store/projectStore";
import type { Lead } from "@/lib/parseLeads";
import LeadRow from "./LeadRow";
import { Plus, Download, Trash2 } from "lucide-react";

interface LeadsTableProps {
  leads: Lead[];
  loading: boolean;
  onAddLeadClick: () => void;
}

export default function LeadsTable({ leads, loading, onAddLeadClick }: LeadsTableProps) {
  const updateLeadStatus = useProjectStore((state) => state.updateLeadStatus);
  const updateLeadNotes = useProjectStore((state) => state.updateLeadNotes);

  const [sortColumn, setSortColumn] = useState<SortColumn>("lastMessageDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE);

  const clearFilters = useFilterStore(state => state.clearFilters);
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get("leadId");

  // Update local leads when props change
  useMemo(() => {
    setLocalLeads(leads);
  }, [leads]);

  // Extract unique statuses from all leads
  const availableStatuses = useMemo(() => {
    const statuses = new Set<string>();
    localLeads.forEach(lead => {
      if (lead.leadStatus) statuses.add(lead.leadStatus);
    });
    return Array.from(statuses).sort();
  }, [localLeads]);

  const handleStatusChange = (leadId: string, newStatus: string) => {
    setLocalLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.uniqueKey === leadId ? { ...lead, leadStatus: newStatus } : lead
      )
    );

    const numericId = Number(leadId);
    if (Number.isFinite(numericId)) {
      void updateLeadStatus(numericId, newStatus);
    }
  };

  const handleNotesSave = (leadId: string, notes: string) => {
    setLocalLeads((prevLeads) =>
      prevLeads.map((lead) => (lead.uniqueKey === leadId ? { ...lead, notes } : lead))
    );

    const numericId = Number(leadId);
    if (Number.isFinite(numericId)) {
      void updateLeadNotes(numericId, notes);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = paginatedLeads.map(lead => lead.uniqueKey);
      setSelectedLeads(new Set(allIds));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (checked) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleBulkStatusChange = (newStatus: string) => {
    setLocalLeads(prevLeads =>
      prevLeads.map(lead =>
        selectedLeads.has(lead.uniqueKey) ? { ...lead, leadStatus: newStatus } : lead
      )
    );
    setSelectedLeads(new Set());
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedLeads.size} selected leads?`)) {
      setLocalLeads(prevLeads =>
        prevLeads.filter(lead => !selectedLeads.has(lead.uniqueKey))
      );
      setSelectedLeads(new Set());
    }
  };

  // Sort leads
  const sortedLeads = useMemo(() => {
    return sortLeads(localLeads, sortColumn, sortDirection);
  }, [localLeads, sortColumn, sortDirection]);

  // Paginate leads
  const totalPages = Math.ceil(sortedLeads.length / rowsPerPage);
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedLeads.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedLeads, currentPage, rowsPerPage]);

  useEffect(() => {
    if (leadIdParam) {
      const index = sortedLeads.findIndex((lead) => lead.uniqueKey === leadIdParam);
      if (index !== -1) {
        const targetPage = Math.floor(index / rowsPerPage) + 1;
        setCurrentPage(targetPage);
        setExpandedRowId(leadIdParam);
        
        setTimeout(() => {
          const element = document.getElementById(`lead-row-${leadIdParam}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 150);
      }
    }
  }, [leadIdParam, sortedLeads, rowsPerPage]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleExport = () => {
    const leadsToExport = selectedLeads.size > 0
      ? localLeads.filter(lead => selectedLeads.has(lead.uniqueKey))
      : localLeads;
    exportLeadsToCSV(leadsToExport);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setExpandedRowId(null);
    setSelectedLeads(new Set());
  };

  // Reset to page 1 when leads change
  useMemo(() => {
    setCurrentPage(1);
  }, [localLeads]);

  const isAllSelected = paginatedLeads.length > 0 && paginatedLeads.every(lead => selectedLeads.has(lead.uniqueKey));
  const isSomeSelected = paginatedLeads.some(lead => selectedLeads.has(lead.uniqueKey));

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortDirection === "asc" ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const renderTableHeader = (column: SortColumn, label: string, filterable: boolean = false) => (
    <th
      className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider select-none whitespace-nowrap"
    >
      <div className="flex items-center justify-between gap-2">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:text-blue-600"
          onClick={() => handleSort(column)}
        >
          {label}
          {renderSortIcon(column)}
        </div>
        {filterable && (
          <button
            onClick={() => handleColumnFilter(column)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title={`Filter ${label}`}
          >
            <svg className="w-4 h-4 text-gray-500 hover:text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </th>
  );

  const handleColumnFilter = (column: SortColumn) => {
    // This will open the filter dropdown for the specific column
    console.log(`Filter ${column}`);
    // You can implement column-specific filtering here
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-b border-gray-200 px-6 py-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No leads match your filters.</p>
          <button
            onClick={clearFilters}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Table Header with Actions */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">Leads</h2>
          {selectedLeads.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-lg">
              <span className="text-sm font-semibold text-blue-900">
                {selectedLeads.size} selected
              </span>
              <button
                onClick={() => setSelectedLeads(new Set())}
                className="text-blue-700 hover:text-blue-900"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {selectedLeads.size > 0 && (
            <>
              <select
                onChange={(e) => handleBulkStatusChange(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="">Change Status</option>
                {availableStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-semibold flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          )}
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Export {selectedLeads.size > 0 ? `(${selectedLeads.size})` : 'All'}
          </button>
          <button
            onClick={onAddLeadClick}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-3 py-3 w-12">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = isSomeSelected && !isAllSelected;
                    }
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-28">
                Actions
              </th>
              {renderTableHeader("name", "Name", true)}
              {renderTableHeader("phone", "Phone", true)}
              {renderTableHeader("email", "Email", true)}
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 font-bold text-xs">STATUS</span>
                    <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <button
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Filter Status"
                  >
                    <svg className="w-3 h-3 text-gray-500 hover:text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </th>
              {renderTableHeader("leadSource", "Form/Source", true)}
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-64">
                Last Note
              </th>
              {renderTableHeader("lastMessageDate", "Date & Time", true)}
            </tr>
          </thead>
          <tbody>
            {paginatedLeads.map(lead => (
              <LeadRow
                key={lead.uniqueKey}
                lead={lead}
                isExpanded={expandedRowId === lead.uniqueKey}
                isSelected={selectedLeads.has(lead.uniqueKey)}
                onToggleExpand={() =>
                  setExpandedRowId(expandedRowId === lead.uniqueKey ? null : lead.uniqueKey)
                }
                onSelect={(checked) => handleSelectLead(lead.uniqueKey, checked)}
                availableStatuses={availableStatuses}
                onStatusChange={handleStatusChange}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <span className="text-sm text-gray-600">
              Showing <strong>{(currentPage - 1) * rowsPerPage + 1}</strong> to{" "}
              <strong>{Math.min(currentPage * rowsPerPage, sortedLeads.length)}</strong> of{" "}
              <strong>{sortedLeads.length}</strong> leads
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              ← Prev
            </button>
            
            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => handlePageChange(page as number)}
                  className={`px-3 py-2 text-sm rounded-lg font-semibold ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )
            ))}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
