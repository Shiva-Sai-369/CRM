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
    .map(([status, count]) => {
      // Get color mapping for border
      const colorClass = STATUS_COLORS[status] || "bg-gray-50 text-gray-700 border-gray-500";
      // Extract the border color from the class
      const borderMatch = colorClass.match(/border-(\w+)-(\d+)/);
      const borderColor = borderMatch ? `border-${borderMatch[1]}-${borderMatch[2]}` : "border-gray-500";
      
      return {
        status,
        count,
        borderColor,
      };
    });

  return (
    <div className="mb-4">
      {/* Total Leads - Full Width */}
      <div className="mb-3">
        <div className="p-4 rounded-lg border bg-white border-l-4 border-blue-600 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold mb-1 uppercase text-gray-500 tracking-widest">TOTAL LEADS</p>
              <p className="text-4xl font-black text-gray-900">{totalLeads}</p>
            </div>
            <svg className="w-12 h-12 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Status Breakdown - Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {sortedStatuses.map(({ status, count, borderColor }) => (
          <div
            key={status}
            className={`p-4 rounded-xl bg-white border-l-4 ${borderColor} shadow-sm hover:shadow-md transition-shadow`}
          >
            <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider truncate" title={status}>
              {status}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
            <p className="text-xs text-gray-400 mt-1">
              {((count / totalLeads) * 100).toFixed(1)}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
