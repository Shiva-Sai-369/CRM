'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  useProjectStore,
  getTabsForSheet,
} from '@/store/projectStore';
import {
  extractSheetId,
  buildCsvUrl,
  isValidCsvUrl,
  getPublicSheetId,
  savePublicSheetId,
} from '@/lib/config';
import {
  discoverPublicSheetTabs,
  fetchLeadsFromCsv,
  type DiscoveredTab,
} from '@/lib/services/fetchLeads';
import type { ProjectSheetTab, Sheet } from '@/types/project';

type TestResult = {
  success: boolean;
  message: string;
} | null;

interface TabRowProps {
  tab: ProjectSheetTab;
  onToggleIncluded: (tabId: string) => void;
  onDeleteTab: (tabId: string) => void;
}

function TabRow({ tab, onToggleIncluded, onDeleteTab }: TabRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 rounded border border-gray-200">
      <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
        <input
          type="checkbox"
          checked={tab.included !== false}
          onChange={() => onToggleIncluded(tab.id)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800 truncate">{tab.name}</p>
          <p className="text-xs text-gray-400 truncate">{tab.url}</p>
        </div>
      </label>

      <button
        onClick={() => onDeleteTab(tab.id)}
        className="text-gray-400 hover:text-red-600 transition-colors p-1 flex-shrink-0"
        aria-label={`Delete tab ${tab.name}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}

interface SheetCardProps {
  sheet: Sheet;
  tabs: ProjectSheetTab[];
  onToggleIncluded: (tabId: string) => void;
  onDeleteTab: (tabId: string) => void;
  onDeleteSheet: (sheetId: string) => void;
  children?: ReactNode;
}

function SheetCard({
  sheet,
  tabs,
  onToggleIncluded,
  onDeleteTab,
  onDeleteSheet,
  children,
}: SheetCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => setExpanded((current) => !current)}
              className="text-sm font-semibold text-gray-900 hover:text-blue-600 flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {sheet.label}
            </button>
            <p className="text-xs text-gray-500 mt-1">
              {sheet.type === 'public' && sheet.sheetIdOrKey ? `${sheet.sheetIdOrKey} · ` : ''}
              {tabs.length} tab{tabs.length !== 1 ? 's' : ''}
            </p>
          </div>

          <button
            onClick={() => onDeleteSheet(sheet.id)}
            className="text-gray-400 hover:text-red-600 transition-colors p-1"
            aria-label={`Delete sheet ${sheet.label}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-2">
            {tabs.length === 0 ? (
              <p className="text-xs text-gray-400 ml-6">No tabs yet</p>
            ) : (
              <div className="ml-6 space-y-2">
                {tabs.map((tab) => (
                  <TabRow
                    key={tab.id}
                    tab={tab}
                    onToggleIncluded={onToggleIncluded}
                    onDeleteTab={onDeleteTab}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {children && <div className="mt-4 border-t border-gray-200 pt-4">{children}</div>}
      </div>
    </div>
  );
}

interface PublicSheetFormProps {
  projectId: string;
  publicSheetCount: number;
}

function PublicSheetForm({ projectId, publicSheetCount }: PublicSheetFormProps) {
  const addSheet = useProjectStore((state) => state.addSheet);
  const addTabs = useProjectStore((state) => state.addTabs);

  const [publicInput, setPublicInput] = useState('');
  const [publicLabel, setPublicLabel] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [discoveredTabs, setDiscoveredTabs] = useState<DiscoveredTab[]>([]);
  const [selectedGids, setSelectedGids] = useState<Set<number>>(new Set());
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  useEffect(() => {
    setPublicInput(getPublicSheetId());
  }, []);

  const toggleGid = (gid: number) => {
    setSelectedGids((current) => {
      const next = new Set(current);
      if (next.has(gid)) {
        next.delete(gid);
      } else {
        next.add(gid);
      }
      return next;
    });
  };

  const handleDiscover = async () => {
    const sheetId = extractSheetId(publicInput);
    if (!sheetId) {
      setDiscoverError('Paste your full Google Sheets URL or just the Sheet ID.');
      return;
    }

    setDiscovering(true);
    setDiscoveredTabs([]);
    setSelectedGids(new Set());
    setDiscoverError(null);

    const result = await discoverPublicSheetTabs(sheetId);
    setDiscovering(false);

    if (result.error) {
      setDiscoverError(result.error);
      return;
    }

    setDiscoveredTabs(result.tabs);
    setSelectedGids(new Set(result.tabs.map((tab) => tab.gid)));
  };

  const handleSave = () => {
    const sheetId = extractSheetId(publicInput);
    if (!sheetId) {
      toast.error('Invalid Sheet ID');
      return;
    }

    const selectedTabs = discoveredTabs.filter((tab) => selectedGids.has(tab.gid));
    if (selectedTabs.length === 0) {
      toast.error('Select at least one tab');
      return;
    }

    const label = publicLabel.trim() || `Public Sheet ${publicSheetCount + 1}`;
    const sheet = addSheet(projectId, 'public', label, sheetId);

    addTabs(
      sheet.id,
      selectedTabs.map((tab) => ({
        name: tab.name,
        url: buildCsvUrl(sheetId, tab.gid),
        addedAt: new Date().toISOString(),
        included: true,
      }))
    );

    savePublicSheetId(sheetId);
    toast.success(`${label} added with ${selectedTabs.length} tab${selectedTabs.length > 1 ? 's' : ''}`);

    setPublicInput('');
    setPublicLabel('');
    setDiscoverError(null);
    setDiscoveredTabs([]);
    setSelectedGids(new Set());
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Google Sheet URL or ID</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={publicInput}
            onChange={(event) => {
              setPublicInput(event.target.value);
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
            className={btnPrimary}
          >
            {discovering ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Fetching...
              </>
            ) : (
              'Fetch Tabs'
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">The Sheet ID is the long string in the URL between /d/ and /edit</p>
      </div>

      {discoverError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 whitespace-pre-line">
          {discoverError}
        </div>
      )}

      {discoveredTabs.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Found {discoveredTabs.length} tab{discoveredTabs.length > 1 ? 's' : ''}
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedGids(new Set(discoveredTabs.map((tab) => tab.gid)))}
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

          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {discoveredTabs.map((tab) => (
              <label
                key={tab.gid}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedGids.has(tab.gid)}
                  onChange={() => toggleGid(tab.gid)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800">{tab.name}</span>
                  <span className="ml-2 text-xs text-gray-400">gid={tab.gid}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="p-4 space-y-4 border-t border-gray-200 bg-gray-50">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <input
                type="text"
                value={publicLabel}
                onChange={(event) => setPublicLabel(event.target.value)}
                placeholder={`e.g. Instagram Leads`}
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1">
                If left blank, will use "Public Sheet {publicSheetCount + 1}"
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={selectedGids.size === 0}
              className={btnPrimary}
            >
              Save Sheet & {selectedGids.size} Tab{selectedGids.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface PrivateSheetCardProps {
  sheet: Sheet;
  tabs: ProjectSheetTab[];
  onToggleIncluded: (tabId: string) => void;
  onDeleteTab: (tabId: string) => void;
  onDeleteSheet: (sheetId: string) => void;
  onAddTab: (sheetId: string, name: string, url: string) => void;
}

function PrivateSheetCard({
  sheet,
  tabs,
  onToggleIncluded,
  onDeleteTab,
  onDeleteSheet,
  onAddTab,
}: PrivateSheetCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tabName, setTabName] = useState('');
  const [tabUrl, setTabUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ' +
    'focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white';

  const btnPrimary =
    'px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg ' +
    'hover:bg-blue-700 transition-colors disabled:opacity-50 ' +
    'disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap';

  const btnSecondary =
    'px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg ' +
    'hover:bg-gray-50 transition-colors disabled:opacity-50 ' +
    'disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap';

  const handleTestConnection = async () => {
    const url = tabUrl.trim();
    if (!url) {
      toast.error('Enter a URL first');
      return;
    }

    if (!isValidCsvUrl(url)) {
      toast.error('Must be a Google Sheets published CSV URL');
      return;
    }

    setTesting(true);
    setTestResult(null);

    const result = await fetchLeadsFromCsv(url);
    setTesting(false);

    setTestResult(
      result.error
        ? { success: false, message: result.error }
        : { success: true, message: `Connected — ${result.total} leads found` }
    );
  };

  const handleAddTab = () => {
    const name = tabName.trim();
    const url = tabUrl.trim();

    if (!name) {
      toast.error('Enter a tab name');
      return;
    }

    if (!url) {
      toast.error('Enter a CSV URL');
      return;
    }

    if (!isValidCsvUrl(url)) {
      toast.error('Must be a Google Sheets published CSV URL');
      return;
    }

    onAddTab(sheet.id, name, url);
    toast.success(`"${name}" added to ${sheet.label}`);
    setTabName('');
    setTabUrl('');
    setTestResult(null);
    setExpanded(true);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => setExpanded((current) => !current)}
              className="text-sm font-semibold text-gray-900 hover:text-blue-600 flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {sheet.label}
            </button>
            <p className="text-xs text-gray-500 mt-1">
              {tabs.length} tab{tabs.length !== 1 ? 's' : ''}
            </p>
          </div>

          <button
            onClick={() => onDeleteSheet(sheet.id)}
            className="text-gray-400 hover:text-red-600 transition-colors p-1"
            aria-label={`Delete sheet ${sheet.label}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-2">
            {tabs.length === 0 ? (
              <p className="text-xs text-gray-400 ml-6">No tabs yet</p>
            ) : (
              <div className="ml-6 space-y-2">
                {tabs.map((tab) => (
                  <TabRow
                    key={tab.id}
                    tab={tab}
                    onToggleIncluded={onToggleIncluded}
                    onDeleteTab={onDeleteTab}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 border-t border-gray-200 pt-4 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tab Name</label>
              <input
                type="text"
                value={tabName}
                onChange={(event) => setTabName(event.target.value)}
                placeholder="e.g. Nizampet Leads"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Published CSV URL</label>
              <input
                type="url"
                value={tabUrl}
                onChange={(event) => {
                  setTabUrl(event.target.value);
                  setTestResult(null);
                }}
                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1">
                In your sheet: File → Share → Publish to web → select tab → CSV → Publish → copy URL
              </p>

              {tabUrl.trim() && (
                <div className="mt-2">
                  {isValidCsvUrl(tabUrl) ? (
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
          </div>

          <div className="flex gap-3">
            <button onClick={handleTestConnection} disabled={testing || !tabUrl.trim()} className={btnSecondary}>
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

            <button onClick={handleAddTab} disabled={!tabName.trim() || !tabUrl.trim()} className={btnPrimary}>
              Add Tab
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const projects = useProjectStore((state) => state.projects);
  const sheets = useProjectStore((state) => state.sheets);
  const tabs = useProjectStore((state) => state.tabs);
  const addSheet = useProjectStore((state) => state.addSheet);
  const addTabs = useProjectStore((state) => state.addTabs);
  const deleteSheet = useProjectStore((state) => state.deleteSheet);
  const deleteTab = useProjectStore((state) => state.deleteTab);
  const toggleTabIncluded = useProjectStore((state) => state.toggleTabIncluded);

  const project = projects.find((item) => item.id === projectId);

  useEffect(() => {
    if (!project) {
      toast.error('Project not found');
      router.push('/projects');
    }
  }, [project, router]);

  const projectSheets = useMemo(
    () => sheets.filter((sheet) => sheet.projectId === projectId),
    [sheets, projectId]
  );

  const publicSheets = useMemo(
    () => projectSheets.filter((sheet) => sheet.type === 'public'),
    [projectSheets]
  );
  const privateSheets = useMemo(
    () => projectSheets.filter((sheet) => sheet.type === 'private'),
    [projectSheets]
  );

  if (!project) {
    return null;
  }

  const handleAddPrivateTab = (sheetId: string, name: string, url: string) => {
    addTabs(sheetId, [
      {
        name,
        url,
        addedAt: new Date().toISOString(),
        included: true,
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-lg shadow-sm flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-sm text-gray-500 mt-1">Manage sheets and tabs for this project</p>
          </div>
          <button
            onClick={() => router.push('/projects')}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Projects
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
              1
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Public Sheets</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Sheets shared as "Anyone with link" or published to web. All tabs are discovered automatically.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {publicSheets.length > 0 && (
              <div className="space-y-2">
                {publicSheets.map((sheet) => {
                  const sheetTabs = tabs.filter((tab) => tab.sheetId === sheet.id);

                  return (
                    <SheetCard
                      key={sheet.id}
                      sheet={sheet}
                      tabs={sheetTabs}
                      onToggleIncluded={toggleTabIncluded}
                      onDeleteTab={deleteTab}
                      onDeleteSheet={deleteSheet}
                    />
                  );
                })}
              </div>
            )}

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Add Public Sheet</h3>
              <PublicSheetForm
                projectId={projectId}
                publicSheetCount={publicSheets.length}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
              2
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Private Sheets</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Sheets with restricted access. Publish individual tabs as CSV and add them one by one.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {privateSheets.length > 0 && (
              <div className="space-y-2">
                {privateSheets.map((sheet) => {
                  const sheetTabs = getTabsForSheet(sheet.id);

                  return (
                    <PrivateSheetCard
                      key={sheet.id}
                      sheet={sheet}
                      tabs={sheetTabs}
                      onToggleIncluded={toggleTabIncluded}
                      onDeleteTab={deleteTab}
                      onDeleteSheet={deleteSheet}
                      onAddTab={handleAddPrivateTab}
                    />
                  );
                })}
              </div>
            )}

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Add Private Sheet</h3>
              <PrivateSheetCreateForm
                onCreate={(label) => addSheet(projectId, 'private', label, '')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PrivateSheetCreateFormProps {
  onCreate: (label: string) => void;
}

function PrivateSheetCreateForm({ onCreate }: PrivateSheetCreateFormProps) {
  const [privateSheetLabel, setPrivateSheetLabel] = useState('');

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ' +
    'focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white';

  const btnPrimary =
    'px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg ' +
    'hover:bg-blue-700 transition-colors disabled:opacity-50 ' +
    'disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap';

  const handleCreate = () => {
    const label = privateSheetLabel.trim();
    if (!label) {
      toast.error('Enter a sheet label');
      return;
    }

    onCreate(label);
    toast.success(`Private sheet "${label}" created`);
    setPrivateSheetLabel('');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sheet Label</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={privateSheetLabel}
            onChange={(event) => setPrivateSheetLabel(event.target.value)}
            placeholder="e.g. Facebook Leads Private Sheet"
            className={inputClass}
          />
          <button onClick={handleCreate} disabled={!privateSheetLabel.trim()} className={btnPrimary}>
            Create Sheet
          </button>
        </div>
      </div>
    </div>
  );
}
