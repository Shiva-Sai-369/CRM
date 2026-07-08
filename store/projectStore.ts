import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project, Sheet, ProjectSheetTab, Migration, SheetType } from "@/types/project";
import { getSheetTabs } from "@/lib/config";

/**
 * Project store state and actions.
 * Uses flat relational arrays (projects[], sheets[], tabs[]) with foreign keys.
 * Includes one-time migration from legacy SheetTab[] format.
 */
interface ProjectStoreState {
  // Data
  projects: Project[];
  sheets: Sheet[];
  tabs: ProjectSheetTab[];
  activeProjectId: string | null;
  migrations: Migration[];

  // Project actions
  addProject: (project: Omit<Project, "id" | "createdAt">) => Project;
  updateProject: (id: string, updates: Partial<Omit<Project, "id" | "createdAt">>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (projectId: string | null) => void;

  // Sheet actions
  addSheet: (projectId: string, type: SheetType, label: string, sheetIdOrKey: string) => Sheet;
  updateSheet: (id: string, updates: Partial<Omit<Sheet, "id" | "createdAt">>) => void;
  deleteSheet: (sheetId: string) => void;
  getSheetsForProject: (projectId: string) => Sheet[];

  // Tab actions
  addTab: (tab: Omit<ProjectSheetTab, "id" | "addedAt">) => ProjectSheetTab;
  addTabs: (sheetId: string, tabs: Omit<ProjectSheetTab, "id" | "sheetId">[]) => void;
  toggleTabIncluded: (tabId: string) => void;
  deleteTab: (tabId: string) => void;
  updateTab: (id: string, updates: Partial<Omit<ProjectSheetTab, "id" | "addedAt">>) => void;
  deleteTabBySheetId: (sheetId: string) => void;

  // Migration
  runLegacyMigration: () => void;
}

/**
 * Zustand store with localStorage persistence.
 */
export const useProjectStore = create<ProjectStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      projects: [],
      sheets: [],
      tabs: [],
      activeProjectId: null,
      migrations: [],

      // Project actions
      addProject: (projectData) => {
        const newProject: Project = {
          id: crypto.randomUUID(),
          name: projectData.name,
          description: projectData.description,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          projects: [...state.projects, newProject],
          activeProjectId: state.activeProjectId || newProject.id,
        }));

        return newProject;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id
              ? { ...project, ...updates }
              : project
          ),
        }));
      },

      deleteProject: (id) => {
        const state = get();
        
        // Delete all sheets and tabs belonging to this project
        const sheetsToDelete = state.sheets.filter((sheet) => sheet.projectId === id);
        const sheetIdsToDelete = new Set(sheetsToDelete.map((s) => s.id));
        
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          sheets: state.sheets.filter((s) => s.projectId !== id),
          tabs: state.tabs.filter((t) => !sheetIdsToDelete.has(t.sheetId)),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        }));
      },

      setActiveProject: (projectId) => {
        set({ activeProjectId: projectId });
      },

      // Sheet actions
      addSheet: (projectId, type, label, sheetIdOrKey) => {
        const newSheet: Sheet = {
          id: crypto.randomUUID(),
          projectId,
          type,
          label,
          sheetIdOrKey,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          sheets: [...state.sheets, newSheet],
        }));

        return newSheet;
      },

      updateSheet: (id, updates) => {
        set((state) => ({
          sheets: state.sheets.map((sheet) =>
            sheet.id === id
              ? { ...sheet, ...updates }
              : sheet
          ),
        }));
      },

      deleteSheet: (sheetId) => {
        set((state) => ({
          sheets: state.sheets.filter((s) => s.id !== sheetId),
          tabs: state.tabs.filter((t) => t.sheetId !== sheetId),
        }));
      },

      getSheetsForProject: (projectId) => {
        const state = get();
        return state.sheets.filter((sheet) => sheet.projectId === projectId);
      },

      // Tab actions
      addTab: (tabData) => {
        const newTab: ProjectSheetTab = {
          id: crypto.randomUUID(),
          name: tabData.name,
          url: tabData.url,
          sheetId: tabData.sheetId,
          addedAt: new Date().toISOString(),
          included: tabData.included ?? true,
        };

        set((state) => ({
          tabs: [...state.tabs, newTab],
        }));

        return newTab;
      },

      addTabs: (sheetId, tabsData) => {
        const newTabs: ProjectSheetTab[] = tabsData.map((tabData) => ({
          id: crypto.randomUUID(),
          name: tabData.name,
          url: tabData.url,
          sheetId,
          addedAt: tabData.addedAt,
          included: tabData.included ?? true,
        }));

        set((state) => ({
          tabs: [...state.tabs, ...newTabs],
        }));
      },

      toggleTabIncluded: (tabId) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? { ...tab, included: !(tab.included ?? true) }
              : tab
          ),
        }));
      },

      deleteTab: (tabId) => {
        set((state) => ({
          tabs: state.tabs.filter((t) => t.id !== tabId),
        }));
      },

      updateTab: (id, updates) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === id
              ? { ...tab, ...updates }
              : tab
          ),
        }));
      },

      deleteTabBySheetId: (sheetId) => {
        set((state) => ({
          tabs: state.tabs.filter((t) => t.sheetId !== sheetId),
        }));
      },

      // Migration: Convert legacy SheetTab[] to new relational structure
      runLegacyMigration: () => {
        const state = get();
        
        // Check if migration already ran
        if (state.migrations.some((m) => m.name === "legacy_sheet_tabs")) {
          return;
        }

        // Get legacy tabs
        const legacyTabs = getSheetTabs();
        if (legacyTabs.length === 0) {
          // Still record migration
          const migration: Migration = {
            id: crypto.randomUUID(),
            name: "legacy_sheet_tabs",
            appliedAt: new Date().toISOString(),
          };
          
          set((state) => ({
            migrations: [...state.migrations, migration],
          }));
          return;
        }

        // Create default project
        const defaultProject: Project = {
          id: crypto.randomUUID(),
          name: "Default",
          description: "Migrated from legacy tabs",
          createdAt: new Date().toISOString(),
        };

        // Create legacy sheets
        const publicSheet: Sheet = {
          id: crypto.randomUUID(),
          projectId: defaultProject.id,
          type: "public",
          label: "Legacy Public Sheet",
          sheetIdOrKey: "",
          createdAt: new Date().toISOString(),
        };

        const privateSheet: Sheet = {
          id: crypto.randomUUID(),
          projectId: defaultProject.id,
          type: "private",
          label: "Legacy Private Sheet",
          sheetIdOrKey: "",
          createdAt: new Date().toISOString(),
        };

        // Migrate tabs to appropriate sheet based on URL
        const migratedTabs: ProjectSheetTab[] = legacyTabs.map((legacyTab) => {
          // Determine if tab is public or private based on URL pattern
          // Simple heuristic: public sheets have sheet ID in URL
          const isPublic = legacyTab.url.includes("/spreadsheets/d/");
          const targetSheetId = isPublic ? publicSheet.id : privateSheet.id;
          
          return {
            ...legacyTab,
            sheetId: targetSheetId,
          };
        });

        const migration: Migration = {
          id: crypto.randomUUID(),
          name: "legacy_sheet_tabs",
          appliedAt: new Date().toISOString(),
        };

        set({
          projects: [defaultProject],
          sheets: [publicSheet, privateSheet],
          tabs: migratedTabs,
          activeProjectId: defaultProject.id,
          migrations: [...state.migrations, migration],
        });

        // Remove legacy localStorage key to prevent re-migration
        if (typeof window !== "undefined") {
          localStorage.removeItem("sheetTabs");
          localStorage.removeItem("sheetDBUrl");
          localStorage.removeItem("sheetUrl");
          localStorage.removeItem("sheetScriptUrl");
          localStorage.removeItem("sheetCsvUrl");
        }
      },
    }),
    {
      name: "crm-projects-store",
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<ProjectStoreState>;

        return {
          projects: state.projects ?? [],
          sheets: state.sheets ?? [],
          tabs: (state.tabs ?? []).map((tab) => ({
            ...tab,
            included: tab.included ?? true,
          })),
          activeProjectId: state.activeProjectId ?? null,
          migrations: state.migrations ?? [],
        };
      },
    }
  )
);

