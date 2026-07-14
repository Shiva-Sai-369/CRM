import Papa from "papaparse";
import { parse as parseDate, isValid } from "date-fns";

/**
 * Lead data structure with all fields strictly typed
 */
export interface Lead {
  name: string;
  email: string;
  phone: string;
  leadSource: string;
  leadStatus: string;
  tags: string[];
  lastMessage: string;
  lastMessageDate: Date | null;
  notes: string;
  platform: string;
  uniqueKey: string;
  company?: string;
  // Additional fields from Facebook/Instagram leads
  adName?: string;
  campaignName?: string;
  formName?: string;
  educationLevel?: string;
  adsetName?: string;
  campaignId?: string;
  adsetId?: string;
  adId?: string;
  formId?: string;
  isOrganic?: string;
}

/**
 * Raw CSV row structure before parsing
 * Supports multiple column name formats
 */
interface RawCsvRow {
  // Standard column names
  Name?: string;
  Email?: string;
  Phone?: string;
  "Lead Source"?: string;
  "Lead Status"?: string;
  Tags?: string;
  "Last Message"?: string;
  "Last Message Date"?: string;
  Notes?: string;
  Platform?: string;
  
  // Alternative column names (from Facebook/Instagram forms)
  full_name?: string;
  phone_number?: string;
  email?: string;
  lead_status?: string;
  campaign_name?: string;
  platform?: string;
  form_name?: string;
  created_time?: string;
  ad_name?: string;
  education_level?: string;
  adset_name?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  form_id?: string;
  is_organic?: string;
}

/**
 * Parse a date string with multiple format support
 * Supports ISO timestamps, Unix timestamps, and common date formats
 * @param dateStr - Date string to parse
 * @returns Parsed Date object or null if invalid
 */
function parseDateString(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) {
    return null;
  }

  const trimmed = dateStr.trim();

  // Try parsing Unix timestamp (seconds or milliseconds)
  const timestamp = Number(trimmed);
  if (!isNaN(timestamp)) {
    // If it's a reasonable timestamp (after year 2000)
    const date = timestamp > 1000000000 && timestamp < 10000000000
      ? new Date(timestamp * 1000) // Unix timestamp in seconds
      : new Date(timestamp); // Already in milliseconds
    
    if (isValid(date)) {
      return date;
    }
  }

  // Try ISO 8601 format (2023-12-25T10:30:00Z)
  const isoDate = new Date(trimmed);
  if (isValid(isoDate)) {
    return isoDate;
  }

  // Try common date formats
  const formats = ["dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "yyyy/MM/dd", "dd-MM-yyyy"];
  
  for (const format of formats) {
    const parsed = parseDate(trimmed, format, new Date());
    if (isValid(parsed)) {
      return parsed;
    }
  }
  
  return null;
}

/**
 * Normalize a string to title case
 * @param str - String to normalize
 * @returns Title case string
 */
function toTitleCase(str: string): string {
  return str
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Parse and normalize tags from comma-separated string
 * @param tagsStr - Comma-separated tags string
 * @returns Array of normalized tag strings
 */
function parseTags(tagsStr: string): string[] {
  if (!tagsStr || !tagsStr.trim()) {
    return [];
  }
  
  return tagsStr
    .split(",")
    .map(tag => toTitleCase(tag.trim()))
    .filter(tag => tag.length > 0);
}

/**
 * Generate unique key for a lead based on email or name+phone
 * @param email - Email address
 * @param name - Lead name
 * @param phone - Phone number
 * @returns Unique key string
 */
function generateUniqueKey(email: string, name: string, phone: string): string {
  if (email && email.trim()) {
    return email.trim().toLowerCase();
  }
  return `${name.trim()}-${phone.trim()}`.toLowerCase();
}

/**
 * Parse a raw CSV row into a Lead object
 * Supports multiple column name formats
 * @param row - Raw CSV row data
 * @returns Parsed Lead object
 */
function parseRow(row: RawCsvRow): Lead {
  // Support both standard and alternative column names
  const name = (row.Name || row.full_name || "Unknown").trim();
  const email = (row.Email || row.email || "").trim();
  const phone = (row.Phone || row.phone_number || "").trim();
  const leadSource = (row["Lead Source"] || row.form_name || row.campaign_name || "Direct").trim();
  const leadStatus = toTitleCase((row["Lead Status"] || row.lead_status || "New Lead").trim());
  const tags = parseTags(row.Tags || "");
  const lastMessage = (row["Last Message"] || "").trim();
  
  // Use created_time as the primary date field
  const lastMessageDate = parseDateString(row.created_time || row["Last Message Date"] || "");
  
  const notes = (row.Notes || "").trim();
  const platform = (row.Platform || row.platform || "Facebook").trim();
  const uniqueKey = generateUniqueKey(email, name, phone);
  
  // Additional fields from Facebook/Instagram leads
  const adName = (row.ad_name || "").trim();
  const campaignName = (row.campaign_name || "").trim();
  const formName = (row.form_name || "").trim();
  const educationLevel = (row.education_level || "").trim();
  const adsetName = (row.adset_name || "").trim();
  const campaignId = (row.campaign_id || "").trim();
  const adsetId = (row.adset_id || "").trim();
  const adId = (row.ad_id || "").trim();
  const formId = (row.form_id || "").trim();
  const isOrganic = (row.is_organic || "").trim();

  return {
    name,
    email,
    phone,
    leadSource,
    leadStatus,
    tags,
    lastMessage,
    lastMessageDate,
    notes,
    platform,
    uniqueKey,
    adName,
    campaignName,
    formName,
    educationLevel,
    adsetName,
    campaignId,
    adsetId,
    adId,
    formId,
    isOrganic,
  };
}

/**
 * Deduplicate leads by unique key, keeping the latest by Last Message Date
 * @param leads - Array of Lead objects
 * @returns Deduplicated array of Leads
 */
function deduplicateLeads(leads: Lead[]): Lead[] {
  const leadMap = new Map<string, Lead>();

  for (const lead of leads) {
    const existing = leadMap.get(lead.uniqueKey);
    
    if (!existing) {
      leadMap.set(lead.uniqueKey, lead);
      continue;
    }

    // Keep the lead with the latest date
    if (!lead.lastMessageDate) {
      continue;
    }
    
    if (!existing.lastMessageDate || lead.lastMessageDate > existing.lastMessageDate) {
      leadMap.set(lead.uniqueKey, lead);
    }
  }

  return Array.from(leadMap.values());
}

/**
 * Parse CSV data into an array of Lead objects
 * @param csvData - Raw CSV string data
 * @returns Array of parsed and deduplicated Lead objects
 */
export function parseLeadsFromCsv(csvData: string): Lead[] {
  const parseResult = Papa.parse<RawCsvRow>(csvData, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const leads = parseResult.data.map(parseRow);
  return deduplicateLeads(leads);
}

/**
 * Fetch and parse leads from a CSV URL
 * @deprecated Use fetchLeads from '@/lib/services/fetchLeads' instead
 * @param url - CSV URL to fetch from
 * @returns Promise resolving to array of Lead objects
 */
export async function fetchLeads(url: string): Promise<Lead[]> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.statusText}`);
  }
  
  const csvData = await response.text();
  return parseLeadsFromCsv(csvData);
}
