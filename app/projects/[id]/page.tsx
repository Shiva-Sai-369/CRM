'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { filterLeads } from '@/lib/filterLeads';
import { useFilterStore } from '@/store/filterStore';
import StatsStrip from '@/components/StatsStrip';
import FilterBar from '@/components/FilterBar';
import LeadsTable from '@/components/LeadsTable';
import type { Lead } from '@/lib/parseLeads';
import type { GoogleSheet, SheetLead, Project } from '@/types/supabase';
import type { UserRole } from '@/types/rbac';

function toUiLead(lead: SheetLead, sheet: GoogleSheet | undefined): Lead {
  const createdAt = lead.created_at ? new Date(lead.created_at) : null;
  const rawObj = lead.raw_data && typeof lead.raw_data === 'object' && !Array.isArray(lead.raw_data)
    ? (lead.raw_data as Record<string, unknown>) : {};
  const platform = (rawObj.platform as string) || (rawObj.Platform as string) ||
    (rawObj.Platform_Name as string) || (lead.sheet_id ? 'Google Sheets' : 'Manual');
  return {
    name: lead.name ?? 'Unknown',
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    leadSource: sheet?.name ?? lead.company ?? 'Sheet',
    leadStatus: lead.status ?? 'new',
    tags: [],
    lastMessage: '',
    lastMessageDate: createdAt,
    notes: lead.notes ?? '',
    platform,
    uniqueKey: String(lead.id),
    company: lead.company ?? '',
  };
}

function formatSyncTime(ts: string | null): string {
  if (!ts) return 'Never synced';
  const d = new Date(ts);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString();
}

type DeleteMode = 'unlink' | 'cascade';
type Tab = 'sheets' | 'leads' | 'settings';

