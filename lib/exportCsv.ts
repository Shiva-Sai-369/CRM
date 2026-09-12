import { format } from "date-fns";
import type { Lead } from "./parseLeads";
import type { LeadNote } from "@/types/supabase";

/**
 * Convert leads array to CSV string
 * @param leads - Array of Lead objects to export
 * @param leadNotesMap - Optional map of lead ID to notes array
 * @returns CSV string
 */
function leadsToCSV(leads: Lead[], leadNotesMap?: Record<number, LeadNote[]>): string {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Company",
    "Lead Source",
    "Lead Status",
    "Tags",
    "Last Message",
    "Last Message Date",
    "Notes (Latest)",
    "All Notes",
    "Platform",
  ];

  const rows = leads.map(lead => {
    const leadId = Number(lead.uniqueKey);
    const notes = leadNotesMap?.[leadId] || [];
    
    // Latest note (from notes column or first note in lead_notes)
    const latestNote = notes.length > 0 ? notes[0].content : (lead.notes || "");
    
    // All notes concatenated with timestamps
    const allNotes = notes.length > 0
      ? notes.map(note => {
          const timestamp = note.created_at ? format(new Date(note.created_at), "dd/MM/yyyy HH:mm") : "";
          return `[${timestamp}] ${note.content}`;
        }).join(" | ")
      : (lead.notes || "");
    
    return [
      lead.name,
      lead.email,
      lead.phone,
      lead.company || "",
      lead.leadSource,
      lead.leadStatus,
      lead.tags.join(", "),
      lead.lastMessage,
      lead.lastMessageDate ? format(lead.lastMessageDate, "dd/MM/yyyy") : "",
      latestNote,
      allNotes,
      lead.platform,
    ];
  });

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
 * @param leadNotesMap - Optional map of lead ID to notes array
 * @param filename - Optional filename (defaults to leads-export-YYYY-MM-DD.csv)
 */
export function exportLeadsToCSV(
  leads: Lead[], 
  leadNotesMap?: Record<number, LeadNote[]>,
  filename?: string
): void {
  const csvContent = leadsToCSV(leads, leadNotesMap);
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
