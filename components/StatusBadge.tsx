interface StatusBadgeProps {
  status: string;
}

/**
 * Generate a consistent color based on status name hash
 * Every unique status gets a unique color automatically
 */
function hashStringToColor(str: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    { bg: '#DBEAFE', text: '#1E40AF' }, // Blue
    { bg: '#E9D5FF', text: '#7E22CE' }, // Purple
    { bg: '#FEF3C7', text: '#92400E' }, // Yellow
    { bg: '#D1FAE5', text: '#065F46' }, // Green
    { bg: '#FEE2E2', text: '#991B1B' }, // Red
    { bg: '#FFEDD5', text: '#C2410C' }, // Orange
    { bg: '#F3F4F6', text: '#374151' }, // Gray
    { bg: '#DCE7F1', text: '#0C4A6E' }, // Sky Blue
    { bg: '#FCD34D', text: '#78350F' }, // Amber
    { bg: '#FBCFE8', text: '#831843' }, // Rose
  ];

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = hashStringToColor(status);

  return (
    <span 
      style={{ backgroundColor: style.bg, color: style.text }}
      className="inline-block px-4 py-2 rounded-xl text-sm font-bold"
    >
      {status}
    </span>
  );
}
