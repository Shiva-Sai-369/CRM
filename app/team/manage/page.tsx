'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/rbac';

interface Project {
  id: number;
  name: string;
}

interface UserWithAssignments {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  is_active: boolean;
  assignments: Array<{
    id: number;
    user_id: string;
    project_id: number;
    created_at: string;
  }>;
}

export default function ManageUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserWithAssignments[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Check if current user is super_admin
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setCurrentUserId(user.id);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (!profile || profile.role !== 'super_admin') {
          router.push('/projects');
          return;
        }
      } catch {
        router.push('/login');
      }
    };
    checkAccess();
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, projectsRes] = await Promise.all([
        fetch('/api/all-users'),
        fetch('/api/projects-list'),
      ]);

      if (usersRes.ok) {
        const { users: data } = await usersRes.json() as { users: UserWithAssignments[] };
        setUsers(data);
      } else {
        toast.error('Failed to load users');
      }

      // Load projects from Supabase if API doesn't exist
      if (!projectsRes.ok) {
        const { data } = await supabase.from('projects').select('id, name').order('name');
        setProjects((data ?? []) as Project[]);
      } else {
        const { projects: pData } = await projectsRes.json() as { projects: Project[] };
        setProjects(pData);
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load projects separately via Supabase client as fallback
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data } = await supabase.from('projects').select('id, name').order('name');
        setProjects((data ?? []) as Project[]);
      } catch {
        // ignore
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const res = await fetch('/api/update-user-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const json = await res.json() as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed to update role');
      toast.success(json.message ?? 'Role updated');
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    try {
      const res = await fetch('/api/update-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive: newStatus }),
      });
      const json = await res.json() as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed to update status');
      toast.success(json.message ?? 'Status updated');
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleProjectsChange = async (userId: string, projectIds: number[]) => {
    try {
      const res = await fetch('/api/update-user-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, projectIds }),
      });
      const json = await res.json() as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed to update projects');
      toast.success(json.message ?? 'Projects updated');
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const projectNameMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push('/team')}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-white">Manage All Users</h1>
          </div>
          <p className="text-gray-400 text-sm ml-8">
            Update roles, active status, and project assignments for all users.
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-4 mb-8 max-w-3xl">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Users</p>
          <p className="text-2xl font-bold text-white">{users.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Super Admins</p>
          <p className="text-2xl font-bold text-blue-400">
            {users.filter(u => u.role === 'super_admin' && u.is_active !== false).length}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Team Members</p>
          <p className="text-2xl font-bold text-green-400">
            {users.filter(u => u.role === 'team_member' && u.is_active !== false).length}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Clients</p>
          <p className="text-2xl font-bold text-purple-400">
            {users.filter(u => u.role === 'client' && u.is_active !== false).length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-500">
            <div className="inline-block w-6 h-6 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading users…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500 text-sm">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projects
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    projects={projects}
                    projectNameMap={projectNameMap}
                    isCurrentUser={u.id === currentUserId}
                    onRoleChange={handleRoleChange}
                    onStatusToggle={handleStatusToggle}
                    onProjectsChange={handleProjectsChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({
  user,
  projects,
  projectNameMap,
  isCurrentUser,
  onRoleChange,
  onStatusToggle,
  onProjectsChange,
}: {
  user: UserWithAssignments;
  projects: Project[];
  projectNameMap: Record<number, string>;
  isCurrentUser: boolean;
  onRoleChange: (userId: string, role: UserRole) => void;
  onStatusToggle: (userId: string, currentStatus: boolean) => void;
  onProjectsChange: (userId: string, projectIds: number[]) => void;
}) {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const assignedProjectIds = user.assignments.map(a => a.project_id);
  const isActive = user.is_active !== false;

  return (
    <>
      <tr
        className={`transition-colors ${
          isActive ? 'hover:bg-gray-800/50' : 'bg-gray-900/50 opacity-60'
        }`}
      >
        {/* User info */}
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isActive
                  ? user.role === 'super_admin'
                    ? 'bg-blue-600/20 border border-blue-600/30'
                    : user.role === 'team_member'
                    ? 'bg-green-600/20 border border-green-600/30'
                    : 'bg-purple-600/20 border border-purple-600/30'
                  : 'bg-gray-700/40 border border-gray-600/30'
              }`}
            >
              <span
                className={`text-xs font-semibold ${
                  isActive
                    ? user.role === 'super_admin'
                      ? 'text-blue-400'
                      : user.role === 'team_member'
                      ? 'text-green-400'
                      : 'text-purple-400'
                    : 'text-gray-500'
                }`}
              >
                {(user.full_name ?? user.email).charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">
                  {user.full_name ?? user.email}
                </p>
                {isCurrentUser && (
                  <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                    You
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">{user.email}</p>
              {!isActive && (
                <p className="text-xs text-red-400 mt-1 font-medium">Disabled</p>
              )}
            </div>
          </div>
        </td>

        {/* Role dropdown */}
        <td className="px-6 py-4">
          <select
            value={user.role}
            onChange={(e) => onRoleChange(user.id, e.target.value as UserRole)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="super_admin">Super Admin</option>
            <option value="team_member">Team Member</option>
            <option value="client">Client</option>
          </select>
        </td>

        {/* Status toggle */}
        <td className="px-6 py-4">
          <button
            onClick={() => onStatusToggle(user.id, isActive)}
            disabled={isCurrentUser && !isActive}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 border border-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isActive ? 'Enabled' : 'Disabled'}
          </button>
        </td>

        {/* Projects */}
        <td className="px-6 py-4">
          {user.role === 'client' || user.role === 'team_member' ? (
            <button
              onClick={() => setShowProjectModal(true)}
              className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
            >
              {assignedProjectIds.length === 0
                ? 'Assign Projects'
                : `${assignedProjectIds.length} project${assignedProjectIds.length > 1 ? 's' : ''}`}
            </button>
          ) : (
            <span className="text-xs text-gray-600 italic">N/A</span>
          )}
        </td>

        {/* Joined date */}
        <td className="px-6 py-4 text-xs text-gray-500">
          {new Date(user.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </td>
      </tr>

      {/* Project assignment modal */}
      {showProjectModal && (
        <ProjectAssignmentModal
          user={user}
          projects={projects}
          projectNameMap={projectNameMap}
          onClose={() => setShowProjectModal(false)}
          onSave={(projectIds) => {
            onProjectsChange(user.id, projectIds);
            setShowProjectModal(false);
          }}
        />
      )}
    </>
  );
}

function ProjectAssignmentModal({
  user,
  projects,
  projectNameMap,
  onClose,
  onSave,
}: {
  user: UserWithAssignments;
  projects: Project[];
  projectNameMap: Record<number, string>;
  onClose: () => void;
  onSave: (projectIds: number[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>(
    user.assignments.map(a => a.project_id)
  );

  const toggleProject = (projectId: number) => {
    setSelectedIds(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-1">Assign Projects</h2>
        <p className="text-sm text-gray-400 mb-5">
          Select projects for <span className="text-white font-medium">{user.email}</span>
        </p>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1 mb-5">
          {projects.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No projects found.</p>
          ) : (
            projects.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 bg-gray-800 rounded-xl border border-gray-700 hover:bg-gray-750 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(p.id)}
                  onChange={() => toggleProject(p.id)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-white">{p.name}</span>
              </label>
            ))
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(selectedIds)}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
