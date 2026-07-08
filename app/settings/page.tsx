'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
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

export default function SettingsPage() {
  // ── Saved tabs (shared between both sections) ──
  const [tabs, setTabs] = useState<SheetTab[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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
    setTabs(getSheetTabs());
    setPublicInput(getPublicSheetId());
  }, []);

  const refreshTabs = () => setTabs(getSheetTabs());

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
    toSave.forEach(t => saveSheetTab({ name: t.name, url: t.csvUrl }));
    refreshTabs();
    setDiscoveredTabs([]);
    setSelectedGids(new Set());
    toast.success(`${toSave.length} tab${toSave.length > 1 ? 's' : ''} saved`);
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

    saveSheetTab({ name: privateName.trim(), url: privateUrl.trim() });
    refreshTabs();
    setPrivateName('');
    setPrivateUrl('');
    setTestResult(null);
    toast.success(`"${privateName.trim()}" saved`);
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
            Connect your Google Sheets. Public and private sheets are merged together on the Enquiries page.
          </p>
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
              {tabs.map((tab, index) => (
                <div
                  key={tab.id}
                  className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>

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
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {tab.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 truncate mt-0.5">{tab.url}</p>
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
