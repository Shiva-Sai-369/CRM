'use client';

import { useState, useRef, useEffect } from 'react';
import type { SheetTab } from '@/lib/config';

interface TabSelectorProps {
  availableTabs: SheetTab[];
  selectedTabIds: string[];
  onChange: (tabIds: string[]) => void;
}

export default function TabSelector({
  availableTabs,
  selectedTabIds,
  onChange,
}: TabSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleTab = (tabId: string) => {
    if (selectedTabIds.includes(tabId)) {
      onChange(selectedTabIds.filter(id => id !== tabId));
    } else {
      onChange([...selectedTabIds, tabId]);
    }
  };

  const selectAll = () => onChange(availableTabs.map(t => t.id));
  const clearAll = () => onChange([]);

  const label =
    selectedTabIds.length === 0
      ? 'All Tabs'
      : selectedTabIds.length === availableTabs.length
      ? 'All Tabs'
      : `${selectedTabIds.length} tab${selectedTabIds.length > 1 ? 's' : ''} selected`;

  return (
    <div ref={ref} className="relative min-w-[160px]">
      <button
        onClick={() => setOpen(!open)}
        disabled={availableTabs.length === 0}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-1.5">
          {/* Sheet icon */}
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
          </svg>
          <span
            className={
              selectedTabIds.length > 0 && selectedTabIds.length < availableTabs.length
                ? 'font-semibold text-blue-600'
                : ''
            }
          >
            {label}
          </span>
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && availableTabs.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          {/* Select all / Clear all */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <button
              onClick={selectAll}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Select all
            </button>
            <button
              onClick={clearAll}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              Clear
            </button>
          </div>

          {/* Tab list */}
          <div className="max-h-64 overflow-y-auto">
            {availableTabs.map(tab => (
              <label
                key={tab.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selectedTabIds.length === 0 || selectedTabIds.includes(tab.id)}
                  onChange={() => toggleTab(tab.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <span className="truncate block font-medium" title={tab.name}>
                    {tab.name}
                  </span>
                  <span className="truncate block text-xs text-gray-400" title={tab.url}>
                    {new URL(tab.url).pathname.split('/').pop() || 'Sheet'}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}