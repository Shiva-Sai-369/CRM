"use client";

import { useState, useRef, useEffect } from "react";

interface StatusDropdownProps {
  currentStatus: string;
  availableStatuses: string[];
  onStatusChange: (newStatus: string) => void;
  onAddStatus?: (newStatus: string) => void;
}

/**
 * Generate a consistent color based on status name hash
 */
function hashStringToColor(str: string): { backgroundColor: string; color: string } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    { backgroundColor: '#DBEAFE', color: '#1E40AF' }, // Blue
    { backgroundColor: '#E9D5FF', color: '#7E22CE' }, // Purple
    { backgroundColor: '#FEF3C7', color: '#92400E' }, // Yellow
    { backgroundColor: '#D1FAE5', color: '#065F46' }, // Green
    { backgroundColor: '#FEE2E2', color: '#991B1B' }, // Red
    { backgroundColor: '#FFEDD5', color: '#C2410C' }, // Orange
    { backgroundColor: '#F3F4F6', color: '#374151' }, // Gray
    { backgroundColor: '#DCE7F1', color: '#0C4A6E' }, // Sky Blue
    { backgroundColor: '#FCD34D', color: '#78350F' }, // Amber
    { backgroundColor: '#FBCFE8', color: '#831843' }, // Rose
  ];

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function StatusDropdown({
  currentStatus,
  availableStatuses,
  onStatusChange,
  onAddStatus,
}: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleStatusClick = (e: React.MouseEvent, status: string) => {
    e.stopPropagation();
    onStatusChange(status);
    setIsOpen(false);
  };

  const handleCreateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatusName.trim() && onAddStatus) {
      onAddStatus(newStatusName.trim());
      setNewStatusName("");
      setIsCreating(false);
    }
  };

  const currentStyle = hashStringToColor(currentStatus);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        style={currentStyle}
        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity cursor-pointer"
      >
        {currentStatus}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 right-0">
          <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
            <p className="text-xs font-bold text-gray-700 uppercase">Change Status</p>
          </div>

          {/* Status List */}
          <div className="max-h-64 overflow-y-auto">
            {availableStatuses.map((status) => {
              const statusStyle = hashStringToColor(status);
              const isSelected = status === currentStatus;

              return (
                <button
                  key={status}
                  onClick={(e) => handleStatusClick(e, status)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between border-b border-gray-100 ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                >
                  <span 
                    style={statusStyle}
                    className="inline-block px-4 py-2 rounded-lg text-sm font-bold"
                  >
                    {status}
                  </span>
                  {isSelected && (
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-2"></div>

          {/* Create New Status Section */}
          {isCreating ? (
            <form onSubmit={handleCreateStatus} className="px-4 py-3">
              <div className="space-y-2">
                <input
                  type="text"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  placeholder="Enter new status name..."
                  autoFocus
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setNewStatusName("");
                    }}
                    className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 text-sm font-bold rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 text-blue-600 font-bold"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add New Status
            </button>
          )}
        </div>
      )}
    </div>
  );
}
