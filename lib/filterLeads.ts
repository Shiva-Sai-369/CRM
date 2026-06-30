import { isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import type { Lead } from "./parseLeads";

/**
 * Filter criteria structure
 */
export interface FilterCriteria {
  search: string;
  leadSources: string[];
  leadStatuses: string[];
  tags: string[];
  fromDate: Date | null;
  toDate: Date | null;
}

/**
 * Check if a lead matches the search query
 * @param lead - Lead object to check
 * @param search - Search query string
 * @returns True if lead matches search
 */
function matchesSearch(lead: Lead, search: string): boolean {
  if (!search) {
    return true;
  }

  const query = search.toLowerCase();
  const searchFields = [
    lead.name,
    lead.email,
    lead.phone,
    lead.lastMessage,
  ];

  return searchFields.some(field => 
    field.toLowerCase().includes(query)
  );
}

/**
 * Check if a lead matches the lead source filter
 * @param lead - Lead object to check
 * @param leadSources - Array of lead source values to match
 * @returns True if lead matches any of the sources
 */
function matchesLeadSource(lead: Lead, leadSources: string[]): boolean {
  if (leadSources.length === 0) {
    return true;
  }

  return leadSources.includes(lead.leadSource);
}

/**
 * Check if a lead matches the lead status filter
 * @param lead - Lead object to check
 * @param leadStatuses - Array of lead status values to match
 * @returns True if lead matches any of the statuses
 */
function matchesLeadStatus(lead: Lead, leadStatuses: string[]): boolean {
  if (leadStatuses.length === 0) {
    return true;
  }

  return leadStatuses.includes(lead.leadStatus);
}

/**
 * Check if a lead matches the tags filter
 * @param lead - Lead object to check
 * @param tags - Array of tag values to match
 * @returns True if lead has any of the specified tags
 */
function matchesTags(lead: Lead, tags: string[]): boolean {
  if (tags.length === 0) {
    return true;
  }

  return tags.some(tag => lead.tags.includes(tag));
}

/**
 * Check if a lead matches the date range filter
 * @param lead - Lead object to check
 * @param fromDate - Start date (inclusive)
 * @param toDate - End date (inclusive)
 * @returns True if lead's last message date is within range
 */
function matchesDateRange(lead: Lead, fromDate: Date | null, toDate: Date | null): boolean {
  if (!lead.lastMessageDate) {
    return !fromDate && !toDate;
  }

  if (fromDate && isBefore(lead.lastMessageDate, startOfDay(fromDate))) {
    return false;
  }

  if (toDate && isAfter(lead.lastMessageDate, endOfDay(toDate))) {
    return false;
  }

  return true;
}

/**
 * Filter leads based on provided criteria
 * @param leads - Array of Lead objects to filter
 * @param criteria - Filter criteria to apply
 * @returns Filtered array of Lead objects
 */
export function filterLeads(leads: Lead[], criteria: FilterCriteria): Lead[] {
  return leads.filter(lead => 
    matchesSearch(lead, criteria.search) &&
    matchesLeadSource(lead, criteria.leadSources) &&
    matchesLeadStatus(lead, criteria.leadStatuses) &&
    matchesTags(lead, criteria.tags) &&
    matchesDateRange(lead, criteria.fromDate, criteria.toDate)
  );
}
