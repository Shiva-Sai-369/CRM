/**
 * Project-related type definitions.
 * Flat relational structure for easy migration to Supabase later.
 */

import { SheetTab } from '@/lib/config';

/**
 * Type of Google Sheet access method.
 * - "public": Sheet published to web, discoverable via Google Sheets API
 * - "private": Individual tab published as CSV URL, manually pasted
 */
export type SheetType = "public" | "private";

/**
 * A Project is a named bucket for organizing Sheets and Tabs.
 * Example: "Better Castings", "Grammar Workout"
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

/**
 * A Sheet belongs to a Project and represents a Google Sheets document.
 * 
 * For "public" sheets: sheetIdOrKey contains the Google Sheet ID
 * For "private" sheets: sheetIdOrKey is empty (tabs have direct CSV URLs)
 */
export interface Sheet {
  id: string;
  projectId: string;
  type: SheetType;
  label: string;
  sheetIdOrKey: string; // Google Sheet ID for public sheets, empty for private
  createdAt: string;
}

/**
 * Extended SheetTab type with foreign key to parent Sheet.
 * 
 * A Tab belongs to a Sheet and is what actually gets fetched into the Enquiries page.
 * Extends the original SheetTab interface from '@/lib/config'.
 */
export interface ProjectSheetTab extends Omit<import('@/lib/config').SheetTab, 'id' | 'addedAt'> {
  id: string;
  name: string;
  url: string;
  addedAt: string;
  sheetId: string; // Foreign key to Sheet.id
  included: boolean;
}

/**
 * Migration record for tracking one-time migrations.
 */
export interface Migration {
  id: string;
  name: string;
  appliedAt: string;
}

/**
 * Project store state structure.
 */
export interface ProjectStoreState {
  // Flat arrays with foreign key references
  projects: Project[];
  sheets: Sheet[];
  tabs: ProjectSheetTab[];
  
  // Active project ID for UI state
  activeProjectId: string | null;
  
  // Migrations applied
  migrations: Migration[];
}