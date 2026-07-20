import type { Project, ProjectSheet, ProjectStoreData } from '@/types/project';

const STORAGE_KEY = 'crmProjects';

/**
 * Reads the full project store from localStorage.
 * Returns empty arrays if nothing is stored yet.
 */
function readStore(): ProjectStoreData {
  if (typeof window === 'undefined') {
    return { projects: [], projectSheets: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { projects: [], projectSheets: [] };
    return JSON.parse(raw) as ProjectStoreData;
  } catch {
    return { projects: [], projectSheets: [] };
  }
}

/**
 * Writes the full project store to localStorage.
 */
function writeStore(data: ProjectStoreData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Projects ──────────────────────────────────────────────

/** Returns all projects, newest first. */
export function getProjects(): Project[] {
  return readStore().projects.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Returns a single project by id, or null if not found. */
export function getProjectById(id: string): Project | null {
  return readStore().projects.find(p => p.id === id) ?? null;
}

/**
 * Creates a new project.
 * Throws if a project with the same name already exists.
 */
export function createProject(
  name: string,
  description: string
): Project {
  const store = readStore();
  const trimmed = name.trim();

  if (!trimmed) throw new Error('Project name is required');

  if (store.projects.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error(`A project named "${trimmed}" already exists`);
  }

  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID(),
    name: trimmed,
    description: description.trim(),
    createdAt: now,
    updatedAt: now,
  };

  store.projects.push(project);
  writeStore(store);
  return project;
}

/**
 * Updates a project's name and/or description.
 */
export function updateProject(
  id: string,
  updates: { name?: string; description?: string }
): Project {
  const store = readStore();
  const index = store.projects.findIndex(p => p.id === id);
  if (index === -1) throw new Error('Project not found');

  store.projects[index] = {
    ...store.projects[index],
    ...(updates.name ? { name: updates.name.trim() } : {}),
    ...(updates.description !== undefined
      ? { description: updates.description.trim() }
      : {}),
    updatedAt: new Date().toISOString(),
  };

  writeStore(store);
  return store.projects[index];
}

/**
 * Deletes a project and all its sheet links.
 */
export function deleteProject(id: string): void {
  const store = readStore();
  store.projects = store.projects.filter(p => p.id !== id);
  store.projectSheets = store.projectSheets.filter(ps => ps.projectId !== id);
  writeStore(store);
}

// ── Project Sheets ─────────────────────────────────────────

/**
 * Returns all sheet tabs linked to a specific project.
 */
export function getProjectSheets(projectId: string): ProjectSheet[] {
  return readStore().projectSheets
    .filter(ps => ps.projectId === projectId)
    .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
}

/**
 * Links a SheetTab to a project.
 * Silently skips if the tab is already linked to this project.
 */
export function addSheetToProject(
  projectId: string,
  tab: { id: string; name: string; url: string }
): ProjectSheet | null {
  const store = readStore();

  const alreadyLinked = store.projectSheets.some(
    ps => ps.projectId === projectId && ps.tabId === tab.id
  );
  if (alreadyLinked) return null;

  const link: ProjectSheet = {
    id: crypto.randomUUID(),
    projectId,
    tabId: tab.id,
    tabName: tab.name,
    tabUrl: tab.url,
    addedAt: new Date().toISOString(),
  };

  store.projectSheets.push(link);
  writeStore(store);
  return link;
}

/**
 * Removes a sheet tab from a project.
 */
export function removeSheetFromProject(
  projectId: string,
  tabId: string
): void {
  const store = readStore();
  store.projectSheets = store.projectSheets.filter(
    ps => !(ps.projectId === projectId && ps.tabId === tabId)
  );
  writeStore(store);
}

/**
 * Returns the number of projects a given tab is linked to.
 * Used to show "Used in X projects" in Settings.
 */
export function getTabProjectCount(tabId: string): number {
  return readStore().projectSheets.filter(ps => ps.tabId === tabId).length;
}
