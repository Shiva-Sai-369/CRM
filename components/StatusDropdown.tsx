"use client";

import { useState, useRef, useEffect } from "react";
import { STATUS_COLORS } from "@/lib/constants";
import type { CustomStatus } from "@/types/supabase";

interface StatusDropdownProps {
  currentStatus: string;
  availableStatuses: string[];
  customStatuses?: CustomStatus[];
  onStatusChange: (newStatus: string) => void;
  onManageCustomStatuses?: () => void;
}

export default function StatusDropdown({
  currentStatus,
  availableStatuses,
  customStatuses = [],
  onStatusChange,
  onManageCustomStatuses,
}: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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

  const getStatusStyle = (status: string, customStatus?: CustomStatus) => {
    // If it's a custom status, use its colors
    if (customStatus) {
      return { 
        backgroundColor: customStatus.background_color, 
        color: customStatus.color, 
        fontWeight: 'bold' 
      };
    }

    const normalizedStatus = status.toLowerCase();
    
    // Blue
    if (normalizedStatus.includes('new lead') || normalizedStatus.includes('new') || normalizedStatus.includes('qualification')) {
      return { backgroundColor: '#DBEAFE', color: '#1E40AF', fontWeight: 'bold' };
    }
    // Purple
    if (normalizedStatus.includes('contacted')) {
      return { backgroundColor: '#E9D5FF', color: '#7E22CE', fontWeight: 'bold' };
    }
    // Yellow
    if (normalizedStatus.includes('interested') || normalizedStatus.includes('qualified') || normalizedStatus.includes('identify')) {
      return { backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 'bold' };
    }
    // Green
    if (normalizedStatus.includes('converted') || normalizedStatus.includes('needs analysis')) {
      return { backgroundColor: '#D1FAE5', color: '#065F46', fontWeight: 'bold' };
    }
    // Red
    if (normalizedStatus.includes('lost') || normalizedStatus.includes('invalid') || normalizedStatus.includes('proposal') || normalizedStatus.includes('value prop')) {
      return { backgroundColor: '#FEE2E2', color: '#991B1B', fontWeight: 'bold' };
    }
    // Orange
    if (normalizedStatus.includes('follow') || normalizedStatus.includes('vacancy') || normalizedStatus.includes('negotiation')) {
      return { backgroundColor: '#FFEDD5', color: '#C2410C', fontWeight: 'bold' };
    }
    // Gray
    if (normalizedStatus.includes('hold') || normalizedStatus.includes('waiting') || normalizedStatus.includes('no response') || normalizedStatus.includes('not interested')) {
      return { backgroundColor: '#F3F4F6', color: '#374151', fontWeight: 'bold' };
    }
    
    // Default gray for anything else
    return { backgroundColor: '#F3F4F6', color: '#374151', fontWeight: 'bold' };
  };

  // Check if current status is a custom status
  const currentCustomStatus = customStatuses.find(cs => cs.name === currentStatus);
  const currentStyle = getStatusStyle(currentStatus, currentCustomStatus);

  // Combine available statuses with custom statuses
  const allStatuses = [...availableStatuses];
  const customStatusNames = customStatuses.map(cs => cs.name);
  
  // Add custom statuses that aren't already in availableStatuses
  customStatusNames.forEach(name => {
    if (!allStatuses.includes(name)) {
      allStatuses.push(name);
    }
  });

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        style={currentStyle}
        className="inline-flex items-center gap-1 px-4 py-2 rounded text-sm font-bold hover:opacity-80 transition-opacity cursor-pointer"
      >
        {currentStatus}
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
        <div className="absolute z-50 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 right-0">
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
            <p className="text-xs font-bold text-gray-700 uppercase">Change Status</p>
          </div>
          
          {/* Standard Statuses */}
          {availableStatuses.map((status) => {
            const statusStyle = getStatusStyle(status);
            const isSelected = status === currentStatus;

            return (
              <button
                key={status}
                onClick={(e) => handleStatusClick(e, status)}
                className={`w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors flex items-center justify-between ${
                  isSelected ? "bg-blue-50" : ""
                }`}
              >
                <span 
                  style={statusStyle}
                  className="inline-block px-4 py-2 rounded text-sm font-bold"
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

          {/* Custom Statuses */}
          {customStatuses.length > 0 && (
            <>
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 border-t">
                <p className="text-xs font-bold text-gray-700 uppercase">Custom Statuses</p>
              </div>
              {customStatuses.map((customStatus) => {
                const statusStyle = getStatusStyle(customStatus.name, customStatus);
                const isSelected = customStatus.name === currentStatus;

                return (
                  <button
                    key={customStatus.id}
                    onClick={(e) => handleStatusClick(e, customStatus.name)}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors flex items-center justify-between ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
                    <span 
                      style={statusStyle}
                      className="inline-block px-4 py-2 rounded text-sm font-bold"
                    >
                      {customStatus.name}
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
            </>
          )}

          {/* Add Custom Status Button */}
          {onManageCustomStatuses && (
            <>
              <div className="border-t border-gray-200 my-2"></div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onManageCustomStatuses();
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors text-sm text-blue-600 font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Custom Status
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
