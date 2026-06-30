import { TAG_COLORS } from "@/lib/constants";

interface TagPillProps {
  tag: string;
}

export default function TagPill({ tag }: TagPillProps) {
  const colorClass = TAG_COLORS[tag] || "bg-gray-100 text-gray-800";

  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
      {tag}
    </span>
  );
}
