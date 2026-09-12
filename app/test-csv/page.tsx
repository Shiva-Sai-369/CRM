'use client';

import { useState } from 'react';

export default function TestCSVPage() {
  const [csvUrl, setCsvUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testCSV = async () => {
    if (!csvUrl.trim()) {
      alert('Enter a CSV URL first');
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const res = await fetch('/api/test-csv-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvUrl: csvUrl.trim() }),
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Failed to test CSV',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">🧪 CSV Parser Test</h1>
          <p className="text-sm text-gray-500 mt-1">
            Test your CSV URL to see exactly what data is being parsed and identify any issues.
          </p>
        </div>

        {/* Input */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste Your CSV URL:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={csvUrl}
              onChange={(e) => setCsvUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <button
              onClick={testCSV}
              disabled={testing || !csvUrl.trim()}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {testing ? 'Testing...' : 'Test CSV'}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Error */}
            {result.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-900 font-semibold mb-2">❌ Error</h3>
                <p className="text-red-700">{result.error}</p>
              </div>
            )}

            {/* Issues */}
            {result.potentialIssues && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Detected Issues</h3>
                <div className="space-y-2">
                  {result.potentialIssues.map((issue: string, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        issue.includes('✅')
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : issue.includes('❌')
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                      }`}
                    >
                      {issue}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Headers */}
            {result.headers && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Column Headers</h3>
                <div className="flex flex-wrap gap-2">
                  {result.headers.map((header: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      {header}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  Total columns: {result.headers.length}
                </p>
              </div>
            )}

            {/* Column Analysis */}
            {result.columnAnalysis && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Column Analysis</h3>
                <div className="space-y-3">
                  {Object.entries(result.columnAnalysis).map(([column, info]: [string, any]) => (
                    <div key={column} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{column}</h4>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            parseFloat(info.fillRate) > 80
                              ? 'bg-green-100 text-green-800'
                              : parseFloat(info.fillRate) > 50
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {info.fillRate} filled
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {info.nonEmptyCount} of {info.totalCount} rows have data
                      </p>
                      {info.sampleValues && info.sampleValues.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Sample values:</p>
                          <div className="flex flex-wrap gap-1">
                            {info.sampleValues.map((val: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono"
                              >
                                {val.length > 30 ? val.substring(0, 30) + '...' : val}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* First Rows */}
            {result.firstThreeRows && result.firstThreeRows.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📝 First 3 Data Rows
                </h3>
                <div className="space-y-3">
                  {result.firstThreeRows.map((row: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <p className="text-xs text-gray-500 mb-2">Row {idx + 1}:</p>
                      <pre className="text-xs overflow-x-auto bg-white p-3 rounded border border-gray-200">
                        {JSON.stringify(row, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Data Preview */}
            {result.firstChars && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📄 Raw CSV Preview</h3>
                <pre className="text-xs overflow-x-auto bg-gray-50 p-4 rounded border border-gray-200 font-mono">
                  {result.firstChars}
                </pre>
                <p className="text-sm text-gray-600 mt-2">
                  Total CSV size: {result.totalLength} characters | Total rows: {result.totalRows}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
