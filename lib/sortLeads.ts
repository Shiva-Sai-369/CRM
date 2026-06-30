import type { Lead } from "./parseLeads";

/**
 * Sort direction type
 */
export type SortDirection = "asc" | "desc";

/**
 * Sortable column keys
 */
export type SortColumn = "name" | "email" | "phone" | "platform" | "leadSource" | "leadStatus" | "tags" | "lastMessage" | "lastMessageDate";

/**
 * Compare two values for sorting
 * @param a - First value
 * @param b - Second value
 * @param direction - Sort direction
 * @returns Comparison result (-1, 0, 1)
 */
function compare<T>(a: T, b: T, direction: SortDirection): number {
  if (a === b) {
    return 0;
  }

  const result = a < b ? -1 : 1;
  return direction === "asc" ? result : -result;
}

/**
 * Sort leads by the specified column and direction
 * @param leads - Array of Lead objects to sort
 * @param column - Column to sort by
 * @param direction - Sort direction (asc or desc)
 * @returns Sorted array of Lead objects
 */
export function sortLeads(leads: Lead[], column: SortColumn, direction: SortDirection): Lead[] {
  return [...leads].sort((a, b) => {
    switch (column) {
      case "name":
        return compare(a.name.toLowerCase(), b.name.toLowerCase(), direction);
      
      case "email":
        return compare((a.email || "").toLowerCase(), (b.email || "").toLowerCase(), direction);
      
      case "phone":
        return compare((a.phone || "").toLowerCase(), (b.phone || "").toLowerCase(), direction);
      
      case "platform":
        return compare(a.platform.toLowerCase(), b.platform.toLowerCase(), direction);
      
      case "leadSource":
        return compare(a.leadSource.toLowerCase(), b.leadSource.toLowerCase(), direction);
      
      case "leadStatus":
        return compare(a.leadStatus.toLowerCase(), b.leadStatus.toLowerCase(), direction);
      
      case "tags":
        return compare(a.tags.join(",").toLowerCase(), b.tags.join(",").toLowerCase(), direction);
      
      case "lastMessage":
        return compare(a.lastMessage.toLowerCase(), b.lastMessage.toLowerCase(), direction);
      
      case "lastMessageDate": {
        const dateA = a.lastMessageDate?.getTime() || 0;
        const dateB = b.lastMessageDate?.getTime() || 0;
        return compare(dateA, dateB, direction);
      }
      
      default:
        return 0;
    }
  });
}
