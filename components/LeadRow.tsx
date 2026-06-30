"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { Lead } from "@/lib/parseLeads";
import StatusDropdown from "./StatusDropdown";
import TagPill from "./TagPill";
import { PLATFORM_LABELS } from "@/lib/constants";

interface LeadRowProps {
  lead: Lead;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onSelect: (checked: boolean) => void;
  availableStatuses: string[];
  onStatusChange: (leadId: string, newStatus: string) => void;
}

export default function LeadRow({ lead, isExpanded, isSelected, onToggleExpand, onSelect, availableStatuses, onStatusChange }: LeadRowProps) {
  const [editedNotes, setEditedNotes] = useState(lead.notes);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(lead.email);
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus(""), 1500);
    } catch (err) {
      setCopyStatus("Failed");
      setTimeout(() => setCopyStatus(""), 1500);
    }
  };

  const handleSaveNotes = () => {
    lead.notes = editedNotes;
    setIsEditingNotes(false);
  };

  const handleStatusChange = (newStatus: string) => {
    onStatusChange(lead.uniqueKey, newStatus);
  };

  const handleAddStatus = (newStatus: string) => {
    // Add new status to the lead
    onStatusChange(lead.uniqueKey, newStatus);
  };

  const platformLabel = PLATFORM_LABELS[lead.platform] || "[FB]";
  const formattedDate = lead.lastMessageDate
    ? format(lead.lastMessageDate, "dd MMM yyyy")
    : "";
  const formattedTime = lead.lastMessageDate
    ? format(lead.lastMessageDate, "hh:mm a")
    : "";

  return (
    <>
      <tr
        className={`border-b border-gray-200 hover:bg-blue-50 transition-colors group ${isSelected ? 'bg-blue-50' : ''}`}
      >
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          />
        </td>
        <td 
          onClick={onToggleExpand}
          className="px-4 py-3 text-base font-semibold text-gray-900 cursor-pointer"
        >
          {lead.name || "N/A"}
        </td>
        <td 
          onClick={onToggleExpand}
          className="px-4 py-3 text-base text-gray-700 font-mono cursor-pointer"
        >
          {lead.phone || "N/A"}
        </td>
        <td 
          onClick={onToggleExpand}
          className="px-4 py-3 text-base text-gray-600 cursor-pointer"
        >
          {lead.email || "N/A"}
        </td>
        <td className="px-4 py-3 bg-gray-50" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center">
            <StatusDropdown
              currentStatus={lead.leadStatus}
              availableStatuses={availableStatuses}
              onStatusChange={handleStatusChange}
              onAddStatus={handleAddStatus}
            />
          </div>
        </td>
        <td 
          onClick={onToggleExpand}
          className="px-4 py-3 text-sm text-gray-600 cursor-pointer"
        >
          {lead.leadSource || "N/A"}
        </td>
        <td 
          onClick={onToggleExpand}
          className="px-4 py-3 cursor-pointer"
        >
          <div>
            <p className="text-base font-semibold text-gray-900">{formattedDate || "N/A"}</p>
            {formattedTime && (
              <p className="text-sm text-gray-500">{formattedTime}</p>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              isExpanded
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
            }`}
          >
            {isExpanded ? (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Close
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Details
              </span>
            )}
          </button>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={7} className="bg-gradient-to-r from-blue-50 to-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="space-y-4">
              {/* Contact Info Section */}
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Full Name</p>
                    <p className="text-base text-gray-900 font-semibold">{lead.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Email</p>
                    <p className="text-base text-gray-900 font-mono">{lead.email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Phone</p>
                    <p className="text-base text-gray-900 font-mono font-semibold">{lead.phone || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Campaign Info Section */}
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                  </svg>
                  Campaign Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lead.campaignName && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Campaign</p>
                      <p className="text-sm text-gray-900 font-medium">{lead.campaignName}</p>
                      {lead.campaignId && (
                        <p className="text-xs text-gray-500 font-mono">ID: {lead.campaignId}</p>
                      )}
                    </div>
                  )}
                  {lead.adsetName && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Ad Set</p>
                      <p className="text-sm text-gray-900 font-medium">{lead.adsetName}</p>
                      {lead.adsetId && (
                        <p className="text-xs text-gray-500 font-mono">ID: {lead.adsetId}</p>
                      )}
                    </div>
                  )}
                  {lead.adName && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Ad Name</p>
                      <p className="text-sm text-gray-900 font-medium">{lead.adName}</p>
                      {lead.adId && (
                        <p className="text-xs text-gray-500 font-mono">ID: {lead.adId}</p>
                      )}
                    </div>
                  )}
                  {lead.formName && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Form Name</p>
                      <p className="text-sm text-gray-900 font-medium">{lead.formName}</p>
                      {lead.formId && (
                        <p className="text-xs text-gray-500 font-mono">ID: {lead.formId}</p>
                      )}
                    </div>
                  )}
                  {lead.isOrganic && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Lead Type</p>
                      <p className="text-sm text-gray-900 font-medium">
                        {lead.isOrganic.toLowerCase() === 'true' ? '🌱 Organic' : '💰 Paid'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              {lead.educationLevel && (
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                  <h3 className="text-base font-bold text-gray-900 mb-2">Additional Information</h3>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Education Level</p>
                    <p className="text-sm text-gray-900 font-medium">{lead.educationLevel}</p>
                  </div>
                </div>
              )}

              {/* Platform & Date */}
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Platform</p>
                    <p className="text-base text-gray-900 flex items-center font-semibold">
                      {platformLabel} 
                      <span className="ml-2">{lead.platform}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Created Date & Time</p>
                    <p className="text-base text-gray-900 font-semibold">
                      {lead.lastMessageDate ? (
                        <>
                          {format(lead.lastMessageDate, "dd MMM yyyy")}
                          <span className="text-gray-600 ml-2 font-normal">
                            {format(lead.lastMessageDate, "hh:mm a")}
                          </span>
                        </>
                      ) : (
                        "N/A"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    Notes
                  </h3>
                  {!isEditingNotes && (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>
                
                {isEditingNotes ? (
                  <div>
                    <textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                      rows={3}
                      placeholder="Add notes about this lead..."
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleSaveNotes}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-semibold"
                      >
                        💾 Save
                      </button>
                      <button
                        onClick={() => {
                          setEditedNotes(lead.notes);
                          setIsEditingNotes(false);
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-800 text-sm rounded-lg hover:bg-gray-300 font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 rounded">
                    {lead.notes || "No notes added yet"}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleCopyEmail}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-semibold shadow-sm"
                >
                  {copyStatus || "📋 Copy Email"}
                </button>
                <button
                  onClick={() => window.open(`tel:${lead.phone}`)}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-semibold shadow-sm"
                >
                  📞 Call
                </button>
                <button
                  onClick={() => window.open(`mailto:${lead.email}`)}
                  className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 font-semibold shadow-sm"
                >
                  ✉️ Email
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
