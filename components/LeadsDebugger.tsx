"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * Temporary debugging component to diagnose "43 leads found but 0 displayed" issue.
 * 
 * Usage: Add to enquiries page temporarily:
 * import LeadsDebugger from "@/components/LeadsDebugger";
 * 
 * Then add in the component:
 * {process.env.NODE_ENV === 'development' && <LeadsDebugger />}
 */
export default function LeadsDebugger() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  async function runDiagnostics() {
    setLoading(true);
    const supabase = getSupabaseClient();
    const diagnostics: any = {};

    try {
      // 1. Check current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      diagnostics.currentUser = user ? {
        id: user.id,
        email: user.email,
        error: null
      } : { error: userError?.message || 'No user' };

      if (!user) {
        setResults(diagnostics);
        setLoading(false);
        return;
      }

      // 2. Check user profile and role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, is_active')
        .eq('id', user.id)
        .single();
      diagnostics.userProfile = profile || { error: profileError?.message };

      // 3. Check project assignments
      const { data: assignments, error: assignError } = await supabase
        .from('project_assignments')
        .select('project_id')
        .eq('user_id', user.id);
      diagnostics.projectAssignments = assignments || { error: assignError?.message };

      // 4. Check all projects
      const { data: allProjects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .order('created_at', { ascending: false });
      diagnostics.allProjects = allProjects || { error: projectsError?.message };

      // 5. Check sheets
      const { data: allSheets, error: sheetsError } = await supabase
        .from('google_sheets')
        .select('id, name, project_id')
        .order('created_at', { ascending: false });
      diagnostics.allSheets = allSheets || { error: sheetsError?.message };

      // 6. Check leads count
      const { count: totalLeads, error: leadsCountError } = await supabase
        .from('sheet_leads')
        .select('*', { count: 'exact', head: true });
      diagnostics.totalLeadsInDB = totalLeads ?? { error: leadsCountError?.message };

      // 7. Check recent leads and their sheets
      const { data: recentLeads, error: recentLeadsError } = await supabase
        .from('sheet_leads')
        .select('id, name, email, sheet_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      diagnostics.recentLeads = recentLeads || { error: recentLeadsError?.message };

      // 8. Group leads by sheet_id
      if (recentLeads && recentLeads.length > 0) {
        const leadsBySheet: Record<number, number> = {};
        recentLeads.forEach((lead: any) => {
          leadsBySheet[lead.sheet_id] = (leadsBySheet[lead.sheet_id] || 0) + 1;
        });
        diagnostics.leadsBySheetId = leadsBySheet;
      }

      // 9. Check if user can access sheets with leads
      if (allSheets && assignments && profile?.role !== 'super_admin') {
        const assignedProjectIds = assignments.map((a: any) => a.project_id);
        const accessibleSheets = allSheets.filter((s: any) => 
          assignedProjectIds.includes(s.project_id)
        );
        diagnostics.accessibleSheets = accessibleSheets;
        
        const inaccessibleSheets = allSheets.filter((s: any) => 
          !assignedProjectIds.includes(s.project_id)
        );
        diagnostics.inaccessibleSheets = inaccessibleSheets;
      }

      // 10. Check sessionStorage
      if (typeof window !== 'undefined') {
        diagnostics.sessionStorage = {
          selectedProjectId: sessionStorage.getItem('selectedProjectId'),
          selectedSheetId: sessionStorage.getItem('selectedSheetId')
        };
      }

    } catch (error) {
      diagnostics.error = error instanceof Error ? error.message : 'Unknown error';
    }

    setResults(diagnostics);
    setLoading(false);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700 z-50 text-sm font-semibold"
        title="Debug leads issue"
      >
        🔍 Debug Leads
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Leads Diagnostics</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:text-red-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!results ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                This tool will help diagnose why leads aren't showing up in the Enquiries page.
              </p>
              <button
                onClick={runDiagnostics}
                disabled={loading}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold"
              >
                {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current User */}
              <Section title="1. Current User">
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                  {JSON.stringify(results.currentUser, null, 2)}
                </pre>
              </Section>

              {/* User Profile */}
              <Section title="2. User Profile & Role">
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                  {JSON.stringify(results.userProfile, null, 2)}
                </pre>
                {results.userProfile?.role && (
                  <div className={`mt-2 p-2 rounded text-sm ${
                    results.userProfile.role === 'super_admin' 
                      ? 'bg-green-50 text-green-800' 
                      : 'bg-yellow-50 text-yellow-800'
                  }`}>
                    Role: <strong>{results.userProfile.role}</strong>
                    {results.userProfile.role !== 'super_admin' && (
                      <p className="mt-1 text-xs">⚠️ Not a super admin - can only see assigned projects</p>
                    )}
                  </div>
                )}
              </Section>

              {/* Project Assignments */}
              <Section title="3. Project Assignments">
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                  {JSON.stringify(results.projectAssignments, null, 2)}
                </pre>
                {Array.isArray(results.projectAssignments) && results.projectAssignments.length === 0 && (
                  <div className="mt-2 p-2 rounded text-sm bg-red-50 text-red-800">
                    ⛔ No project assignments found! You won't see any leads unless you're a super admin.
                  </div>
                )}
              </Section>

              {/* All Projects */}
              <Section title="4. All Projects in Database">
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                  {JSON.stringify(results.allProjects, null, 2)}
                </pre>
              </Section>

              {/* All Sheets */}
              <Section title="5. All Sheets in Database">
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                  {JSON.stringify(results.allSheets, null, 2)}
                </pre>
              </Section>

              {/* Leads Count */}
              <Section title="6. Total Leads in Database">
                <div className="text-2xl font-bold text-gray-900">
                  {results.totalLeadsInDB}
                </div>
                {results.totalLeadsInDB === 0 && (
                  <div className="mt-2 p-2 rounded text-sm bg-red-50 text-red-800">
                    ⛔ No leads in database! The sync might have failed.
                  </div>
                )}
              </Section>

              {/* Recent Leads */}
              <Section title="7. Recent Leads (Last 10)">
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                  {JSON.stringify(results.recentLeads, null, 2)}
                </pre>
              </Section>

              {/* Leads by Sheet */}
              {results.leadsBySheetId && (
                <Section title="8. Leads Grouped by Sheet ID">
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(results.leadsBySheetId, null, 2)}
                  </pre>
                </Section>
              )}

              {/* Accessible vs Inaccessible Sheets */}
              {results.accessibleSheets && (
                <Section title="9. Sheets You Can Access">
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(results.accessibleSheets, null, 2)}
                  </pre>
                  {results.accessibleSheets.length === 0 && (
                    <div className="mt-2 p-2 rounded text-sm bg-red-50 text-red-800">
                      ⛔ You can't access any sheets! This is why no leads are showing.
                    </div>
                  )}
                </Section>
              )}

              {results.inaccessibleSheets && results.inaccessibleSheets.length > 0 && (
                <Section title="10. Sheets You CANNOT Access">
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(results.inaccessibleSheets, null, 2)}
                  </pre>
                  <div className="mt-2 p-2 rounded text-sm bg-yellow-50 text-yellow-800">
                    ⚠️ These sheets contain leads you can't see. Ask admin to assign you to these projects.
                  </div>
                </Section>
              )}

              {/* Session Storage */}
              <Section title="11. Session Storage State">
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                  {JSON.stringify(results.sessionStorage, null, 2)}
                </pre>
              </Section>

              {/* Summary & Recommendations */}
              <Section title="🔍 Summary & Recommendations">
                <Summary results={results} />
              </Section>
            </div>
          )}
        </div>

        {/* Footer */}
        {results && (
          <div className="bg-gray-50 px-6 py-4 border-t flex gap-3">
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 text-sm font-semibold"
            >
              Re-run Diagnostics
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(results, null, 2));
                alert('Diagnostics copied to clipboard!');
              }}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 text-sm font-semibold"
            >
              Copy Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="font-bold text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Summary({ results }: { results: any }) {
  const issues: string[] = [];
  const fixes: string[] = [];

  // Check for issues
  if (!results.currentUser?.id) {
    issues.push('❌ Not authenticated');
    fixes.push('Log in to the application');
  }

  if (results.totalLeadsInDB === 0) {
    issues.push('❌ No leads in database');
    fixes.push('The sync might have failed. Try syncing again from Settings.');
  }

  if (results.userProfile?.role !== 'super_admin' && 
      Array.isArray(results.projectAssignments) && 
      results.projectAssignments.length === 0) {
    issues.push('❌ Not assigned to any projects');
    fixes.push('Ask a super admin to assign you to projects, or upgrade your role to super_admin');
  }

  if (results.accessibleSheets && results.accessibleSheets.length === 0 && results.totalLeadsInDB > 0) {
    issues.push('❌ Leads exist but you cannot access any sheets');
    fixes.push('Ask admin to assign you to the projects containing these sheets');
  }

  if (issues.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 p-4 rounded text-green-800">
        <p className="font-semibold">✅ No obvious issues detected</p>
        <p className="text-sm mt-2">
          If leads still aren't showing, try:
        </p>
        <ul className="text-sm mt-2 list-disc list-inside space-y-1">
          <li>Clear sessionStorage and reload the page</li>
          <li>Select the correct project from the dropdown</li>
          <li>Check browser console for errors</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 p-4 rounded text-red-800">
        <p className="font-semibold mb-2">Issues Found:</p>
        <ul className="space-y-1">
          {issues.map((issue, i) => (
            <li key={i} className="text-sm">{issue}</li>
          ))}
        </ul>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded text-blue-800">
        <p className="font-semibold mb-2">Recommended Fixes:</p>
        <ul className="space-y-1 list-decimal list-inside">
          {fixes.map((fix, i) => (
            <li key={i} className="text-sm">{fix}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
