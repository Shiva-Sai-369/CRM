'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import {
  getSheetTabs,
  saveSheetTab,
  deleteSheetTab,
  renameSheetTab,
  isValidCsvUrl,
  extractSheetId,
  savePublicSheetId,
  getPublicSheetId,
  type SheetTab,
} from '@/lib/config';
import {
  fetchLeadsFromCsv,
  discoverPublicSheetTabs,
  type DiscoveredTab,
} from '@/lib/services/fetchLeads';
import {
  getProjects,
  getProjects as getLocalProjects,
  createProject,
  addSheetToProject,
  getTabProjectCount,
  removeSheetFromProject,
  getProjectSheets,
  type Project,
} from '@/lib/projectStorage';

export default function SettingsPage() {
  // ── Password change state ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // ── Display name state ──
  const [displayName, setDisplayName] = useState('');
  const [originalDisplayName, setOriginalDisplayName] = useState('');
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [displayNameError, setDisplayNameError] = useState('');

  // ── Saved tabs (shared between both sections) ──
  const [tabs, setTabs] = useState<SheetTab[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  // ── Project linking state ──
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedTabForProject, setSelectedTabForProject] = useState<SheetTab | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creatingNewProject, setCreatingNewProject] = useState(false);
  const [linkingToProject, setLinkingToProject] = useState(false);
  
  // ── Sync to Supabase state ──
  const [syncingTabId, setSyncingTabId] = useState<string | null>(null);

  // ── Section 1: Public sheet ──
  const [publicInput, setPublicInput]     = useState('');
  const [discovering, setDiscovering]     = useState(false);
  const [discoveredTabs, setDiscoveredTabs] = useState<DiscoveredTab[]>([]);
  const [selectedGids, setSelectedGids]   = useState<Set<number>>(new Set());
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  // ── Section 2: Private sheet ──
  const [privateName, setPrivateName] = useState('');
  const [privateUrl, setPrivateUrl]   = useState('');
  const [testing, setTesting]         = useState(false);
  const [testResult, setTestResult]   = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch Supabase projects
      const { data: supabaseProjects } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Convert Supabase projects to Project format
      const supabaseAsProjects: Project[] = (supabaseProjects || []).map((p: any) => ({
        id: String(p.id),
        name: p.name,
        description: p.description || '',
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
      
      // Merge with localStorage projects
      const localProjects = getLocalProjects();
      const allProjects = [...supabaseAsProjects, ...localProjects];
      
      setProjects(allProjects);
    };
    
    setTabs(getSheetTabs());
    setPublicInput(getPublicSheetId());
    fetchData();
    
    // Get current user email and profile for password change and display name
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserEmail(user.email || null);
        
        // Fetch profile for display name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          const name = (profile as { full_name: string | null }).full_name || '';
          setDisplayName(name);
          setOriginalDisplayName(name);
        }
      }
    };
    fetchUser();
  }, []);

  const refreshTabs = async () => {
    setTabs(getSheetTabs());
    
    // Also refresh projects from Supabase
    const { data: supabaseProjects } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    
    const supabaseAsProjects: Project[] = (supabaseProjects || []).map((p: any) => ({
      id: String(p.id),
      name: p.name,
      description: p.description || '',
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
    
    const localProjects = getLocalProjects();
    setProjects([...supabaseAsProjects, ...localProjects]);
  };

  // ── Display name handlers ──
  const handleSaveDisplayName = async () => {
    setDisplayNameError('');
    
    const trimmedName = displayName.trim();
    
    if (!trimmedName) {
      setDisplayNameError('Display name cannot be empty');
      return;
    }
    
    if (trimmedName.length > 100) {
      setDisplayNameError('Display name must be 100 characters or less');
      return;
    }
    
    if (trimmedName === originalDisplayName) {
      toast.success('No changes to save');
      return;
    }
    
    setSavingDisplayName(true);
    
    try {
      const res = await fetch('/api/update-display-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: trimmedName }),
      });
      
      const json = await res.json() as { error?: string; message?: string };
      
      if (!res.ok) {
        throw new Error(json.error ?? 'Failed to update display name');
      }
      
      toast.success('Display name updated successfully');
      setOriginalDisplayName(trimmedName);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSavingDisplayName(false);
    }
  };

  // ── Password change handlers ──
  const validatePasswordFields = (): boolean => {
    const errors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };

    if (!currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return !errors.currentPassword && !errors.newPassword && !errors.confirmPassword;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setPasswordErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

    // Validate fields
    if (!validatePasswordFields()) {
      return;
    }

    if (!currentUserEmail) {
      toast.error('Unable to determine current user');
      return;
    }

    setChangingPassword(true);

    try {
      // Step 1: Re-authenticate with current password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: currentUserEmail,
        password: currentPassword,
      });

      if (authError) {
        setPasswordErrors(prev => ({
          ...prev,
          currentPassword: 'Current password is incorrect',
        }));
        setChangingPassword(false);
        return;
      }

      // Step 2: Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error(updateError.message);
        setChangingPassword(false);
        return;
      }

      // Success
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  // ── Public sheet handlers ──
  const handleDiscover = async () => {
    const id = extractSheetId(publicInput);
    if (!id) {
      setDiscoverError('Paste your full Google Sheets URL or just the Sheet ID.');
      return;
    }

    setDiscovering(true);
    setDiscoveredTabs([]);
    setSelectedGids(new Set());
    setDiscoverError(null);

    const result = await discoverPublicSheetTabs(publicInput);
    setDiscovering(false);

    if (result.error) {
      setDiscoverError(result.error);
      return;
    }

    setDiscoveredTabs(result.tabs);
    setSelectedGids(new Set(result.tabs.map(t => t.gid))); // pre-select all
    savePublicSheetId(id);
  };

  const toggleGid = (gid: number) => {
    setSelectedGids(prev => {
      const next = new Set(prev);
      next.has(gid) ? next.delete(gid) : next.add(gid);
      return next;
    });
  };

  const handleSavePublicTabs = () => {
    const toSave = discoveredTabs.filter(t => selectedGids.has(t.gid));
    if (toSave.length === 0) { toast.error('Select at least one tab'); return; }
    
    // Save all tabs first
    const savedTabs = toSave.map(t => saveSheetTab({ name: t.name, url: t.csvUrl }));
    
    refreshTabs();
    setDiscoveredTabs([]);
    setSelectedGids(new Set());
    
    toast.success(`${toSave.length} tab${toSave.length > 1 ? 's' : ''} saved`);
    
    // If only one tab saved, auto-open project selector
    if (savedTabs.length === 1) {
      setSelectedTabForProject(savedTabs[0]);
      setShowProjectModal(true);
    } else {
      // Multiple tabs - show message
      toast('Assign tabs to projects in the Saved Tabs section below', {
        duration: 4000,
        icon: '📋',
      });
    }
  };

  // ── Private sheet handlers ──
  const handleTest = async () => {
    if (!privateUrl.trim()) { toast.error('Enter a URL first'); return; }
    if (!isValidCsvUrl(privateUrl)) {
      toast.error('Must be a Google Sheets published CSV URL');
      return;
    }

    setTesting(true);
    setTestResult(null);

    const result = await fetchLeadsFromCsv(privateUrl);
    setTesting(false);

    setTestResult(
      result.error
        ? { success: false, message: result.error }
        : { success: true, message: `Connected — ${result.total} leads found` }
    );
  };

  const handleSavePrivateTab = () => {
    if (!privateName.trim()) { toast.error('Enter a tab name'); return; }
    if (!privateUrl.trim())  { toast.error('Enter a CSV URL'); return; }
    if (!isValidCsvUrl(privateUrl)) {
      toast.error('Must be a Google Sheets published CSV URL');
      return;
    }

    const savedTab = saveSheetTab({ name: privateName.trim(), url: privateUrl.trim() });
    refreshTabs();
    setPrivateName('');
    setPrivateUrl('');
    setTestResult(null);
    toast.success(`"${privateName.trim()}" saved`);
    
    // Auto-open project selector
    setSelectedTabForProject(savedTab);
    setShowProjectModal(true);
  };
  
  // ── Project linking handlers ──
  const openProjectSelector = (tab: SheetTab) => {
    setSelectedTabForProject(tab);
    setSelectedProjectId('');
    setNewProjectName('');
    setNewProjectDescription('');
    setCreatingNewProject(false);
    setShowProjectModal(true);
  };
  
  const handleLinkToProject = async () => {
    if (!selectedTabForProject) return;
    
    setLinkingToProject(true);
    
    try {
      let projectId = selectedProjectId;
      
      // Create new project if needed
      if (creatingNewProject) {
        if (!newProjectName.trim()) {
          toast.error('Enter a project name');
          setLinkingToProject(false);
          return;
        }
        
        const newProject = createProject(newProjectName.trim(), newProjectDescription.trim());
        projectId = newProject.id;
        toast.success(`Project "${newProject.name}" created`);
      }
      
      if (!projectId) {
        toast.error('Select a project');
        setLinkingToProject(false);
        return;
      }
      
      // Link tab to project
      const result = addSheetToProject(projectId, {
        id: selectedTabForProject.id,
        name: selectedTabForProject.name,
        url: selectedTabForProject.url,
      });
      
      if (result) {
        toast.success(`Sheet linked to project`);
      } else {
        toast('Sheet already linked to this project', { icon: 'ℹ️' });
      }
      
      refreshTabs();
      setShowProjectModal(false);
      setSelectedTabForProject(null);
      setSelectedProjectId('');
      setNewProjectName('');
      setNewProjectDescription('');
      setCreatingNewProject(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to link sheet');
    } finally {
      setLinkingToProject(false);
    }
  };
  
  const handleUnlinkFromProject = (tabId: string, projectId: string) => {
    removeSheetFromProject(projectId, tabId);
    refreshTabs();
    toast.success('Sheet unlinked from project');
  };
  
  const handleSyncToSupabase = async (tab: SheetTab) => {
    // Must be linked to at least one project
    const linkedProjects = projects.filter(p => {
      const projectSheets = getProjectSheets(p.id);
      return projectSheets.some(ps => ps.tabId === tab.id);
    });
    
    if (linkedProjects.length === 0) {
      toast.error('Please assign this sheet to a project first');
      return;
    }
    
    // Use the first linked project (or let user choose if multiple)
    const project = linkedProjects[0];
    
    // CRITICAL: localStorage projects have negative/UUID IDs - need to create Supabase project first
    if (!project.id || String(project.id).startsWith('-') || isNaN(Number(project.id)) || Number(project.id) <= 0) {
      toast.error(
        `"${project.name}" is a localStorage project. Create a real Supabase project first in the Projects page.`,
        { duration: 6000 }
      );
      return;
    }
    
    setSyncingTabId(tab.id);
    
    try {
      const res = await fetch('/api/sync-sheet-to-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetUrl: tab.url,
          projectId: Number(project.id),
          sheetName: tab.name,
        }),
      });
      
      const data = await res.json() as { 
        error?: string; 
        message?: string;
        insertedRows?: number;
        skippedRows?: number;
      };
      
      if (!res.ok) {
        throw new Error(data.error ?? 'Sync failed');
      }
      
      toast.success(data.message || `Synced ${data.insertedRows || 0} leads`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncingTabId(null);
    }
  };

  // ── Saved tabs handlers ──
  const handleDelete = (tab: SheetTab) => {
    deleteSheetTab(tab.id);
    refreshTabs();
    toast.success(`"${tab.name}" removed`);
  };

  const handleRenameConfirm = (tab: SheetTab) => {
    if (!renameValue.trim()) return;
    renameSheetTab(tab.id, renameValue.trim());
    refreshTabs();
    setRenamingId(null);
    toast.success('Renamed');
  };

  // ── Shared UI pieces ──
  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ' +
    'focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white';

  const btnPrimary =
    'px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg ' +
    'hover:bg-blue-700 transition-colors disabled:opacity-50 ' +
    'disabled:cursor-not-allowed flex items-center gap-2';

  const btnSecondary =
    'px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg ' +
    'hover:bg-gray-50 transition-colors disabled:opacity-50 ' +
    'disabled:cursor-not-allowed flex items-center gap-2';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your profile, account security and Google Sheets connections.
          </p>
        </div>

        {/* ══ PROFILE SETTINGS SECTION ══ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Profile Settings</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Update your display name visible to others in the system.
            </p>
          </div>

          <div className="p-6 space-y-4">
            {/* Email (Read-only) */}
            <div>
              <label htmlFor="user-email-display" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="user-email-display"
                type="email"
                value={currentUserEmail || ''}
                readOnly
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-500 text-sm cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Your email address cannot be changed</p>
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="display-name" className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setDisplayNameError('');
                }}
                maxLength={100}
                placeholder="Enter your full name"
                className={`${inputClass} ${displayNameError ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {displayNameError && (
                <p className="text-xs text-red-600 mt-1">{displayNameError}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                This name will be visible to other users in the team management pages
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveDisplayName}
                disabled={savingDisplayName || displayName.trim() === originalDisplayName}
                className={`${btnPrimary} ${displayName.trim() === originalDisplayName ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {savingDisplayName ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Display Name
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ══ CHANGE PASSWORD SECTION ══ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Change Password</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Update your password. You&apos;ll remain logged in after changing your password.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            {/* Current Password */}
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordErrors(prev => ({ ...prev, currentPassword: '' }));
                }}
                className={`${inputClass} ${passwordErrors.currentPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Enter your current password"
              />
              {passwordErrors.currentPassword && (
                <p className="text-xs text-red-600 mt-1">{passwordErrors.currentPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordErrors(prev => ({ ...prev, newPassword: '' }));
                }}
                className={`${inputClass} ${passwordErrors.newPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Enter your new password"
              />
              {passwordErrors.newPassword && (
                <p className="text-xs text-red-600 mt-1">{passwordErrors.newPassword}</p>
              )}
              {!passwordErrors.newPassword && newPassword.length > 0 && newPassword.length < 8 && (
                <p className="text-xs text-yellow-600 mt-1">Password must be at least 8 characters</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordErrors(prev => ({ ...prev, confirmPassword: '' }));
                }}
                className={`${inputClass} ${passwordErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Confirm your new password"
              />
              {passwordErrors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">{passwordErrors.confirmPassword}</p>
              )}
              {!passwordErrors.confirmPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-yellow-600 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={changingPassword}
                className={btnPrimary}
              >
                {changingPassword ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Changing Password...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Change Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-gray-50 text-gray-500 font-medium">Google Sheets Configuration</span>
          </div>
        </div>

        {/* ══ SECTION 1 — PUBLIC SHEET ══ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Section header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
              1
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Public Sheet</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Sheet shared as "Anyone with link" or published to web. Paste the Sheet ID — all tabs are discovered automatically.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Sheet ID input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Sheet URL or Sheet ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={publicInput}
                  onChange={e => {
                    setPublicInput(e.target.value);
                    setDiscoverError(null);
                    setDiscoveredTabs([]);
                    setSelectedGids(new Set());
                  }}
                  placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
                  className={inputClass}
                />
                <button
                  onClick={handleDiscover}
                  disabled={discovering || !publicInput.trim()}
                  className={btnPrimary + ' whitespace-nowrap'}
                >
                  {discovering ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Fetching...
                    </>
                  ) : 'Fetch Tabs'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                The Sheet ID is the long string in the URL between /d/ and /edit
              </p>
            </div>

            {/* Error state */}
            {discoverError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 whitespace-pre-line">
                {discoverError}
              </div>
            )}

            {/* Discovered tabs checklist */}
            {discoveredTabs.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Found {discoveredTabs.length} tab{discoveredTabs.length > 1 ? 's' : ''}
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedGids(new Set(discoveredTabs.map(t => t.gid)))}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Select all
                    </button>
                    <button
                      onClick={() => setSelectedGids(new Set())}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {discoveredTabs.map(tab => (
                    <label
                      key={tab.gid}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGids.has(tab.gid)}
                        onChange={() => toggleGid(tab.gid)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-800">{tab.name}</span>
                        <span className="ml-2 text-xs text-gray-400">gid={tab.gid}</span>
                      </div>
                      {selectedGids.has(tab.gid) && (
                        <span className="text-xs text-green-600 font-medium">Will be saved</span>
                      )}
                    </label>
                  ))}
                </div>

                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <button
                    onClick={handleSavePublicTabs}
                    disabled={selectedGids.size === 0}
                    className={btnPrimary}
                  >
                    Save {selectedGids.size > 0 ? `${selectedGids.size} Selected Tab` : 'Selected Tabs'}{selectedGids.size > 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══ SECTION 2 — PRIVATE SHEET ══ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
              2
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Private Sheet</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Sheet with restricted access. Publish individual tabs to web and paste each CSV URL here one by one.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tab Name
              </label>
              <input
                type="text"
                value={privateName}
                onChange={e => setPrivateName(e.target.value)}
                placeholder="e.g. Nizampet Leads"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Published CSV URL
              </label>
              <input
                type="url"
                value={privateUrl}
                onChange={e => {
                  setPrivateUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1">
                In your sheet: File → Share → Publish to web → select tab → CSV → Publish → copy URL
              </p>

              {privateUrl.trim() && (
                <div className="mt-2">
                  {isValidCsvUrl(privateUrl) ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-medium">
                      Valid CSV URL
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded text-xs font-medium">
                      Must be a Google Sheets CSV URL
                    </span>
                  )}
                </div>
              )}
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-sm font-medium ${
                  testResult.success
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {testResult.message}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleTest}
                disabled={testing || !privateUrl.trim()}
                className={btnSecondary}
              >
                {testing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Testing...
                  </>
                ) : 'Test Connection'}
              </button>

              <button
                onClick={handleSavePrivateTab}
                disabled={!privateName.trim() || !privateUrl.trim()}
                className={btnPrimary}
              >
                Save Tab
              </button>
            </div>
          </div>
        </div>

        {/* ══ SAVED TABS LIST ══ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">
              Saved Tabs
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({tabs.length} tab{tabs.length !== 1 ? 's' : ''} — all load together on Enquiries)
              </span>
            </h2>
          </div>

          {tabs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-400">
                No tabs saved yet. Add a sheet above to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tabs.map((tab, index) => {
                const tabProjectLinks = projects.filter(p => {
                  const projectSheets = getProjectSheets(p.id);
                  return projectSheets.some(ps => ps.tabId === tab.id);
                });
                const projectCount = getTabProjectCount(tab.id);
                
                return (
                  <div
                    key={tab.id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>

                      <div className="flex-1 min-w-0">
                        {renamingId === tab.id ? (
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="text"
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleRenameConfirm(tab);
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              className="px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
                              autoFocus
                            />
                            <button
                              onClick={() => handleRenameConfirm(tab)}
                              className="text-xs text-blue-600 font-medium hover:text-blue-800"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setRenamingId(null)}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-gray-800 truncate mb-1">
                            {tab.name}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 truncate mb-2">{tab.url}</p>
                        
                        {/* Project assignments */}
                        {projectCount > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {tabProjectLinks.map(project => (
                              <span
                                key={project.id}
                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-medium"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                </svg>
                                {project.name}
                                <button
                                  onClick={() => handleUnlinkFromProject(tab.id, project.id)}
                                  className="ml-0.5 hover:text-purple-900"
                                  title="Unlink from project"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="mb-2">
                            <span className="text-xs text-gray-400 italic">Not assigned to any project</span>
                          </div>
                        )}
                        
                        <button
                          onClick={() => openProjectSelector(tab)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium mr-3"
                        >
                          + Assign to Project
                        </button>
                        
                        {projectCount > 0 && (
                          <button
                            onClick={() => handleSyncToSupabase(tab)}
                            disabled={syncingTabId === tab.id}
                            className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                          >
                            {syncingTabId === tab.id ? '⏳ Syncing...' : '🔄 Sync to Supabase'}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => {
                            setRenamingId(tab.id);
                            setRenameValue(tab.name);
                          }}
                          className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleDelete(tab)}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ══ PROJECT ASSIGNMENT MODAL ══ */}
        {showProjectModal && selectedTabForProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Assign to Project
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Link &quot;{selectedTabForProject.name}&quot; to a project
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Toggle between existing and new project */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setCreatingNewProject(false)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      !creatingNewProject
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Select Existing
                  </button>
                  <button
                    onClick={() => setCreatingNewProject(true)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      creatingNewProject
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Create New
                  </button>
                </div>

                {creatingNewProject ? (
                  /* Create new project form */
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)}
                        placeholder="e.g. Better Castings"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (optional)
                      </label>
                      <textarea
                        value={newProjectDescription}
                        onChange={e => setNewProjectDescription(e.target.value)}
                        placeholder="Brief project description..."
                        rows={3}
                        className={inputClass}
                      />
                    </div>
                  </div>
                ) : (
                  /* Select existing project */
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Choose Project <span className="text-red-500">*</span>
                    </label>
                    {projects.length === 0 ? (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                        <p className="text-sm text-gray-500 mb-2">No projects yet</p>
                        <button
                          onClick={() => setCreatingNewProject(true)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Create your first project
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
                        {projects.map(project => (
                          <label
                            key={project.id}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedProjectId === project.id
                                ? 'bg-blue-50 border-2 border-blue-500'
                                : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="radio"
                              name="project"
                              value={project.id}
                              checked={selectedProjectId === project.id}
                              onChange={() => setSelectedProjectId(project.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{project.name}</p>
                              {project.description && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{project.description}</p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowProjectModal(false);
                    setSelectedTabForProject(null);
                    setSelectedProjectId('');
                    setNewProjectName('');
                    setNewProjectDescription('');
                    setCreatingNewProject(false);
                  }}
                  disabled={linkingToProject}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkToProject}
                  disabled={linkingToProject || (!creatingNewProject && !selectedProjectId) || (creatingNewProject && !newProjectName.trim())}
                  className={btnPrimary}
                >
                  {linkingToProject ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Linking...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {creatingNewProject ? 'Create & Link' : 'Link to Project'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
