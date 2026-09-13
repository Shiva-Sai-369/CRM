"use client";

import React, { useState, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import { X, Loader2, AlertCircle } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { supabase } from '@/lib/supabase';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProjectId: number | "all" | null;
}

export default function AddLeadModal({
  isOpen,
  onClose,
  selectedProjectId,
}: AddLeadModalProps) {
  const { projects, createLeadManually } = useProjectStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState("new");
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset form fields on open
  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setPhone("");
      setCompany("");
      setStatus("new");
      setNotes("");
      setErrorMsg(null);
      
      // Auto-select project if we're already viewing a specific project
      if (selectedProjectId && selectedProjectId !== "all") {
        setProjectId(String(selectedProjectId));
      } else if (projects.length === 1) {
        // Or auto-select if there's only one project
        setProjectId(String(projects[0].id));
      } else {
        setProjectId("");
      }
    }
  }, [isOpen, selectedProjectId, projects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      toast.error("Full Name is required");
      return;
    }

    if (!phone.trim()) {
      toast.error("Phone Number is required");
      return;
    }

    if (!projectId) {
      toast.error("Please select a Project");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get or create a default sheet for this project
      let sheetId: number;
      
      // Check if project has a "Manual Leads" sheet
      const { data: existingSheets, error: fetchError } = await supabase
        .from('google_sheets')
        .select('id')
        .eq('project_id', Number(projectId))
        .eq('name', 'Manual Leads')
        .limit(1);

      if (fetchError) {
        console.error('Error fetching sheets:', fetchError);
        throw new Error('Failed to check project sheets');
      }

      if (existingSheets && existingSheets.length > 0) {
        // Use existing "Manual Leads" sheet
        sheetId = existingSheets[0].id;
      } else {
        // Create a new "Manual Leads" sheet for this project
        const { data: newSheet, error: createError } = await supabase
          .from('google_sheets')
          .insert({
            project_id: Number(projectId),
            name: 'Manual Leads',
            sheet_name: 'Manual Leads',
            sheet_id: null,
            tab_gid: null,
            csv_url: null,
          })
          .select('id')
          .single();

        if (createError || !newSheet) {
          console.error('Error creating sheet:', createError);
          throw new Error('Failed to create Manual Leads sheet');
        }

        sheetId = newSheet.id;
      }

      // Now create the lead
      const result = await createLeadManually({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim(),
        status,
        sheet_id: sheetId,
        notes: notes.trim() || undefined,
      });

      if (result) {
        toast.success("Lead added successfully");
        onClose();
      } else {
        setErrorMsg("Failed to add lead. Please check the inputs and try again.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
            <h2 className="text-lg font-bold text-gray-900">Add Lead Manually</h2>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-red-800 text-sm">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 99999 99999"
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
                />
              </div>

              {/* Project Assignment */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Assign to Project <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
                >
                  <option value="">Select a Project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {projects.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    No projects found. Please create a project first.
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Lead will be added to a &quot;Manual Leads&quot; sheet within this project
                </p>
              </div>

              {/* Status */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
                >
                  <option value="new">New Lead</option>
                  <option value="contacted">Contacted</option>
                  <option value="interested">Interested</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal_sent">Proposal Sent</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>

              {/* Initial Note */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Initial Note
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add first note history item (optional)..."
                  disabled={isSubmitting}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 resize-none animate-none"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="border-t border-gray-200 pt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || projects.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Lead"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
