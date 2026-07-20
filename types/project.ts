/**
 * A Project groups sheet tabs together under one client/campaign name.
 * Example: "Better Castings", "Grammar Workout"
 */
export interface Project {
  id: string;               // uuid
  name: string;
  description: string;
  createdAt: string;        // ISO timestamp
  updatedAt: string;
}

/**
 * A ProjectSheet links a saved SheetTab to a Project.
 * The tabId references SheetTab.id from localStorage 'sheetTabs'.
 */
export interface ProjectSheet {
  id: string;               // uuid
  projectId: string;        // FK → Project.id
  tabId: string;            // FK → SheetTab.id
  tabName: string;          // denormalized for display without extra lookup
  tabUrl: string;           // denormalized CSV URL
  addedAt: string;
}

export interface ProjectStoreData {
  projects: Project[];
  projectSheets: ProjectSheet[];
}