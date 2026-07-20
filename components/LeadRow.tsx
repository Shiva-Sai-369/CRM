"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { format, isToday } from "date-fns";
import type { Lead } from "@/lib/parseLeads";
import StatusDropdown from "./StatusDropdown";
import TagPill from "./TagPill";
import { useProjectStore } from "@/store/projectStore";
import { useTaskStore } from "@/store/taskStore";
import { 
  Pencil, 
  Check, 
  Loader2, 
  Save, 
  X, 
  Copy, 
  Phone, 
  Mail, 
  User, 
  FileText, 
  AlertCircle, 
  Leaf, 
  DollarSign 
} from "lucide-react";

interface LeadRowProps {
  lead: Lead;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onSelect: (checked: boolean) => void;
  availableStatuses: string[];
  onStatusChange: (leadId: string, newStatus: string) => void;
}

export default function LeadRow({
  lead,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect,
  availableStatuses,
  onStatusChange,
}: LeadRowProps) {
  // Details Edit States
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editedName, setEditedName] = useState(lead.name);
  const [editedEmail, setEditedEmail] = useState(lead.email);
  const [editedPhone, setEditedPhone] = useState(lead.phone);
  const [editedCompany, setEditedCompany] = useState(lead.company || "");
  const [editedPlatform, setEditedPlatform] = useState(lead.platform);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false);

  // Notes States
  const [newNoteText, setNewNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [addNoteError, setAddNoteError] = useState<string | null>(null);

  const [copyStatus, setCopyStatus] = useState("");

  const updateLeadDetails = useProjectStore((state) => state.updateLeadDetails);
  const fetchNotesForLead = useProjectStore((state) => state.fetchNotesForLead);
  const addNoteForLead = useProjectStore((state) => state.addNoteForLead);
  const leadNotes = useProjectStore((state) => state.leadNotes[Number(lead.uniqueKey)] || []);

  // Add Task States
  const createTask = useTaskStore((state) => state.createTask);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState<"call" | "meeting" | "follow-up" | "email" | "other">("follow-up");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDueTime, setTaskDueTime] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Sync edits if lead prop changes
  useEffect(() => {
    setEditedName(lead.name);
    setEditedEmail(lead.email);
    setEditedPhone(lead.phone);
    setEditedCompany(lead.company || "");
    setEditedPlatform(lead.platform);
  }, [lead]);

  // Fetch notes when row expands
  useEffect(() => {
    if (isExpanded) {
      setLoadingNotes(true);
      setNotesError(null);
      fetchNotesForLead(Number(lead.uniqueKey))
        .catch((err) => {
          console.error(err);
          setNotesError("Failed to load notes history.");
        })
        .finally(() => setLoadingNotes(false));

      // Set default due date/time to today + 1 hour when expanding
      const now = new Date();
      const future = new Date(now.getTime() + 60 * 60 * 1000);
      const yyyy = future.getFullYear();
      const mm = String(future.getMonth() + 1).padStart(2, "0");
      const dd = String(future.getDate()).padStart(2, "0");
      const hh = String(future.getHours()).padStart(2, "0");
      const min = String(future.getMinutes()).padStart(2, "0");
      
      setTaskDueDate(`${yyyy}-${mm}-${dd}`);
      setTaskDueTime(`${hh}:${min}`);
    }
  }, [isExpanded, lead.uniqueKey, fetchNotesForLead]);

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

  const handleStatusChange = (newStatus: string) => {
    onStatusChange(lead.uniqueKey, newStatus);
  };

  const handleSaveDetails = async () => {
    if (!editedName.trim()) {
      toast.error("Full Name is required");
      return;
    }
    if (!editedPhone.trim()) {
      toast.error("Phone Number is required");
      return;
    }

    setIsSavingDetails(true);
    try {
      await updateLeadDetails(Number(lead.uniqueKey), {
        name: editedName.trim(),
        email: editedEmail.trim(),
        phone: editedPhone.trim(),
        company: editedCompany.trim(),
        platform: editedPlatform.trim(),
      });
      setShowSavedConfirmation(true);
      setTimeout(() => setShowSavedConfirmation(false), 2000);
      setIsEditingDetails(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleAddNote = async (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!newNoteText.trim()) return;

    setIsAddingNote(true);
    setAddNoteError(null);
    try {
      await addNoteForLead(Number(lead.uniqueKey), newNoteText.trim());
      setNewNoteText("");
    } catch (err: any) {
      console.error("Error adding note details:", err);
      if (err && typeof err === "object") {
        console.error("Supabase Error Details:", {
          message: err.message,
          details: err.details,
          hint: err.hint,
        });
        setAddNoteError(err.message || "Failed to add note.");
      } else {
        setAddNoteError("An unknown error occurred.");
      }
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error("Task title is required");
      return;
    }
    if (!taskDueDate || !taskDueTime) {
      toast.error("Due date and time are required");
      return;
    }

    setIsCreatingTask(true);
    try {
      const combinedDateTime = new Date(`${taskDueDate}T${taskDueTime}:00`);
      await createTask({
        title: taskTitle.trim(),
        leadId: Number(lead.uniqueKey),
        type: taskType,
        priority: taskPriority,
        dueDate: combinedDateTime.toISOString(),
        notes: taskNotes.trim() ? taskNotes.trim() : null,
      });
      
      // Clear form
      setTaskTitle("");
      setTaskNotes("");
      
      // Reset date time
      const now = new Date();
      const future = new Date(now.getTime() + 60 * 60 * 1000);
      const yyyy = future.getFullYear();
      const mm = String(future.getMonth() + 1).padStart(2, "0");
      const dd = String(future.getDate()).padStart(2, "0");
      const hh = String(future.getHours()).padStart(2, "0");
      const min = String(future.getMinutes()).padStart(2, "0");
      setTaskDueDate(`${yyyy}-${mm}-${dd}`);
      setTaskDueTime(`${hh}:${min}`);
      
      toast.success("Task created successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create task");
    } finally {
      setIsCreatingTask(false);
    }
  };

  const formatNoteTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else {
      return format(date, "MMM d, h:mm a");
    }
  };

  const formattedDate = lead.lastMessageDate
    ? format(lead.lastMessageDate, "dd MMM yyyy")
    : "";
  const formattedTime = lead.lastMessageDate
    ? format(lead.lastMessageDate, "hh:mm a")
    : "";

  return (
    <>
      <tr
        id={`lead-row-${lead.uniqueKey}`}
        className={`border-b border-gray-200 hover:bg-blue-50 transition-colors group ${isSelected ? 'bg-blue-50' : ''}`}
      >
        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          />
        </td>
        <td className="px-3 py-3">
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
        <td 
          onClick={onToggleExpand}
          className="px-3 py-3 text-sm font-semibold text-gray-900 cursor-pointer"
        >
          {lead.name || "N/A"}
        </td>
        <td 
          onClick={onToggleExpand}
          className="px-3 py-3 text-sm text-gray-700 font-mono cursor-pointer whitespace-nowrap"
        >
          {lead.phone || "N/A"}
        </td>
        <td 
          onClick={onToggleExpand}
          className="px-3 py-3 text-sm text-gray-600 cursor-pointer whitespace-nowrap"
        >
          {lead.email || "N/A"}
        </td>
        <td className="px-3 py-3 bg-gray-50" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center">
            <StatusDropdown
              currentStatus={lead.leadStatus}
              availableStatuses={availableStatuses}
              onStatusChange={handleStatusChange}
            />
          </div>
        </td>
        <td 
          onClick={onToggleExpand}
          className="px-3 py-3 text-sm text-gray-600 cursor-pointer"
        >
          {lead.leadSource || "N/A"}
        </td>
        <td 
          onClick={onToggleExpand}
          className="px-3 py-3 text-sm text-gray-600 cursor-pointer max-w-xs"
        >
          {leadNotes.length > 0 ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-900 font-medium truncate max-w-[180px]" title={leadNotes[0].content}>
                {leadNotes[0].content}
              </span>
              <span className="text-xs text-gray-400 font-mono shrink-0">
                {formatNoteTimestamp(leadNotes[0].created_at)}
              </span>
            </div>
          ) : (
            <span className="text-gray-400 italic">No notes yet</span>
          )}
        </td>
        <td 
          onClick={onToggleExpand}
          className="px-3 py-3 cursor-pointer whitespace-nowrap"
        >
          <div>
            <p className="text-sm font-semibold text-gray-900">{formattedDate || "N/A"}</p>
            {formattedTime && (
              <p className="text-xs text-gray-500">{formattedTime}</p>
            )}
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={9} className="bg-gradient-to-r from-blue-50 to-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="space-y-4">
              
              {/* Lead Details Card (Editable) */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900 flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Lead Details
                  </h3>
                  <div className="flex items-center gap-2">
                    {showSavedConfirmation && (
                      <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Saved
                      </span>
                    )}
                    {isEditingDetails ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveDetails}
                          disabled={isSavingDetails}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-1 disabled:opacity-50"
                        >
                          {isSavingDetails ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditedName(lead.name);
                            setEditedEmail(lead.email);
                            setEditedPhone(lead.phone);
                            setEditedCompany(lead.company || "");
                            setEditedPlatform(lead.platform);
                            setIsEditingDetails(false);
                          }}
                          disabled={isSavingDetails}
                          className="px-3 py-1.5 bg-gray-200 text-gray-800 text-xs rounded-lg hover:bg-gray-300 font-semibold flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditingDetails(true)}
                        className="px-3 py-1.5 text-blue-600 hover:text-blue-800 text-xs rounded-lg border border-blue-200 hover:bg-blue-50 font-semibold flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    )}
                  </div>
                </div>

                {isEditingDetails ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        disabled={isSavingDetails}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={editedEmail}
                        onChange={(e) => setEditedEmail(e.target.value)}
                        disabled={isSavingDetails}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={editedPhone}
                        onChange={(e) => setEditedPhone(e.target.value)}
                        disabled={isSavingDetails}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                        Company
                      </label>
                      <input
                        type="text"
                        value={editedCompany}
                        onChange={(e) => setEditedCompany(e.target.value)}
                        disabled={isSavingDetails}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                        Platform / Source
                      </label>
                      <input
                        type="text"
                        value={editedPlatform}
                        onChange={(e) => setEditedPlatform(e.target.value)}
                        disabled={isSavingDetails}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Company</p>
                      <p className="text-base text-gray-900 font-semibold">{lead.company || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Platform / Source</p>
                      <p className="text-base text-gray-900 font-semibold">{lead.platform || "N/A"}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Campaign Info Section */}
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-600" />
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
                      <p className="text-sm text-gray-900 font-medium flex items-center gap-1">
                        {lead.isOrganic.toLowerCase() === 'true' ? (
                          <>
                            <Leaf className="w-4 h-4 text-green-600" /> Organic
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4 text-emerald-600" /> Paid
                          </>
                        )}
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

              {/* Created Date Information */}
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Notes History Section */}
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-amber-600" />
                    Notes History
                  </h3>
                  
                  {loadingNotes ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Loading notes...</span>
                    </div>
                  ) : notesError ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span>{notesError}</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto mb-4 pr-1">
                      {leadNotes.length === 0 ? (
                        <p className="text-sm text-gray-500 italic py-2">No notes added yet.</p>
                      ) : (
                        leadNotes.map((note) => (
                          <div 
                            key={note.id} 
                            className="flex justify-between items-start gap-4 text-sm bg-gray-50 p-2.5 rounded border border-gray-100"
                          >
                            <p className="text-gray-800 whitespace-pre-wrap flex-1">{note.content}</p>
                            <span className="text-xs text-gray-400 font-medium shrink-0 mt-0.5 font-mono">
                              {formatNoteTimestamp(note.created_at)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <textarea
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        disabled={isAddingNote}
                        placeholder="Add a note to history..."
                        rows={1}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-10 disabled:opacity-50 text-gray-900 bg-white"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void handleAddNote(e);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => void handleAddNote(e)}
                        disabled={isAddingNote || !newNoteText.trim()}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-10 flex items-center justify-center"
                      >
                        {isAddingNote ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Add Note"
                        )}
                      </button>
                    </div>
                    {addNoteError && (
                      <p className="text-xs text-red-605 font-semibold mt-1">
                        {addNoteError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Add Task Section */}
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Add Task
                  </h3>
                  
                  <form onSubmit={handleAddTask} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          Task Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Call client for feedback"
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          Task Type
                        </label>
                        <select
                          value={taskType}
                          onChange={(e) => setTaskType(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950"
                        >
                          <option value="call">Call</option>
                          <option value="meeting">Meeting</option>
                          <option value="follow-up">Follow-up</option>
                          <option value="email">Email</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          Priority
                        </label>
                        <select
                          value={taskPriority}
                          onChange={(e) => setTaskPriority(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          Due Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={taskDueDate}
                          onChange={(e) => setTaskDueDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          Due Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          required
                          value={taskDueTime}
                          onChange={(e) => setTaskDueTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-950"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          Notes / Description
                        </label>
                        <textarea
                          placeholder="Add details, links, or contact info..."
                          value={taskNotes}
                          onChange={(e) => setTaskNotes(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y bg-white text-gray-950"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isCreatingTask || !taskTitle.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        {isCreatingTask ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Creating...</span>
                          </>
                        ) : (
                          <span>Create Task</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCopyEmail}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  {copyStatus ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copyStatus || "Copy Email"}</span>
                </button>
                <button
                  onClick={() => window.open(`tel:${lead.phone}`)}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call</span>
                </button>
                <button
                  onClick={() => window.open(`mailto:${lead.email}`)}
                  className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
