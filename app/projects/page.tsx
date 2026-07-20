'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  getProjects,
  createProject,
  deleteProject,
  addSheetToProject,
} from '@/lib/projectStorage';
import { getSheetTabs, type SheetTab } from '@/lib/config';
import { getSupabaseClient } from '@/lib/supabase';
import type { Project } from '@/types/project';

// Unified display type that works for both sources
interface DisplayProject {
  id: string;           // string for local, string(number) for supabase
  name: string;
  description: string;
  createdAt: string;
  source: 'local' | 'supabase';
}

async function fetchSupabaseProjects(): Promise<DisplayProject[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return (data as any[]).map(p => ({
      id: String(p.id),
      name: p.name ?? '',
      description: p.description ?? '',
      createdAt: p.created_at ?? new Date().toISOString(),
      source: 'supabase' as const,
    }));
  } catch {
    return [];
  }
}

function getLocalProjects(): DisplayProject[] {
  return getProjects().map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    createdAt: p.createdAt,
    source: 'local' as const,
  }));
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<DisplayProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [supabaseProjects, localProjects] = await Promise.all([
      fetchSupabaseProjects(),
      Promise.resolve(getLocalProjects()),
    ]);

    // Merge: avoid duplicates by name (in case same project exists in both)
    const seen = new Set<string>();
    const merged: DisplayProject[] = [];

    // Supabase first (source of truth for existing projects)
    for (const p of supabaseProjects) {
      seen.add(p.name.toLowerCase());
      merged.push(p);
    }

    // Then local projects that don't have a matching name in Supabase
    for (const p of localProjects) {
      if (!seen.has(p.name.toLowerCase())) {
        merged.push(p);
      }
    }

    // Sort by createdAt descending
    merged.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setProjects(merged);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleOpen = (project: DisplayProject) => {
    if (project.source === 'local') {
      router.push(`/projects/${project.id}`);
    } else {
      // Supabase project detail not built yet — show toast
      toast('Supabase project detail coming soon', { icon: 'ℹ️' });
    }
  };

  const handleDelete = async (project: DisplayProject, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;

    if (project.source === 'local') {
      deleteProject(project.id);
    } else {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', Number(project.id));
        if (error) throw error;
      } catch (err) {
        toast.error('Failed to delete from Supabase');
        return;
      }
    }

    toast.success(`"${project.name}" deleted`);
    refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4
          rounded-lg shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-sm text-gray-500 mt-1">
              Organize your sheet tabs by client or campaign
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold
              rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor"
              viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            New Project
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border
                border-gray-200 p-5 h-20 animate-pulse"/>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border
            border-gray-200 p-12 text-center">
            <svg className="w-14 h-14 text-gray-300 mx-auto mb-4"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0
                   00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
            </svg>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              No projects yet
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Create a project to group your sheet tabs by client
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm
                font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Project
            </button>
          </div>
        )}

        {/* Projects list */}
        {!loading && projects.length > 0 && (
          <div className="space-y-3">
            {projects.map(project => (
              <div
                key={`${project.source}-${project.id}`}
                onClick={() => handleOpen(project)}
                className="bg-white rounded-xl border border-gray-200 p-5
                  flex items-center gap-4 cursor-pointer
                  hover:border-blue-300 hover:shadow-sm transition-all"
              >
                {/* Icon */}
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex
                  items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none"
                    stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0
                         00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {project.name}
                    </p>
                    {project.source === 'supabase' && (
                      <span className="inline-flex items-center px-2 py-0.5
                        bg-green-50 border border-green-200 text-green-700
                        text-xs font-medium rounded-full flex-shrink-0">
                        Supabase
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {project.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0"
                  onClick={e => e.stopPropagation()}>
                  <button
                    onClick={e => { e.stopPropagation(); handleOpen(project); }}
                    className="px-3 py-1.5 text-xs border border-gray-200
                      rounded-lg hover:bg-gray-50 text-gray-600
                      transition-colors"
                  >
                    Open
                  </button>
                  <button
                    onClick={e => handleDelete(project, e)}
                    className="px-3 py-1.5 text-xs border border-red-200
                      text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { refresh(); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTabIds, setSelectedTabIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const savedTabs: SheetTab[] = getSheetTabs();

  const toggleTab = (id: string) =>
    setSelectedTabIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );

  const handleSubmit = () => {
    setError(null);
    try {
      const project = createProject(name, description);
      selectedTabIds.forEach(tabId => {
        const tab = savedTabs.find(t => t.id === tabId);
        if (tab) {
          addSheetToProject(project.id, {
            id: tab.id,
            name: tab.name,
            url: tab.url,
          });
        }
      });
      toast.success(`Project "${project.name}" created`);
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create project'
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex
      items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">New Project</h2>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor"
              viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200
            rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Better Castings"
              autoFocus
              className="w-full px-3 py-2 border border-gray-300
                rounded-lg text-sm focus:ring-2 focus:ring-blue-500
                focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300
                rounded-lg text-sm focus:ring-2 focus:ring-blue-500
                focus:border-transparent outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign Sheet Tabs
              <span className="ml-1 text-xs font-normal text-gray-400">
                (optional)
              </span>
            </label>
            {savedTabs.length === 0 ? (
              <div className="p-3 border border-dashed border-gray-200
                rounded-lg text-sm text-gray-400">
                No sheet tabs saved yet. Add tabs in Settings first.
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto border
                border-gray-200 rounded-lg divide-y divide-gray-100">
                {savedTabs.map(tab => (
                  <label key={tab.id}
                    className="flex items-center gap-3 px-3 py-2.5
                      hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTabIds.includes(tab.id)}
                      onChange={() => toggleTab(tab.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300
                        rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">{tab.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300
                text-gray-700 text-sm rounded-lg hover:bg-gray-50
                transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm
                font-semibold rounded-lg hover:bg-blue-700 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
