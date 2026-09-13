'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { AnalyticsData } from '@/types/rbac';

// ── Inline bar chart (no recharts dependency needed) ────────────────────────

function BarChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
        No leads recorded yet.
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const DISPLAY_LIMIT = 30;
  const visible = data.slice(-DISPLAY_LIMIT);

  return (
    <div className="flex items-end gap-1 h-32 w-full overflow-hidden">
      {visible.map((d, i) => {
        const heightPct = (d.count / max) * 100;
        const dateLabel = new Date(d.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1 group relative"
            title={`${dateLabel}: ${d.count} lead${d.count !== 1 ? 's' : ''}`}
          >
            <div
              className="w-full rounded-t-sm bg-blue-500 group-hover:bg-blue-400 transition-colors"
              style={{ height: `${heightPct}%`, minHeight: d.count > 0 ? '2px' : '0' }}
            />
            {/* Tooltip on hover */}
            <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg z-10 border border-gray-700">
              {dateLabel}: {d.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Status breakdown donut-style list ────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  'New Lead':    'bg-blue-500',
  'Contacted':   'bg-yellow-500',
  'Interested':  'bg-green-500',
  'Qualified':   'bg-emerald-500',
  'Proposal':    'bg-purple-500',
  'Negotiation': 'bg-orange-500',
  'Won':         'bg-green-600',
  'Lost':        'bg-red-500',
  'On Hold':     'bg-gray-500',
  'Unknown':     'bg-gray-600',
};

function StatusBreakdown({ breakdown, total }: { breakdown: Record<string, number>; total: number }) {
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-3">
      {entries.map(([status, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const colorClass = STATUS_COLORS[status] ?? 'bg-gray-500';
        return (
          <div key={status}>
            <div className="flex items-center justify-between text-sm mb-1">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
                <span className="text-gray-300">{status}</span>
              </div>
              <span className="text-white font-semibold tabular-nums">
                {count} <span className="text-gray-500 font-normal text-xs">({pct}%)</span>
              </span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main analytics page ──────────────────────────────────────────────────────

export default function ClientAnalyticsPage() {
  const params = useParams();
  const projectId = Number(params.projectId);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Call the client-only analytics RPC
        const { data, error: rpcError } = await supabase.rpc('get_project_analytics', {
          p_project_id: projectId,
        });

        if (rpcError) throw new Error(rpcError.message);
        setAnalytics(data as AnalyticsData);

        // Fetch project name via a separate query
        // (clients are blocked from projects table by RLS, so we store name in assignment metadata or
        //  fetch from a separate safe endpoint — for now we'll try and silently skip if denied)
        // Since clients don't have access to projects table (by design), we use the analytics data
        // or a simple fallback label.
        setProjectName(`Project #${projectId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    if (!Number.isNaN(projectId)) load();
  }, [projectId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600 rounded-full opacity-5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600 rounded-full opacity-5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">
                {projectName ?? 'Analytics'}
              </h1>
              <p className="text-xs text-gray-500">Project Analytics Dashboard</p>
            </div>
          </div>
          <button
            id="btn-analytics-sign-out"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative max-w-5xl mx-auto px-6 py-8 space-y-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading analytics…</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
            <p className="text-red-400 font-medium">Unable to load analytics</p>
            <p className="text-red-400/70 text-sm mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && analytics && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total leads */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 col-span-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Total Leads</p>
                <p className="text-4xl font-bold text-white tabular-nums">{analytics.total_leads}</p>
                <p className="text-xs text-gray-600 mt-2">All time</p>
              </div>

              {/* Status count */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Statuses</p>
                <p className="text-4xl font-bold text-white tabular-nums">
                  {analytics.status_breakdown ? Object.keys(analytics.status_breakdown).length : 0}
                </p>
                <p className="text-xs text-gray-600 mt-2">Distinct stages</p>
              </div>

              {/* Active days */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Active Days</p>
                <p className="text-4xl font-bold text-white tabular-nums">
                  {analytics.leads_over_time ? analytics.leads_over_time.length : 0}
                </p>
                <p className="text-xs text-gray-600 mt-2">Days with leads</p>
              </div>
            </div>

            {/* Leads over time */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">Leads Over Time</h2>
                <span className="text-xs text-gray-600">Last 30 days shown</span>
              </div>
              <BarChart data={analytics.leads_over_time ?? []} />
              {/* X-axis labels */}
              {analytics.leads_over_time && analytics.leads_over_time.length > 1 && (
                <div className="flex justify-between mt-2 text-xs text-gray-600 px-0.5">
                  <span>
                    {new Date(analytics.leads_over_time[0].date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </span>
                  <span>
                    {new Date(analytics.leads_over_time[analytics.leads_over_time.length - 1].date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Status breakdown */}
            {analytics.status_breakdown && Object.keys(analytics.status_breakdown).length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white mb-5">Lead Status Breakdown</h2>
                <StatusBreakdown
                  breakdown={analytics.status_breakdown}
                  total={analytics.total_leads}
                />
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-center text-xs text-gray-700 pb-4">
              This view shows aggregated statistics only. No personal lead data is accessible from this dashboard.
            </p>
          </>
        )}

        {!loading && !error && analytics && analytics.total_leads === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-800 border border-gray-700 rounded-2xl mb-4">
              <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium">No data yet</p>
            <p className="text-gray-600 text-sm mt-1">Leads will appear here once the project is active.</p>
          </div>
        )}
      </main>
    </div>
  );
}