function DeleteModal({ projectName, onClose, onConfirm }: {
  projectName: string; onClose: () => void; onConfirm: (mode: DeleteMode) => Promise<void>;
}) {
  const [mode, setMode] = useState<DeleteMode>('unlink');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const cascadeReady = mode === 'cascade' &&
    confirmText.trim().toLowerCase() === projectName.trim().toLowerCase();
  const handleDelete = async () => {
    setLoading(true);
    try { await onConfirm(mode); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="flex-1 text-base font-semibold text-gray-900">Delete Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Deleting:</span>
            <span className="px-2.5 py-1 bg-gray-100 rounded-md text-sm font-mono font-medium text-gray-800">{projectName}</span>
          </div>
          <button type="button" onClick={() => { setMode('unlink'); setConfirmText(''); }}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${mode === 'unlink' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${mode === 'unlink' ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`}>
                  {mode === 'unlink' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Unlink and delete project</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Removes this project. Your sheets and lead data are kept and can be reassigned to another project later. Nothing is permanently deleted.</p>
                </div>
              </div>
              <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Safe
              </span>
            </div>
          </button>
          <button type="button" onClick={() => setMode('cascade')}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${mode === 'cascade' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-orange-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${mode === 'cascade' ? 'border-red-500 bg-red-500' : 'border-gray-400'}`}>
                  {mode === 'cascade' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-700">Delete project and all its data</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Permanently deletes this project <strong>AND</strong> all its linked Google Sheets and lead records. This cannot be undone.</p>
                </div>
              </div>
              <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Destructive
              </span>
            </div>
          </button>
          <div className={`transition-all ${mode === 'cascade' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Type the project name to confirm</label>
            <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
              placeholder={`Type "${projectName}" to confirm…`} disabled={mode !== 'cascade'}
              className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 ${mode === 'cascade' && confirmText.length > 0 ? (cascadeReady ? 'border-green-400 focus:ring-green-300 bg-green-50' : 'border-red-300 focus:ring-red-200 bg-red-50') : 'border-gray-300 focus:ring-blue-200 bg-gray-50'}`} />
            {mode === 'cascade' && confirmText.length > 0 && !cascadeReady && (
              <p className="text-xs text-red-500 mt-1">Name does not match &mdash; check spelling</p>
            )}
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={handleDelete} disabled={loading || (mode === 'cascade' && !cascadeReady)}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${mode === 'cascade' ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {loading ? 'Deleting…' : mode === 'cascade' ? 'Permanently Delete Everything' : 'Delete Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddSheetModal({ projectId, onClose, onAdded }: { projectId: number; onClose: () => void; onAdded: () => void; }) {
  const [available, setAvailable] = useState<GoogleSheet[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('google_sheets').select('*').is('project_id', null).order('created_at', { ascending: false });
      setAvailable((data ?? []) as GoogleSheet[]); setLoading(false);
    }; load();
  }, []);
  const toggle = (id: number) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleAdd = async () => {
    if (selected.length === 0) return; setSaving(true);
    try {
      const { error } = await (supabase as any).from('google_sheets').update({ project_id: projectId }).in('id', selected);
      if (error) throw error;
      toast.success('Sheet linked'); onAdded();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to link sheets'); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Add Sheet Tab</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="px-5 py-4">
          {loading ? (<div className="py-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" /></div>)
          : available.length === 0 ? (<p className="text-sm text-gray-500 text-center py-6">No unlinked sheets available. All existing sheets are already linked to a project.</p>)
          : (<div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
              {available.map(sheet => (
                <label key={sheet.id} className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(sheet.id)} onChange={() => toggle(sheet.id)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <div className="min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{sheet.name}</p><p className="text-xs text-gray-400 truncate">{sheet.sheet_name}</p></div>
                </label>
              ))}
            </div>)}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={handleAdd} disabled={selected.length === 0 || saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving ? 'Linking…' : 'Add Sheet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteClientModal({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pwd = ''; for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    setPassword(pwd);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch('/api/invite-client', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), password, projectId }) });
      const json = await res.json() as { error?: string; email?: string; password?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      setCreated({ email: json.email!, password: json.password! }); toast.success('Client account created');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Something went wrong'); setLoading(false); }
  };
  if (created) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center border border-green-200"><svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
          <div><h2 className="text-lg font-semibold text-gray-900">Client Account Created</h2><p className="text-sm text-gray-500">Share these credentials with the client</p></div>
        </div>
        <div className="space-y-3 mb-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-500 mb-1">Email</p><p className="text-sm font-medium text-gray-900">{created.email}</p></div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-500 mb-1">Password</p>
            <div className="flex items-center justify-between gap-2"><p className="text-sm font-mono text-gray-900">{created.password}</p>
              <button onClick={() => { navigator.clipboard.writeText(created.password); toast.success('Copied'); }} className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg">Copy</button>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4"><p className="text-xs text-yellow-800"><strong>Important:</strong> Save this password now. You won&apos;t be able to see it again.</p></div>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Done</button>
      </div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Create Client Account</h2>
        <p className="text-sm text-gray-500 mb-5">No email will be sent &mdash; share credentials manually.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm text-gray-700 mb-1.5">Client email address</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="client@company.com" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-sm text-gray-700 mb-1.5">Password (min. 8 characters)</label>
            <div className="flex gap-2">
              <input type="text" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={generatePassword} className="px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-600 hover:text-gray-900 text-sm" title="Generate">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium">{loading ? 'Creating…' : 'Create Account'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams(); const router = useRouter();
  const projectId = Number(params.id);
  const [project, setProject] = useState<Project | null>(null);
  const [sheets, setSheets] = useState<GoogleSheet[]>([]);
  const [supaLeads, setSupaLeads] = useState<SheetLead[]>([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('sheets');
  const [syncingSheetId, setSyncingSheetId] = useState<number | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInviteClient, setShowInviteClient] = useState(false);
  const [canInviteClient, setCanInviteClient] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const filterState = useFilterStore();

  const refresh = useCallback(async () => {
    setLoadingProject(true);
    const [{ data: proj }, { data: sheetData }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('google_sheets').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    ]);
    if (!proj) { router.push('/projects'); return; }
    setProject(proj as Project); setEditName((proj as Project).name);
    setEditDesc((proj as Project).description ?? '');
    setSheets((sheetData ?? []) as GoogleSheet[]); setLoadingProject(false);
  }, [projectId, router]);

  useEffect(() => { refresh(); }, [refresh]);

  const fetchLeads = useCallback(async () => {
    if (sheets.length === 0) { setSupaLeads([]); return; }
    setLoadingLeads(true);
    const sheetIds = sheets.map(s => s.id);
    const { data } = await supabase.from('sheet_leads').select('*').in('sheet_id', sheetIds).order('created_at', { ascending: false });
    setSupaLeads((data ?? []) as SheetLead[]); setLoadingLeads(false);
  }, [sheets]);

  useEffect(() => { if (activeTab === 'leads') fetchLeads(); }, [activeTab, fetchLeads]);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const role = (profile as { role: UserRole } | null)?.role;
      if (role === 'super_admin') { setCanInviteClient(true); return; }
      if (role === 'team_member') {
        const { data: asgn } = await supabase.from('project_assignments').select('id').eq('user_id', user.id).eq('project_id', projectId).maybeSingle();
        setCanInviteClient(!!asgn);
      }
    }; check();
  }, [projectId]);

  const uiLeads = useMemo(() => supaLeads.map(lead => toUiLead(lead, sheets.find(s => s.id === lead.sheet_id))), [supaLeads, sheets]);
  const filteredLeads = useMemo(() => filterLeads(uiLeads, filterState), [uiLeads, filterState]);
  const availableLeadSources = useMemo(() => [...new Set(uiLeads.map(l => l.leadSource).filter(Boolean))], [uiLeads]);
  const availableLeadStatuses = useMemo(() => [...new Set(uiLeads.map(l => l.leadStatus).filter(Boolean))], [uiLeads]);

  const handleSync = async (sheet: GoogleSheet) => {
    setSyncingSheetId(sheet.id);
    try {
      const res = await fetch('/api/sync-sheet-to-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: sheet.spreadsheet_id, projectId, sheetName: sheet.sheet_name })
      });
      const json = await res.json() as { error?: string; message?: string; insertedRows?: number };
      if (!res.ok) throw new Error(json.error ?? 'Sync failed');
      toast.success(json.message ?? 'Synced new leads');
      refresh(); if (activeTab === 'leads') fetchLeads();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Sync failed'); }
    finally { setSyncingSheetId(null); }
  };

  const handleRemoveSheet = async (sheet: GoogleSheet) => {
    if (!confirm(`Remove "${sheet.name}" from this project? The sheet's leads will be kept.`)) return;
    const { error } = await (supabase as any).from('google_sheets').update({ project_id: null }).eq('id', sheet.id);
    if (error) { toast.error('Failed to unlink sheet'); return; }
    toast.success(`"${sheet.name}" unlinked`); refresh();
  };

  const handleSaveSettings = async () => {
    if (!editName.trim()) { toast.error('Project name is required'); return; }
    setSavingSettings(true);
    const { error } = await (supabase as any).from('projects').update({ name: editName.trim(), description: editDesc.trim() || null, updated_at: new Date().toISOString() }).eq('id', projectId);
    setSavingSettings(false);
    if (error) { toast.error('Failed to save'); return; }
    toast.success('Project updated'); refresh();
  };

  const handleDelete = async (mode: DeleteMode) => {
    try {
      if (mode === 'cascade') {
        const { data: sheetRows } = await supabase.from('google_sheets').select('id').eq('project_id', projectId);
        const sheetIds = (sheetRows ?? []).map((r: { id: number }) => r.id);
        if (sheetIds.length > 0) {
          const { error: le } = await (supabase as any).from('sheet_leads').delete().in('sheet_id', sheetIds);
          if (le) throw new Error(`Failed to delete leads: ${le.message}`);
          const { error: se } = await (supabase as any).from('google_sheets').delete().in('id', sheetIds);
          if (se) throw new Error(`Failed to delete sheets: ${se.message}`);
        }
      } else {
        const { error: ue } = await (supabase as any).from('google_sheets').update({ project_id: null }).eq('project_id', projectId);
        if (ue) throw new Error(`Failed to unlink: ${ue.message}`);
      }
      await (supabase as any).from('project_assignments').delete().eq('project_id', projectId);
      const { error: pe } = await (supabase as any).from('projects').delete().eq('id', projectId);
      if (pe) throw new Error(`Failed to delete project: ${pe.message}`);
      toast.success(mode === 'cascade' ? 'Project and all its data permanently deleted' : 'Project deleted — sheets and leads preserved');
      router.push('/projects');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Delete failed'); throw err; }
  };

  if (loadingProject) return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>);
  if (!project) return null;

  const totalLeads = supaLeads.length;
  const TABS: { id: Tab; label: string }[] = [
    { id: 'sheets', label: `Sheets (${sheets.length})` },
    { id: 'leads', label: `Leads (${totalLeads})` },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => router.push('/projects')} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{project.name}</h1>
              {project.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{project.description}</p>}
            </div>
            {canInviteClient && (
              <button id="btn-invite-client" onClick={() => setShowInviteClient(true)} className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Add Client
              </button>
            )}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span><strong className="text-gray-700">{sheets.length}</strong> sheets</span>
            </div>
            <span className="text-gray-300">&middot;</span>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span><strong className="text-gray-700">{totalLeads > 0 ? totalLeads : '—'}</strong> leads</span>
            </div>
            <span className="text-gray-300">&middot;</span>
            <span className="text-xs text-gray-400">Created {new Date(project.created_at ?? '').toLocaleDateString()}</span>
          </div>
          <div className="flex gap-1 mt-4 border-b border-gray-200 -mb-px">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {activeTab === 'sheets' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div><h2 className="text-sm font-semibold text-gray-900">Linked Sheet Tabs</h2><p className="text-xs text-gray-500 mt-0.5">Google Sheets synced to this project</p></div>
              <button onClick={() => setShowAddSheet(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Add Sheet Tab
              </button>
            </div>
            {sheets.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-sm text-gray-500 mb-3">No sheet tabs linked yet.</p>
                <button onClick={() => setShowAddSheet(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">Add Sheet Tab</button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {sheets.map(sheet => (
                  <div key={sheet.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 bg-green-50 border border-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{sheet.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-400">Tab: <span className="font-medium text-gray-600">{sheet.sheet_name}</span></span>
                        <span className="text-gray-300">&middot;</span>
                        <span className="text-xs text-gray-400">Last synced: <span className="font-medium text-gray-600">{formatSyncTime(sheet.last_synced_at)}</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleSync(sheet)} disabled={syncingSheetId === sheet.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors disabled:opacity-50">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {syncingSheetId === sheet.id ? 'Syncing…' : 'Sync Now'}
                      </button>
                      <button onClick={() => handleRemoveSheet(sheet)} className="px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 border border-transparent hover:border-red-200 rounded-lg hover:bg-red-50 transition-colors">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="space-y-4">
            <StatsStrip leads={filteredLeads} />
            <FilterBar totalLeads={uiLeads.length} filteredCount={filteredLeads.length} availableLeadSources={availableLeadSources} availableLeadStatuses={availableLeadStatuses} availableTags={[]} />
            {loadingLeads ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" /><p className="text-sm text-gray-500">Loading leads…</p></div>
            ) : filteredLeads.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <svg className="w-14 h-14 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <h3 className="text-base font-semibold text-gray-900 mb-1">No leads found</h3>
                <p className="text-sm text-gray-500">{uiLeads.length === 0 ? 'No leads synced yet. Go to Sheets and click Sync Now.' : 'Try clearing your filters.'}</p>
              </div>
            ) : (
              <LeadsTable leads={filteredLeads} loading={false} onAddLeadClick={() => {}} />
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-xl">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Project Details</h2>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name <span className="text-red-500">*</span></label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} placeholder="Brief description of this project…" className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></div>
              <div className="flex justify-end">
                <button onClick={handleSaveSettings} disabled={savingSettings || !editName.trim()} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                  {savingSettings ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-red-700 mb-1">Danger Zone</h2>
              <p className="text-xs text-gray-500 mb-4">Deleting this project is a permanent action. You will be asked what happens to linked sheets and leads.</p>
              <button id="btn-delete-project" onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 text-sm font-medium rounded-xl transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete Project…
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddSheet && <AddSheetModal projectId={projectId} onClose={() => setShowAddSheet(false)} onAdded={() => { refresh(); setShowAddSheet(false); }} />}
      {showDeleteModal && project && <DeleteModal projectName={project.name} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} />}
      {showInviteClient && <InviteClientModal projectId={projectId} onClose={() => setShowInviteClient(false)} />}
    </div>
  );
}