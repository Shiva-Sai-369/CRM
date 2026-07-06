import { STATUS_COLORS } from "@/lib/constants";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] || "bg-gray-100 text-gray-700 border-gray-500";

  return (
    <span className={`inline-block px-4 py-2 rounded text-sm font-semibold border-l-4 ${colorClass}`}>
      {status}
    </span>
  );
}
