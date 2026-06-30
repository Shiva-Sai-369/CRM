import { STATUS_COLORS } from "@/lib/constants";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyle = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    
    // Blue
    if (normalizedStatus.includes('new lead') || normalizedStatus.includes('new') || normalizedStatus.includes('qualification')) {
      return { backgroundColor: '#DBEAFE', color: '#1E40AF', fontWeight: 'bold' as const };
    }
    // Purple
    if (normalizedStatus.includes('contacted')) {
      return { backgroundColor: '#E9D5FF', color: '#7E22CE', fontWeight: 'bold' as const };
    }
    // Yellow
    if (normalizedStatus.includes('interested') || normalizedStatus.includes('qualified') || normalizedStatus.includes('identify')) {
      return { backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 'bold' as const };
    }
    // Green
    if (normalizedStatus.includes('converted') || normalizedStatus.includes('needs analysis')) {
      return { backgroundColor: '#D1FAE5', color: '#065F46', fontWeight: 'bold' as const };
    }
    // Red
    if (normalizedStatus.includes('lost') || normalizedStatus.includes('invalid') || normalizedStatus.includes('proposal') || normalizedStatus.includes('value prop')) {
      return { backgroundColor: '#FEE2E2', color: '#991B1B', fontWeight: 'bold' as const };
    }
    // Orange
    if (normalizedStatus.includes('follow') || normalizedStatus.includes('vacancy') || normalizedStatus.includes('negotiation')) {
      return { backgroundColor: '#FFEDD5', color: '#C2410C', fontWeight: 'bold' as const };
    }
    // Gray
    if (normalizedStatus.includes('hold') || normalizedStatus.includes('waiting') || normalizedStatus.includes('no response') || normalizedStatus.includes('not interested')) {
      return { backgroundColor: '#F3F4F6', color: '#374151', fontWeight: 'bold' as const };
    }
    
    // Default gray for anything else
    return { backgroundColor: '#F3F4F6', color: '#dbdb46ff', fontWeight: 'bold' as const };
  };

  return (
    <span style={getStatusStyle(status)} className="inline-block px-4 py-2 rounded text-sm font-bold">
      {status}
    </span>
  );
}
