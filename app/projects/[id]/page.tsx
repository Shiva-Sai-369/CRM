'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  getProjectById,
  getProjectSheets,
  updateProject,
  addSheetToProject,
  removeSheetFromProject,
} from '@/lib/projectStorage';
import { getSheetTabs } from '@/lib/config';
import { fetchLeadsFromTab } from '@/lib/services/fetchLeads';
import type { Project, ProjectSheet } from '@/types/project';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [sheets, setSheets] = useState<ProjectSheet[]>([]);
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showAddSheet, setShowAddSheet] = useState(false);

  const refresh = useCallback(() => {
    const p = getProjectById(projectId);
    if (!p) { router.push('/projects'); return; }
    setProject(p);
    setSheets(getProjectSheets(projectId));
  }, [projectId, router]);

  useEffect(() => { refresh(); }, [refresh]);

  // Fetch lead counts for each linked sheet tab
  useEffect(() => {
    if (sheets.length === 0) return;
    setLoadingCounts(true);
    Promise.allSettled(
      sheets.map(async s => {
        const result = await fetchLeadsFromTab({ id: s.tabId, name: s.tabName, url: s.tabUrl, addedAt: s.addedAt });
        return { tabId: s.tabId, count: result.leads.length };
      })
    ).then(results => {
      const counts: Record<string, number> = {};
      results.forEach(r => {
        if (r.status === 'fulfilled') counts[r.value.tabId] = r.value.count;
      });
      setLeadCounts(counts);
      setLoadingCounts(false);
    });
  }, [sheets]);

  const totalLeads = Object.values(leadCounts).reduce((a, b) => a + b, 0);

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    try {
      updateProject(projectId, { name: editName, description: editDesc });
      refresh();
      setEditing(false);
      toast.success('Project updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleRemoveSheet = (sheet: ProjectSheet) => {
    removeSheetFromProject(projectId, sheet.tabId);
    refresh();
    toast.success(`"${sheet.tabName}" removed from project`);
  };

  if (!project) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4
          rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.push('/projects')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor"
                viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </button>

            {editing ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="px-2 py-1 border border-blue-400 rounded-lg
                    text-lg font-bold text-gray-900 focus:outline-none
                    focus:ring-2 focus:ring-blue-500 w-64"
                  autoFocus
                />
                <button onClick={handleSaveEdit}
                  className="px-3 py-1 bg-blue-600 text-white text-xs
                    font-semibold rounded-lg hover:bg-blue-700">
                  Save
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-3 py-1 border border-gray-300 text-gray-600
                    text-xs rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {project.name}
                </h1>
                <button
                  onClick={() => {
                    setEditName(project.name);
                    setEditDesc(project.description);
                    setEditing(true);
                  }}
                  className="text-gray-400 hover:text-gray-600
                    transition-colors p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0
                         002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828
                         15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <input
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              placeholder="Description"
              className="mt-1 ml-8 w-full px-2 py-1 border border-gray-300
                rounded text-sm text-gray-600 focus:outline-none
                focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            project.description && (
              <p className="text-sm text-gray-500 ml-8">
                {project.description}
              </p>
            )
          )}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Connected Sheets',
              value: sheets.length,
              color: 'bg-blue-50 text-blue-700',
            },
            {
              label: 'Total Leads',
              value: loadingCounts ? '...' : totalLeads,
              color: 'bg-green-50 text-green-700',
            },
            {
              label: 'Created',
              value: new Date(project.createdAt).toLocaleDateString(),
              color: 'bg-purple-50 text-purple-700',
            },
          ].map(stat => (
            <div key={stat.label}
              className="bg-white rounded-xl border border-gray-200
                p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase
                tracking-wider mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color} rounded px-2
                py-0.5 inline-block`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Linked sheets */}
        <div className="bg-white rounded-xl shadow-sm border
          border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50
            flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Linked Sheet Tabs
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                These tabs load together when viewing this project
              </p>
            </div>
            <button
              onClick={() => setShowAddSheet(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs
                font-semibold rounded-lg hover:bg-blue-700
                transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none"
                stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              Add Tab
            </button>
          </div>

          {sheets.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-gray-400">
                No sheet tabs linked yet.
              </p>
              <button
                onClick={() => setShowAddSheet(true)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm
                  font-semibold rounded-lg hover:bg-blue-700
                  transition-colors"
              >
                Add Sheet Tab
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sheets.map(sheet => (
                <div key={sheet.id}
                  className="flex items-center gap-4 px-6 py-4
                    hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-green-50 rounded-lg
                    flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-green-600" fill="none"
                      stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5
                           a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414
                           5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800
                      truncate">{sheet.tabName}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {loadingCounts
                        ? 'Fetching...'
                        : `${leadCounts[sheet.tabId] ?? 0} leads`}
                      {' · '}
                      Added {new Date(sheet.addedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRemoveSheet(sheet)}
                    className="text-xs text-red-500 hover:text-red-700
                      px-2 py-1 rounded hover:bg-red-50 transition-colors
                      flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add sheet modal */}
      {showAddSheet && (
        <AddSheetModal
          projectId={projectId}
          existingTabIds={sheets.map(s => s.tabId)}
          onClose={() => setShowAddSheet(false)}
          onAdded={() => { refresh(); setShowAddSheet(false); }}
        />
      )}
    </div>
  );
}

function AddSheetModal({
  projectId,
  existingTabIds,
  onClose,
  onAdded,
}: {
  projectId: string;
  existingTabIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const allTabs = getSheetTabs();
  const available = allTabs.filter(t => !existingTabIds.includes(t.id));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );

  const handleAdd = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => {
      const tab = allTabs.find(t => t.id === id);
      if (tab) addSheetToProject(projectId, tab);
    });
    toast.success(
      `${selectedIds.length} tab${selectedIds.length > 1 ? 's' : ''} added`
    );
    onAdded();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex
      items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">
            Add Sheet Tab
          </h2>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor"
              viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {available.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            All saved tabs are already linked to this project.
          </p>
        ) : (
          <div className="max-h-52 overflow-y-auto border border-gray-200
            rounded-lg divide-y divide-gray-100 mb-4">
            {available.map(tab => (
              <label key={tab.id}
                className="flex items-center gap-3 px-3 py-3
                  hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(tab.id)}
                  onChange={() => toggle(tab.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300
                    rounded focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700">{tab.name}</span>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300
              text-gray-700 text-sm rounded-lg hover:bg-gray-50
              transition-colors">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selectedIds.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm
              font-semibold rounded-lg hover:bg-blue-700 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed">
            Add {selectedIds.length > 0 ? selectedIds.length : ''} Tab
            {selectedIds.length > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
