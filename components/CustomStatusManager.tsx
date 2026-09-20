"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import type { CustomStatus } from "@/types/supabase";

interface CustomStatusManagerProps {
  selectedProjectId: number | "all" | null;
  onStatusCreated?: (status: CustomStatus) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  { name: "Blue", color: "#1E40AF", background: "#DBEAFE" },
  { name: "Green", color: "#065F46", background: "#D1FAE5" },
  { name: "Yellow", color: "#92400E", background: "#FEF3C7" },
  { name: "Red", color: "#991B1B", background: "#FEE2E2" },
  { name: "Purple", color: "#7E22CE", background: "#E9D5FF" },
  { name: "Orange", color: "#C2410C", background: "#FFEDD5" },
  { name: "Gray", color: "#374151", background: "#F3F4F6" },
  { name: "Pink", color: "#BE185D", background: "#FCE7F3" },
];

export default function CustomStatusManager({ 
  selectedProjectId, 
  onStatusCreated, 
  onClose 
}: CustomStatusManagerProps) {
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [newStatusName, setNewStatusName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [customTextColor, setCustomTextColor] = useState("");
  const [customBgColor, setCustomBgColor] = useState("");

  // Fetch custom statuses
  const fetchCustomStatuses = async () => {
    if (!selectedProjectId || selectedProjectId === "all") return;

    setLoading(true);
    try {
      const response = await fetch(`/api/custom-statuses?project_id=${selectedProjectId}`);
      const result = await response.json();

      if (response.ok) {
        setCustomStatuses(result.statuses || []);
      } else {
        toast.error(result.error || 'Failed to fetch custom statuses');
      }
    } catch (error) {
      console.error('Error fetching custom statuses:', error);
      toast.error('Failed to fetch custom statuses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomStatuses();
  }, [selectedProjectId]);

  const handleCreateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newStatusName.trim()) {
      toast.error('Status name is required');
      return;
    }

    if (!selectedProjectId || selectedProjectId === "all") {
      toast.error('Please select a specific project first');
      return;
    }

    setLoading(true);
    try {
      const textColor = customTextColor || selectedColor.color;
      const backgroundColor = customBgColor || selectedColor.background;

      const response = await fetch('/api/custom-statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStatusName.trim(),
          color: textColor,
          background_color: backgroundColor,
          project_id: selectedProjectId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Custom status created successfully');
        setNewStatusName("");
        setCustomTextColor("");
        setCustomBgColor("");
        setShowCreateForm(false);
        await fetchCustomStatuses();
        
        if (onStatusCreated) {
          onStatusCreated(result.status);
        }
      } else {
        toast.error(result.error || 'Failed to create custom status');
      }
    } catch (error) {
      console.error('Error creating custom status:', error);
      toast.error('Failed to create custom status');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStatus = async (statusId: number) => {
    if (!confirm('Are you sure you want to delete this custom status?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/custom-statuses/${statusId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Custom status deleted successfully');
        await fetchCustomStatuses();
      } else {
        toast.error(result.error || 'Failed to delete custom status');
      }
    } catch (error) {
      console.error('Error deleting custom status:', error);
      toast.error('Failed to delete custom status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Custom Statuses
            {selectedProjectId && selectedProjectId !== "all" && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (Project ID: {selectedProjectId})
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {selectedProjectId === "all" || selectedProjectId === null ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Specific Project</h3>
              <p className="text-gray-600">
                Custom statuses are project-specific. Please select a specific project to manage its custom statuses.
              </p>
            </div>
          ) : (
            <>
              {/* Create New Status Button */}
              <div className="mb-6">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Custom Status
                </button>
              </div>

              {/* Create Form */}
              {showCreateForm && (
                <form onSubmit={handleCreateStatus} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Create New Status</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status Name
                      </label>
                      <input
                        type="text"
                        value={newStatusName}
                        onChange={(e) => setNewStatusName(e.target.value)}
                        placeholder="e.g., Under Review, Pending Approval, etc."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color Scheme
                      </label>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color.name}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            className={`p-2 rounded-lg border-2 transition-colors ${
                              selectedColor.name === color.name 
                                ? 'border-blue-500 ring-2 ring-blue-200' 
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            <div 
                              className="w-full h-8 rounded text-xs font-bold flex items-center justify-center"
                              style={{ 
                                backgroundColor: color.background, 
                                color: color.color 
                              }}
                            >
                              {color.name}
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Custom Text Color (optional)
                          </label>
                          <input
                            type="color"
                            value={customTextColor || selectedColor.color}
                            onChange={(e) => setCustomTextColor(e.target.value)}
                            className="w-full h-10 rounded border border-gray-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Custom Background Color (optional)
                          </label>
                          <input
                            type="color"
                            value={customBgColor || selectedColor.background}
                            onChange={(e) => setCustomBgColor(e.target.value)}
                            className="w-full h-10 rounded border border-gray-300"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preview
                      </label>
                      <div 
                        className="inline-flex items-center px-4 py-2 rounded text-sm font-bold"
                        style={{ 
                          backgroundColor: customBgColor || selectedColor.background, 
                          color: customTextColor || selectedColor.color 
                        }}
                      >
                        {newStatusName || 'Status Preview'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      type="submit"
                      disabled={loading || !newStatusName.trim()}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create Status'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2 bg-gray-500 text-white text-sm font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Existing Custom Statuses */}
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-4">Existing Custom Statuses</h3>
                
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : customStatuses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>No custom statuses created yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customStatuses.map((status) => (
                      <div key={status.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="inline-flex items-center px-4 py-2 rounded text-sm font-bold"
                            style={{ 
                              backgroundColor: status.background_color, 
                              color: status.color 
                            }}
                          >
                            {status.name}
                          </div>
                          <span className="text-xs text-gray-500">
                            Created {new Date(status.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteStatus(status.id)}
                          className="text-red-600 hover:text-red-800 transition-colors p-2"
                          title="Delete status"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}