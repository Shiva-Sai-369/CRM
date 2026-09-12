'use client';

import { useState } from 'react';

interface TestResult {
  success: boolean;
  message: string;
  details?: {
    rowCount?: number;
    headers?: string[];
    sampleRow?: string[];
    firstChars?: string;
  };
}

export default function SheetUrlTester() {
  const [testUrl, setTestUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const testSheetUrl = async () => {
    if (!testUrl.trim()) {
      setResult({
        success: false,
        message: 'Please enter a URL to test',
      });
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      // Test fetch
      const response = await fetch(testUrl);
      
      if (!response.ok) {
        setResult({
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
        });
        setTesting(false);
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      // Check if HTML instead of CSV
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        setResult({
          success: false,
          message: 'Sheet returned HTML instead of CSV. Make sure you publish as CSV, not web page.',
          details: {
            firstChars: text.substring(0, 200),
          },
        });
        setTesting(false);
        return;
      }

      // Check if empty
      if (!text || text.trim() === '') {
        setResult({
          success: false,
          message: 'Sheet returned empty data. Make sure your sheet has data and is properly published.',
        });
        setTesting(false);
        return;
      }

      // Parse CSV
      const lines = text.trim().split('\n');
      const headers = parseCSVLine(lines[0]);
      const firstDataRow = lines.length > 1 ? parseCSVLine(lines[1]) : [];

      // Check for required columns
      const hasName = headers.some(h => /name|full_name/i.test(h));
      const hasEmail = headers.some(h => /email/i.test(h));
      const hasPhone = headers.some(h => /phone|phone_number/i.test(h));

      if (!hasName && !hasEmail && !hasPhone) {
        setResult({
          success: false,
          message: 'No required columns found. Sheet must have at least one of: Name, Email, or Phone',
          details: {
            headers,
            rowCount: lines.length,
          },
        });
        setTesting(false);
        return;
      }

      // Success!
      setResult({
        success: true,
        message: `✅ Sheet is accessible! Found ${lines.length - 1} data rows.`,
        details: {
          rowCount: lines.length - 1,
          headers,
          sampleRow: firstDataRow,
          firstChars: text.substring(0, 200),
        },
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch sheet',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-2">
        <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900">Debug: Test Your Sheet URL</h3>
          <p className="text-xs text-amber-700 mt-1">
            Use this tool to check if your Google Sheets URL is correctly formatted and accessible.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-amber-900">
          Paste your CSV URL here:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
            className="flex-1 px-3 py-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white"
          />
          <button
            onClick={testSheetUrl}
            disabled={testing || !testUrl.trim()}
            className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {testing ? 'Testing...' : 'Test URL'}
          </button>
        </div>
      </div>

      {result && (
        <div className={`rounded-lg p-3 text-sm ${
          result.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start gap-2">
            {result.success ? (
              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div className="flex-1">
              <p className={result.success ? 'text-green-800 font-medium' : 'text-red-800 font-medium'}>
                {result.message}
              </p>

              {result.details && (
                <div className="mt-2 space-y-1 text-xs">
                  {result.details.rowCount !== undefined && (
                    <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                      <strong>Rows:</strong> {result.details.rowCount}
                    </p>
                  )}
                  {result.details.headers && result.details.headers.length > 0 && (
                    <div>
                      <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                        <strong>Headers found:</strong>
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.details.headers.map((header, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-white rounded text-xs font-mono border border-gray-200"
                          >
                            {header}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.details.sampleRow && result.details.sampleRow.length > 0 && (
                    <div>
                      <p className="text-green-700">
                        <strong>First data row sample:</strong>
                      </p>
                      <pre className="mt-1 p-2 bg-white rounded border border-gray-200 text-xs overflow-x-auto">
                        {result.details.sampleRow.slice(0, 5).join(' | ')}
                      </pre>
                    </div>
                  )}
                  {result.details.firstChars && !result.success && (
                    <div>
                      <p className="text-red-700">
                        <strong>Response preview:</strong>
                      </p>
                      <pre className="mt-1 p-2 bg-white rounded border border-gray-200 text-xs overflow-x-auto">
                        {result.details.firstChars}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {result.success && (
                <div className="mt-2 text-xs text-green-700 bg-green-100 rounded p-2 border border-green-200">
                  <strong>✓ What this means:</strong> Your sheet URL is correctly formatted and accessible. 
                  You can now use it in your CRM. If sync still fails, the issue is likely with project 
                  assignment or Supabase permissions.
                </div>
              )}

              {!result.success && result.message.includes('HTML') && (
                <div className="mt-2 text-xs text-red-700 bg-red-100 rounded p-2 border border-red-200">
                  <strong>How to fix:</strong><br />
                  1. Open your sheet → File → Share → Publish to web<br />
                  2. Change format to "Comma-separated values (.csv)"<br />
                  3. Click Publish → Copy the new URL<br />
                  4. It should contain "pub?output=csv" or "pub?gid=X&output=csv"
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: Parse a single CSV line (handles quoted values)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result.map(v => v.replace(/^"|"$/g, ''));
}
