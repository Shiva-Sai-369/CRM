import { format } from "date-fns";
import type { Lead } from "./parseLeads";

/**
 * Convert leads array to CSV string
 * @param leads - Array of Lead objects to export
 * @returns CSV string
 */
function leadsToCSV(leads: Lead[]): string {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Lead Source",
    "Lead Status",
    "Tags",
    "Last Message",
    "Last Message Date",
    "Notes",
    "Platform",
  ];

  const rows = leads.map(lead => [
    lead.name,
    lead.email,
    lead.phone,
    lead.leadSource,
    lead.leadStatus,
    lead.tags.join(", "),
    lead.lastMessage,
    lead.lastMessageDate ? format(lead.lastMessageDate, "dd/MM/yyyy") : "",
    lead.notes,
    lead.platform,
  ]);

  const escapeField = (field: string): string => {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const csvLines = [
    headers.map(escapeField).join(","),
    ...rows.map(row => row.map(escapeField).join(",")),
  ];

  return csvLines.join("\n");
}

/**
 * Export leads to CSV file and trigger browser download
 * @param leads - Array of Lead objects to export
 * @param filename - Optional filename (defaults to leads-export-YYYY-MM-DD.csv)
 */
export function exportLeadsToCSV(leads: Lead[], filename?: string): void {
  const csvContent = leadsToCSV(leads);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  
  const defaultFilename = `leads-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
  const finalFilename = filename || defaultFilename;
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", finalFilename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
