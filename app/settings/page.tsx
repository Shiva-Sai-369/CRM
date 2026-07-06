"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getSheetUrl, saveSheetUrl, detectUrlType } from "@/lib/config";
import { fetchLeads } from "@/lib/services/fetchLeads";

export default function SettingsPage() {
  const [scriptUrl, setScriptUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [urlType, setUrlType] = useState<'csv' | 'script' | 'unknown'>('unknown');

  useEffect(() => {
    setScriptUrl(getSheetUrl());
  }, []);

  // Detect URL type as user types
  useEffect(() => {
    setUrlType(detectUrlType(scriptUrl));
  }, [scriptUrl]);

  const handleSave = () => {
    if (!scriptUrl.trim()) {
      toast.error("Please enter a sheet URL");
      return;
    }

    const type = detectUrlType(scriptUrl);
    if (type === 'unknown') {
      toast.error("Please enter a valid Google Sheets URL");
      return;
    }

    saveSheetUrl(scriptUrl);
    setSaved(true);
    toast.success("✓ Sheet URL saved");

    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    if (!scriptUrl.trim()) {
      toast.error("Please enter a sheet URL first");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await fetchLeads(scriptUrl);
      
      if (result.error) {
        setTestResult({ success: false, message: result.error });
        toast.error(`Connection failed: ${result.error}`);
      } else {
        const message = `✓ Connected — ${result.total} leads found`;
        setTestResult({ success: true, message });
        toast.success(message, {
          duration: 4000,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setTestResult({ success: false, message: `Connection failed: ${message}` });
      toast.error(`Connection failed: ${message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 bg-white border-b border-gray-200 px-6 py-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-sm text-gray-500">Configure your Google Sheets data source</p>
        </div>

        {/* Apps Script Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Google Sheets Connection</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="scriptUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Google Sheet URL
              </label>
              <input
                id="scriptUrl"
                type="url"
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                placeholder="Paste a published CSV URL or Apps Script URL"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
              />
              <p className="text-sm text-gray-500 mt-2">
                Two options:<br />
                • <strong>Public sheet:</strong> File → Share → Publish to web → Select "Comma-separated values (.csv)" → Publish → copy CSV URL<br />
                • <strong>Private sheet:</strong> use the Apps Script method in docs/google-apps-script.js
              </p>
              
              {/* URL Type Indicator */}
              {scriptUrl.trim() && (
                <div className="mt-3">
                  {urlType === 'csv' && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Public CSV URL
                    </span>
                  )}
                  {urlType === 'script' && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Apps Script URL
                    </span>
                  )}
                  {urlType === 'unknown' && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Unrecognized URL format
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleTest}
                disabled={testing || !scriptUrl.trim()}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {testing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Testing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Test Connection
                  </>
                )}
              </button>

              <button
                onClick={handleSave}
                disabled={!scriptUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saved ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved!
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save
                  </>
                )}
              </button>
            </div>
            
            {/* Test Result Message */}
            {testResult && (
              <div className={`p-3 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-sm font-medium ${testResult.success ? 'text-green-900' : 'text-red-900'}`}>
                  {testResult.message}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 Setup Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-900 text-sm">
            <li>Open your Google Sheet with lead data</li>
            <li>Click <strong>Extensions → Apps Script</strong></li>
            <li>Delete any existing code in the editor</li>
            <li>Copy the code from <code className="bg-blue-100 px-2 py-1 rounded">docs/google-apps-script.js</code></li>
            <li>Paste it into the Apps Script editor</li>
            <li>Click the <strong>Save</strong> icon (floppy disk)</li>
            <li>Click <strong>Deploy → New deployment</strong></li>
            <li>Select type: <strong>Web app</strong></li>
            <li>Set "Execute as": <strong>Me</strong></li>
            <li>Set "Who has access": <strong>Anyone</strong></li>
            <li>Click <strong>Deploy</strong> and copy the Web App URL</li>
            <li>Paste the URL above and click <strong>Save</strong></li>
          </ol>
        </div>
      </div>
    </div>
  );
}
