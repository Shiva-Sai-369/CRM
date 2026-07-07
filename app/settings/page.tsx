'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getSheetTabs,
  saveSheetTab,
  deleteSheetTab,
  renameSheetTab,
  isValidCsvUrl,
  type SheetTab,
} from '@/lib/config';
import { fetchLeadsFromCsv } from '@/lib/services/fetchLeads';

export default function SettingsPage() {
  // Form state for adding a new tab
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Saved tabs state
  const [tabs, setTabs] = useState<SheetTab[]>([]);

  // Inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Load saved tabs on mount
  useEffect(() => {
    setTabs(getSheetTabs());
  }, []);

  const refreshTabs = () => setTabs(getSheetTabs());

  const handleTest = async () => {
    if (!newUrl.trim()) {
      toast.error('Enter a URL first');
      return;
    }

    if (!isValidCsvUrl(newUrl)) {
      toast.error('Must be a Google Sheets published CSV URL');
      return;
    }

    setTesting(true);
    setTestResult(null);

    const result = await fetchLeadsFromCsv(newUrl);
    setTesting(false);

    if (result.error) {
      setTestResult({ success: false, message: result.error });
    } else {
      setTestResult({
        success: true,
        message: `Connected — ${result.total} leads found`,
      });
    }
  };

  const handleSave = () => {
    if (!newName.trim()) {
      toast.error('Enter a tab name');
      return;
    }

    if (!newUrl.trim()) {
      toast.error('Enter a CSV URL');
      return;
    }

    if (!isValidCsvUrl(newUrl)) {
      toast.error('Must be a Google Sheets published CSV URL');
      return;
    }

    saveSheetTab({ name: newName.trim(), url: newUrl.trim() });
    refreshTabs();
    setNewName('');
    setNewUrl('');
    setTestResult(null);
    toast.success(`Tab "${newName.trim()}" saved`);
  };

  const handleDelete = (tab: SheetTab) => {
    deleteSheetTab(tab.id);
    refreshTabs();
    toast.success(`Tab "${tab.name}" removed`);
  };

  const handleRenameStart = (tab: SheetTab) => {
    setRenamingId(tab.id);
    setRenameValue(tab.name);
  };

  const handleRenameConfirm = (tab: SheetTab) => {
    if (!renameValue.trim()) return;
    renameSheetTab(tab.id, renameValue.trim());
    refreshTabs();
    setRenamingId(null);
    toast.success('Tab renamed');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Add one CSV link per sheet tab. All tabs load together on the Enquiries page.
          </p>
        </div>

        {/* ── SECTION A: Add new tab ── */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Add Sheet Tab
          </h2>

          <div className="space-y-4">
            {/* Tab name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tab Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Nizampet Leads"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* CSV URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Published CSV URL
              </label>
              <input
                type="url"
                value={newUrl}
                onChange={e => {
                  setNewUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                In your Google Sheet: File → Share → Publish to web → select the tab → CSV → Publish → copy URL
              </p>

              {/* URL validity badge */}
              {newUrl.trim() && (
                <div className="mt-2">
                  {isValidCsvUrl(newUrl) ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-medium">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Valid CSV URL
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded text-xs font-medium">
                      Must be a Google Sheets published CSV URL
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Test result */}
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

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleTest}
                disabled={testing || !newUrl.trim()}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {testing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>

              <button
                onClick={handleSave}
                disabled={!newName.trim() || !newUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                Save Tab
              </button>
            </div>
          </div>
        </div>

        {/* ── SECTION B: Saved tabs list ── */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Saved Tabs
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({tabs.length} tab{tabs.length !== 1 ? 's' : ''})
            </span>
          </h2>

          {tabs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No tabs saved yet. Add your first tab above.
            </p>
          ) : (
            <div className="space-y-3">
              {tabs.map((tab, index) => (
                <div
                  key={tab.id}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  {/* Index badge */}
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>

                  {/* Name + URL */}
                  <div className="flex-1 min-w-0">
                    {renamingId === tab.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameConfirm(tab);
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          className="px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
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
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {tab.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {tab.url}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRenameStart(tab)}
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}