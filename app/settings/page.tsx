"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [sheetUrl, setSheetUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [sheetRange, setSheetRange] = useState("Sheet1!A1:Z1000");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [useApi, setUseApi] = useState(false);

  useEffect(() => {
    // Load saved settings from localStorage
    const savedUrl = localStorage.getItem("sheetUrl");
    const savedApiKey = localStorage.getItem("googleApiKey");
    const savedRange = localStorage.getItem("sheetRange");
    const savedUseApi = localStorage.getItem("useApi");

    if (savedUrl) setSheetUrl(savedUrl);
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedRange) setSheetRange(savedRange);
    if (savedUseApi === "true") setUseApi(true);
  }, []);

  const handleSave = () => {
    setError("");
    setSaved(false);

    // Validate URL
    if (!sheetUrl.trim()) {
      setError("Please enter a Google Sheets URL");
      return;
    }

    if (useApi && !apiKey.trim()) {
      setError("Please enter a Google API key when using API mode");
      return;
    }

    // Save to localStorage
    localStorage.setItem("sheetUrl", sheetUrl.trim());
    localStorage.setItem("googleApiKey", apiKey.trim());
    localStorage.setItem("sheetRange", sheetRange.trim());
    localStorage.setItem("useApi", useApi.toString());
    
    setSaved(true);

    // Hide success message after 3 seconds
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTest = async () => {
    setError("");
    setSaved(false);

    if (!sheetUrl.trim()) {
      setError("Please enter a Google Sheets URL first");
      return;
    }

    try {
      const { fetchLeadsFromGoogleSheet } = await import("@/lib/googleSheetsApi");
      const leads = await fetchLeadsFromGoogleSheet(
        sheetUrl,
        useApi ? apiKey : undefined,
        sheetRange
      );
      
      alert(`✓ Connection successful! Loaded ${leads.length} leads.`);
    } catch (err) {
      setError(`Connection failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Configure your Google Sheet CSV data source</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Google Sheet Configuration
        </h2>

        <div className="space-y-6">
          {/* Sheet URL */}
          <div>
            <label htmlFor="sheetUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Google Sheets URL or Spreadsheet ID
            </label>
            <input
              id="sheetUrl"
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Paste the full Google Sheets URL or just the spreadsheet ID
            </p>
          </div>

          {/* API Mode Toggle */}
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={useApi}
                onChange={(e) => setUseApi(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-gray-900">
                  Use Google Sheets API (for private sheets)
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  Enable this if your sheet has restricted access. Requires a Google API key.
                </p>
              </div>
            </label>
          </div>

          {/* API Key (shown only when useApi is true) */}
          {useApi && (
            <>
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  Google API Key <span className="text-red-500">*</span>
                </label>
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Required for accessing private sheets
                </p>
              </div>

              <div>
                <label htmlFor="sheetRange" className="block text-sm font-medium text-gray-700 mb-2">
                  Sheet Range
                </label>
                <input
                  id="sheetRange"
                  type="text"
                  value={sheetRange}
                  onChange={(e) => setSheetRange(e.target.value)}
                  placeholder="Sheet1!A1:Z1000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Specify which cells to fetch (e.g., Sheet1!A1:Z1000 or Form Responses 1!A:Z)
                </p>
              </div>
            </>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Save URL
            </button>
            <button
              onClick={handleTest}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Test Connection
            </button>
          </div>

          {saved && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">✓ Settings saved successfully!</p>
              <p className="text-green-700 text-sm mt-1">
                Go to the Enquiries page to see your leads.
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">✗ {error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions based on mode */}
      {!useApi ? (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            📋 Option 1: Publish Sheet as CSV (Recommended for simplicity)
          </h3>
          <ol className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <span className="font-bold mr-2">1.</span>
              <span>Open your Google Sheet with Form responses</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">2.</span>
              <span>Go to <strong>File → Share → Publish to web</strong></span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">3.</span>
              <span>Select the sheet tab (e.g., "Form Responses 1")</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">4.</span>
              <span>In the dropdown, select <strong>"Comma-separated values (.csv)"</strong></span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">5.</span>
              <span>Click <strong>Publish</strong> → Copy the URL and paste above</span>
            </li>
          </ol>
          <div className="mt-4 p-3 bg-blue-100 rounded border border-blue-300">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Publishing makes the data publicly readable, but doesn't give edit access. 
              Your form and sheet remain secure - only the published CSV is readable.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-3">
            🔐 Option 2: Use Google Sheets API (For private sheets)
          </h3>
          <ol className="space-y-2 text-purple-800">
            <li className="flex items-start">
              <span className="font-bold mr-2">1.</span>
              <span>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">2.</span>
              <span>Create a new project or select existing one</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">3.</span>
              <span>Enable <strong>"Google Sheets API"</strong></span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">4.</span>
              <span>Go to <strong>Credentials → Create Credentials → API Key</strong></span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">5.</span>
              <span>Copy the API key and paste it above</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">6.</span>
              <span>In your Google Sheet, click <strong>Share</strong> and give the API project access (or make it "Anyone with link can view")</span>
            </li>
          </ol>
        </div>
      )}

      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Supported CSV Column Names:
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          The app automatically detects and supports multiple column name formats:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h4 className="font-semibold mb-2">Standard Format:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Name</li>
              <li>Email</li>
              <li>Phone</li>
              <li>Lead Source</li>
              <li>Lead Status</li>
              <li>Tags</li>
              <li>Last Message</li>
              <li>Last Message Date</li>
              <li>Notes</li>
              <li>Platform</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Alternative Format (Facebook/Instagram Leads):</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>full_name</li>
              <li>email</li>
              <li>phone_number</li>
              <li>campaign_name / form_name</li>
              <li>lead_status</li>
              <li>created_time</li>
              <li>platform</li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          The parser will automatically use whichever column names are present in your sheet.
        </p>
      </div>
    </div>
  );
}