/**
 * Selector: Get all sheets for a specific project.
 */
export function getSheetsForProject(projectId: string): Sheet[] {
  return useProjectStore.getState().getSheetsForProject(projectId);
}

/**
 * Selector: Get all tabs for a specific sheet.
 */
export function getTabsForSheet(sheetId: string): ProjectSheetTab[] {
  const state = useProjectStore.getState();
  return state.tabs.filter((tab) => tab.sheetId === sheetId);
}

/**
 * Selector: Get all included tabs, optionally scoped to active project.
 * @param projectId - If provided, only returns tabs from this project. If null, returns all tabs.
 */
export function getIncludedTabs(projectId?: string | null): ProjectSheetTab[] {
  const state = useProjectStore.getState();
  
  if (projectId) {
    // Get sheets for this project
    const projectSheets = state.sheets.filter((sheet) => sheet.projectId === projectId);
    const projectSheetIds = new Set(projectSheets.map((s) => s.id));
    
    // Return tabs belonging to these sheets
    return state.tabs.filter((tab) => projectSheetIds.has(tab.sheetId));
  }
  
  // Return all tabs
  return state.tabs;
}

/**
 * Selector: Get tabs for the active project.
 */
export function getActiveProjectTabs(): ProjectSheetTab[] {
  const state = useProjectStore.getState();
  const activeProjectId = state.activeProjectId;
  
  if (!activeProjectId) {
    return state.tabs; // No active project, return all tabs
  }
  
  return getIncludedTabs(activeProjectId);
}

/**
 * Selector: Get counts for a project (sheets and tabs).
 */
export function getProjectCounts(projectId: string): { sheets: number; tabs: number } {
  const state = useProjectStore.getState();
  
  const sheets = state.sheets.filter((sheet) => sheet.projectId === projectId);
  const sheetIds = new Set(sheets.map((s) => s.id));
  
  const tabs = state.tabs.filter((tab) => sheetIds.has(tab.sheetId));
  
  return {
    sheets: sheets.length,
    tabs: tabs.length,
  };
}

/**
 * Helper: Run migration on store initialization.
 * Should be called once when the app loads.
 */
export function initializeProjectStore(): void {
  const store = useProjectStore.getState();
  store.runLegacyMigration();
}