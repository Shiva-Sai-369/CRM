"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: {
    spreadsheetId: string;
    displayName: string;
    range: string;
    apiKey?: string;
  }) => Promise<void>;
  onSuccess?: () => void;
  isLoading?: boolean;
}

export default function GoogleSheetsModal({
  isOpen,
  onClose,
  onConnect,
  onSuccess,
  isLoading = false,
}: GoogleSheetsModalProps) {
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [range, setRange] = useState("Sheet1!A1:Z1000");
  const [apiKey, setApiKey] = useState("");
  const [useApiKey, setUseApiKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleClose = () => {
    setSpreadsheetId("");
    setDisplayName("");
    setRange("Sheet1!A1:Z1000");
    setApiKey("");
    setUseApiKey(false);
    setConnectionStatus(null);
    onClose();
  };

  const handleConnect = async () => {
    if (!spreadsheetId.trim()) {
      toast.error("Please enter a spreadsheet ID");
      return;
    }

    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }

    if (useApiKey && !apiKey.trim()) {
      toast.error("Please enter an API key for private sheets");
      return;
    }

    setIsConnecting(true);
    setConnectionStatus(null);

    try {
      await onConnect({
        spreadsheetId: spreadsheetId.trim(),
        displayName: displayName.trim(),
        range: range.trim(),
        apiKey: useApiKey ? apiKey.trim() : undefined,
      });

      setConnectionStatus({
        type: "success",
        message: `✓ Successfully connected "${displayName}"!`,
      });

      // Close modal and call success callback after 2 seconds
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to connect sheet";

      setConnectionStatus({
        type: "error",
        message: `✗ ${errorMessage}`,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
            <h2 className="text-lg font-semibold text-gray-900">
              Connect Google Sheets
            </h2>
            <button
              onClick={handleClose}
              disabled={isConnecting}
              className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Status Messages */}
            {connectionStatus && (
              <div
                className={`p-4 rounded-lg border ${
                  connectionStatus.type === "success"
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    connectionStatus.type === "success"
                      ? "text-green-800"
                      : "text-red-800"
                  }`}
                >
                  {connectionStatus.message}
                </p>
              </div>
            )}

            {/* Spreadsheet ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Spreadsheet ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                placeholder="1BxiMVs0XRA5nFMoon9PZeUxU-6s1FpyGw..."
                disabled={isConnecting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono disabled:opacity-50 disabled:bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Find the ID in your sheet URL: /spreadsheets/d/<strong>THIS_ID</strong>/edit
              </p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="My Lead Form"
                disabled={isConnecting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 disabled:bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                A friendly name for this spreadsheet
              </p>
            </div>

            {/* Sheet Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sheet Range (Optional)
              </label>
              <input
                type="text"
                value={range}
                onChange={(e) => setRange(e.target.value)}
                placeholder="Sheet1!A1:Z1000"
                disabled={isConnecting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono disabled:opacity-50 disabled:bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                e.g., Sheet1!A1:Z1000 or "Form Responses 1"!A:Z
              </p>
            </div>

            {/* Private Sheet Toggle */}
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={useApiKey}
                  onChange={(e) => setUseApiKey(e.target.checked)}
                  disabled={isConnecting}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900">
                    Private Sheet (Requires API Key)
                  </span>
                  <p className="text-xs text-gray-600 mt-1">
                    Enable this if your sheet is not publicly shared
                  </p>
                </div>
              </label>
            </div>

            {/* API Key (shown only when useApiKey is true) */}
            {useApiKey && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google API Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  disabled={isConnecting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono disabled:opacity-50 disabled:bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get an API key from{" "}
                  <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Google Cloud Console
                  </a>
                </p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Public Sheets:</strong> Share the sheet with "Anyone can view"
              </p>
              <p className="text-xs text-blue-800 mt-2">
                <strong>Private Sheets:</strong> Provide a Google API Key
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex gap-2 justify-end sticky bottom-0 bg-white">
            <button
              onClick={handleClose}
              disabled={isConnecting || isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={isConnecting || isLoading || !spreadsheetId.trim() || !displayName.trim() || (useApiKey && !apiKey.trim())}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isConnecting ? (
                <>
                  <span className="inline-block animate-spin">⟳</span>
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
