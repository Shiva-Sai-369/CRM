'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useProjectStore } from '@/store/projectStore';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);

  const { projects, sheets, loading, error, fetchProjects, fetchSheetsForProject } = useProjectStore();

  const project = useMemo(
    () => projects.find((item) => item.id === projectId),
    [projectId, projects]
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (!Number.isFinite(projectId)) {
      toast.error('Invalid project id');
      router.push('/projects');
      return;
    }

    fetchSheetsForProject(projectId);
  }, [fetchSheetsForProject, projectId, router]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-lg shadow-sm flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project?.name ?? 'Project'}</h1>
            <p className="text-sm text-gray-500 mt-1">Sheets for this project (read-only)</p>
          </div>
          <button
            onClick={() => router.push('/projects')}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Projects
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Google Sheets</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Populated by your external sync. This page only reads and displays rows from `google_sheets`.
            </p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-10 text-sm text-gray-600">Loading sheets…</div>
            ) : sheets.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-gray-600">No sheets found for this project.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Spreadsheet ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Sheet Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Active
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheets.map((sheet) => (
                      <tr key={sheet.id} className="border-b border-gray-100">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{sheet.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-mono">{sheet.spreadsheet_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{sheet.sheet_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {sheet.is_active ? (
                            <span className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-semibold text-green-700">
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">
                              No
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

