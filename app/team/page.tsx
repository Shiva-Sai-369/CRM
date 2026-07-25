'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { TeamMemberWithAssignments } from '@/types/rbac';

interface Project {
  id: number;
  name: string;
}

// ── Invite Team Member Modal ─────────────────────────────────────────────────

function InviteTeamMemberModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/invite-team-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed to send invite');
      toast.success(`Invite sent to ${email}`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-1">Invite Team Member</h2>
        <p className="text-sm text-gray-400 mb-5">
          They&apos;ll receive an invite email and start with no project assignments.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="invite-tm-email" className="block text-sm text-gray-300 mb-1.5">
              Email address
            </label>
            <input
              id="invite-tm-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-send-tm-invite"
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {loading ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Assign Project Modal ─────────────────────────────────────────────────────

function AssignProjectModal({
  member,
  projects,
  onClose,
  onSuccess,
}: {
  member: TeamMemberWithAssignments;
  projects: Project[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const assignedIds = new Set(member.assignments.map((a) => a.project_id));
  const [loading, setLoading] = useState<number | null>(null);

  const assign = async (projectId: number) => {
    setLoading(projectId);
    try {
      const res = await fetch('/api/assign-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, projectId }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      toast.success('Project assigned');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  const unassign = async (projectId: number) => {
    setLoading(projectId);
    try {
      const res = await fetch('/api/unassign-project', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, projectId }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      toast.success('Project unassigned');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-1">Manage Projects</h2>
        <p className="text-sm text-gray-400 mb-5">
          Assign or unassign projects for <span className="text-white font-medium">{member.email}</span>
        </p>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {projects.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">No projects found.</p>
          )}
          {projects.map((p) => {
            const isAssigned = assignedIds.has(p.id);
            const isLoading = loading === p.id;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-3 bg-gray-800 rounded-xl border border-gray-700"
              >
                <span className="text-sm text-white">{p.name}</span>
                <button
                  id={`btn-${isAssigned ? 'unassign' : 'assign'}-${p.id}`}
                  onClick={() => isAssigned ? unassign(p.id) : assign(p.id)}
                  disabled={isLoading}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    isAssigned
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                      : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'
                  }`}
                >
                  {isLoading ? '…' : isAssigned ? 'Unassign' : 'Assign'}
                </button>
              </div>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 text-sm transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ── Main Team Page ───────────────────────────────────────────────────────────

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMemberWithAssignments[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [managingMember, setManagingMember] = useState<TeamMemberWithAssignments | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, projectsRes] = await Promise.all([
        fetch('/api/team-members'),
        fetch('/api/projects-list'),
      ]);

      if (membersRes.ok) {
        const { members: data } = await membersRes.json() as { members: TeamMemberWithAssignments[] };
        setMembers(data);
      }

      // Fallback: load projects from Supabase directly if no dedicated endpoint
      if (!projectsRes.ok) {
        // We'll load projects via the supabase client on the client side
        const { createBrowserClient } = await import('@supabase/ssr');
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data } = await supabase.from('projects').select('id, name').order('name');
        setProjects((data ?? []) as Project[]);
      } else {
        const { projects: pData } = await projectsRes.json() as { projects: Project[] };
        setProjects(pData);
      }
    } catch {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load projects separately via Supabase client (simpler than extra API route)
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { createBrowserClient } = await import('@supabase/ssr');
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data } = await supabase.from('projects').select('id, name').order('name');
        setProjects((data ?? []) as Project[]);
      } catch {
        // ignore
      }
    };
    loadProjects();
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/team-members');
      if (res.ok) {
        const { members: data } = await res.json() as { members: TeamMemberWithAssignments[] };
        setMembers(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const projectNameMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Management</h1>
          <p className="text-gray-400 text-sm mt-1">Invite team members and manage project assignments.</p>
        </div>
        <button
          id="btn-invite-team-member"
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-blue-600/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Invite Team Member
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Team Members</p>
          <p className="text-2xl font-bold text-white">{members.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Projects</p>
          <p className="text-2xl font-bold text-white">{projects.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-500">
            <div className="inline-block w-6 h-6 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading team members…</p>
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="w-10 h-10 text-gray-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-gray-500 text-sm">No team members yet.</p>
            <p className="text-gray-600 text-xs mt-1">Use &ldquo;Invite Team Member&rdquo; to add your first one.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Projects</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600/20 border border-blue-600/30 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-blue-400">
                          {(m.full_name ?? m.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{m.full_name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {m.assignments.length === 0 ? (
                      <span className="text-xs text-gray-600 italic">None assigned</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {m.assignments.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 font-medium"
                          >
                            {projectNameMap[a.project_id] ?? `Project #${a.project_id}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      id={`btn-manage-${m.id}`}
                      onClick={() => setManagingMember(m)}
                      className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
                    >
                      Manage Projects
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showInviteModal && (
        <InviteTeamMemberModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => { setShowInviteModal(false); loadMembers(); }}
        />
      )}
      {managingMember && (
        <AssignProjectModal
          member={managingMember}
          projects={projects}
          onClose={() => setManagingMember(null)}
          onSuccess={() => { setManagingMember(null); loadMembers(); }}
        />
      )}
    </div>
  );
}
