import type { Lead } from "@/lib/parseLeads";
import { STATUS_COLORS } from "@/lib/constants";

interface StatsStripProps {
  leads: Lead[];
}

export default function StatsStrip({ leads }: StatsStripProps) {
  const totalLeads = leads.length;

  // Get all unique statuses and their counts
  const statusCounts = leads.reduce((acc, lead) => {
    const status = lead.leadStatus || "Unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort statuses by count (descending)
  const sortedStatuses = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({
      status,
      count,
      colorClass: STATUS_COLORS[status] || "bg-gray-50 text-gray-700 border-l-4 border-gray-500",
    }));

  return (
    <div className="mb-4">
      {/* Total Leads - Full Width */}
      <div className="mb-3">
        <div className="p-4 rounded-lg border bg-gradient-to-r from-blue-100 to-blue-50 border-l-4 border-blue-600 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1 uppercase text-blue-800">Total Leads</p>
              <p className="text-4xl font-black text-blue-900">{totalLeads}</p>
            </div>
            <svg className="w-12 h-12 text-blue-600 opacity-50" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Status Breakdown - Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {sortedStatuses.map(({ status, count, colorClass }) => {
          // Extract colors from the colorClass string
          const bgColor = colorClass.match(/bg-\w+-\d+/)?.[0] || "bg-gray-50";
          const textColor = colorClass.match(/text-\w+-\d+/)?.[0] || "text-gray-700";
          const borderColor = colorClass.match(/border-\w+-\d+/)?.[0] || "border-gray-500";

          return (
            <div
              key={status}
              className={`p-3 rounded-lg border ${bgColor} ${textColor} border-l-4 ${borderColor} shadow-sm hover:shadow-md transition-shadow`}
            >
              <p className="text-xs font-bold mb-1 uppercase truncate" title={status}>
                {status}
              </p>
              <p className="text-2xl font-black">{count}</p>
              <p className="text-xs mt-1 opacity-75">
                {((count / totalLeads) * 100).toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
