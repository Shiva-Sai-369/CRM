'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface DebugInfo {
  totalLeads: number;
  sheets: Array<{
    id: number;
    name: string;
    sheet_name: string;
    project_id: number;
    leadCount: number;
  }>;
  projects: Array<{
    id: number;
    name: string;
    sheetCount: number;
  }>;
  userAssignments: Array<{
    project_id: number;
    project_name: string;
  }>;
  sampleLeads: any[];
}

export default function DebugLeadsPage() {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<DebugInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Not logged in');
          setLoading(false);
          return;
        }

        // Get total leads
        const { count: totalLeads } = await supabase
          .from('sheet_leads')
          .select('*', { count: 'exact', head: true });

        // Get all sheets with lead counts
        const { data: sheets } = await supabase
          .from('google_sheets')
          .select('id, name, sheet_name, project_id');

        const sheetsWithCounts = await Promise.all(
          (sheets || []).map(async (sheet) => {
            const { count } = await supabase
              .from('sheet_leads')
              .select('*', { count: 'exact', head: true })
              .eq('sheet_id', sheet.id);
            return {
              ...sheet,
              leadCount: count || 0,
            };
          })
        );

        // Get all projects
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name');

        const projectsWithCounts = (projects || []).map((project) => ({
          ...project,
          sheetCount: sheetsWithCounts.filter((s) => s.project_id === project.id).length,
        }));

        // Get user's project assignments
        const { data: assignments } = await supabase
          .from('project_assignments')
          .select('project_id, projects(name)')
          .eq('user_id', user.id);

        const userAssignments = (assignments || []).map((a: any) => ({
          project_id: a.project_id,
          project_name: a.projects?.name || 'Unknown',
        }));

        // Get sample leads
        const { data: sampleLeads } = await supabase
          .from('sheet_leads')
          .select('*')
          .limit(5);

        setInfo({
          totalLeads: totalLeads || 0,
          sheets: sheetsWithCounts,
          projects: projectsWithCounts,
          userAssignments,
          sampleLeads: sampleLeads || [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDebugInfo();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading debug info...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg">
          <h2 className="text-red-900 font-semibold mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">🔍 Database Debug Info</h1>
          <p className="text-sm text-gray-500 mt-1">
            Raw data from your Supabase database - use this to diagnose sync issues.
          </p>
        </div>

        {/* Total Leads */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Total Leads in DB</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{info?.totalLeads || 0}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Total Sheets</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{info?.sheets.length || 0}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">Total Projects</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">{info?.projects.length || 0}</p>
            </div>
          </div>
        </div>

        {/* Your Access */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🔑 Your Project Access</h2>
          {info?.userAssignments && info.userAssignments.length > 0 ? (
            <div className="space-y-2">
              {info.userAssignments.map((assignment) => (
                <div
                  key={assignment.project_id}
                  className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-900 font-medium">{assignment.project_name}</span>
                  <span className="text-green-600 text-sm">(ID: {assignment.project_id})</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">⚠️ You are not assigned to any projects!</p>
              <p className="text-yellow-700 text-sm mt-1">
                This is why you can't see any leads. Ask an admin to assign you to a project.
              </p>
            </div>
          )}
        </div>

        {/* Sheets */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📑 All Sheets in Database</h2>
          {info?.sheets && info.sheets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sheet Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leads</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {info.sheets.map((sheet) => (
                    <tr key={sheet.id}>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{sheet.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{sheet.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{sheet.sheet_name}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{sheet.project_id}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          sheet.leadCount > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {sheet.leadCount} leads
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No sheets found in database.</p>
          )}
        </div>

        {/* Projects */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📁 All Projects</h2>
          {info?.projects && info.projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {info.projects.map((project) => (
                <div
                  key={project.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">ID: {project.id}</p>
                      <p className="text-sm text-gray-600">{project.sheetCount} sheet(s)</p>
                    </div>
                    {info.userAssignments.some((a) => a.project_id === project.id) && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        Your Access
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No projects found in database.</p>
          )}
        </div>

        {/* Sample Leads */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📝 Sample Leads (First 5)</h2>
          {info?.sampleLeads && info.sampleLeads.length > 0 ? (
            <div className="space-y-3">
              {info.sampleLeads.map((lead, idx) => (
                <div key={lead.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">ID</p>
                      <p className="font-mono text-gray-900">{lead.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Name</p>
                      <p className="text-gray-900">{lead.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Email</p>
                      <p className="text-gray-900 truncate">{lead.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Phone</p>
                      <p className="text-gray-900">{lead.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Sheet ID</p>
                      <p className="font-mono text-gray-900">{lead.sheet_id}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Status</p>
                      <p className="text-gray-900">{lead.status || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500 text-xs">Created</p>
                      <p className="text-gray-900 text-xs">
                        {new Date(lead.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">⚠️ No leads found in database!</p>
              <p className="text-yellow-700 text-sm mt-1">
                The sync might not be working. Check the sync API logs.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-blue-900 font-semibold mb-2">🔧 Next Steps</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>1. If "Total Leads in DB" is 0 → Sync never worked, check your CSV URL</p>
            <p>2. If leads exist but "Your Project Access" is empty → You need to be assigned to a project</p>
            <p>3. If you have access but see 0 leads on Enquiries page → Check RLS policies in Supabase</p>
          </div>
          <div className="flex gap-3 mt-4">
            <a
              href="/settings"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
            >
              Go to Settings
            </a>
            <a
              href="/enquiries"
              className="px-4 py-2 border border-blue-600 text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50"
            >
              Go to Enquiries
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
