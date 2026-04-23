"use client";
import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";

interface FormField {
  id: string;
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "email" | "textarea" | "checkbox" | "file";
  required: boolean;
  options?: string[];
}

const DEFAULT_SCHEMAS: Record<string, FormField[]> = {
  NOC: [
    { id: "s1",  name: "enrollmentNo",         label: "Enrollment Number",     type: "text",     required: true  },
    { id: "s2",  name: "studentName",           label: "Student Name",          type: "text",     required: true  },
    { id: "s3",  name: "currentYear",           label: "Current Year",          type: "select",   required: true,  options: ["1st Year","2nd Year","3rd Year","4th Year"] },
    { id: "s4",  name: "companyName",           label: "Company Name",          type: "text",     required: true  },
    { id: "s5",  name: "companyLocation",       label: "Company Location",      type: "text",     required: true  },
    { id: "s6",  name: "durationInDays",        label: "Duration (Days)",       type: "number",   required: true  },
    { id: "s7",  name: "startDate",             label: "Start Date",            type: "date",     required: true  },
    { id: "s8",  name: "endDate",               label: "End Date",              type: "date",     required: true  },
    { id: "s9",  name: "companyAddress",        label: "Company Address",       type: "textarea", required: true  },
    { id: "s10", name: "companyWebsite",        label: "Company Website",       type: "text",     required: false },
    { id: "s11", name: "applyingThrough",       label: "Applying Through",      type: "select",   required: true,  options: ["Campus Placement","Off-Campus","Internship Portal","Direct Application"] },
    { id: "s12", name: "recipientName",         label: "Recipient Name",        type: "text",     required: false },
    { id: "s13", name: "recipientDesignation",  label: "Recipient Designation", type: "text",     required: false },
    { id: "s14", name: "stipend",               label: "Stipend (if any)",      type: "text",     required: false },
    { id: "s15", name: "offerLetterUrl",        label: "Offer Letter / Proof",  type: "file",     required: false },
    { id: "s16", name: "declaration",           label: "I declare all the information is true and correct", type: "checkbox", required: true },
  ],
  BONAFIDE: [
    { id: "s1", name: "studentName",  label: "Student Name",   type: "text",   required: true  },
    { id: "s2", name: "enrollmentNo", label: "Enrollment Id",  type: "text",   required: true  },
    { id: "s3", name: "fatherName",   label: "Father's Name",  type: "text",   required: true  },
    { id: "s4", name: "semester",     label: "Semester",       type: "select", required: true,  options: ["1","2","3","4","5","6","7","8"] },
    { id: "s5", name: "emailAddress", label: "Email Address",  type: "email",  required: true  },
    { id: "s6", name: "session",      label: "Session",        type: "text",   required: true  },
  ],
  NODUES: [
    // Step 1 — Personal Details
    { id: "s1",  name: "fullName",              label: "Full Name",                                     type: "text",     required: true  },
    { id: "s2",  name: "email",                 label: "Email Address",                                 type: "email",    required: true  },
    { id: "s3",  name: "fatherName",            label: "Father's Name",                                 type: "text",     required: true  },
    { id: "s4",  name: "phoneNumber",           label: "Phone Number",                                  type: "text",     required: true  },
    { id: "s5",  name: "address",               label: "Permanent Address",                             type: "textarea", required: true  },
    // Step 2 — Academic Details
    { id: "s6",  name: "enrollmentNo",          label: "Enrollment Number",                             type: "text",     required: true  },
    { id: "s7",  name: "department",            label: "Department",                                    type: "select",   required: true,  options: ["CSE","IT","ECE","EE","ME","CE"] },
    { id: "s8",  name: "passOutYear",           label: "Pass Out Year",                                 type: "number",   required: true  },
    { id: "s9",  name: "course",                label: "Course",                                        type: "select",   required: true,  options: ["B.Tech","M.Tech","MBA","MCA","PhD"] },
    { id: "s10", name: "cgpa",                  label: "CGPA",                                          type: "number",   required: true  },
    // Step 3 — Hostel & Prerequisites
    { id: "s11", name: "isHostelResident",      label: "Are you a Hostel Resident?",                    type: "checkbox", required: false },
    { id: "s12", name: "hostelName",            label: "Hostel Name",                                   type: "text",     required: false },
    { id: "s13", name: "roomNumber",            label: "Room Number",                                   type: "text",     required: false },
    { id: "s14", name: "cautionMoneyRefund",    label: "Caution Money Refund?",                         type: "checkbox", required: false },
    { id: "s15", name: "receiptNumber",         label: "Caution Money Receipt Number",                  type: "text",     required: false },
    { id: "s16", name: "exitSurvey",            label: "Exit Survey Completed ✔",                       type: "checkbox", required: true  },
    { id: "s17", name: "feesCleared",           label: "All Fees Cleared ✔",                            type: "checkbox", required: true  },
    { id: "s18", name: "projectCertSubmitted",  label: "Project / Internship Certificate Submitted ✔",  type: "checkbox", required: true  },
    // Step 4 — Upload Documents
    { id: "s19", name: "feeReceipts",           label: "Fee Receipts",                                  type: "file",     required: false },
    { id: "s20", name: "marksheet",             label: "Previous Marksheet",                            type: "file",     required: false },
    { id: "s21", name: "bankDetails",           label: "Bank Passbook / Cancelled Cheque",              type: "file",     required: false },
    { id: "s22", name: "collegeId",             label: "College ID Card",                               type: "file",     required: false },
    // Step 5 — Declaration
    { id: "s23", name: "declaration",           label: "I declare that all information provided is true and correct", type: "checkbox", required: true },
  ],
};

export default function FormBuilder({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [fields, setFields] = useState<FormField[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const formType = type.toUpperCase();
  const formTitle = formType === "NOC" ? "NOC Application" : formType === "BONAFIDE" ? "Bonafide Certificate Form" : "No Dues Application";

  useEffect(() => {
    if (!loading && (!user || user.role !== "SUPER_ADMIN")) {
      router.push("/dashboard");
    } else if (user) {
      fetch(`/api/forms/${type}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data?.schema) && data.data.schema.length > 0) {
            setFields(data.data.schema);
          } else {
            setFields(DEFAULT_SCHEMAS[formType] ?? []);
          }
        })
        .catch(() => setFields(DEFAULT_SCHEMAS[formType] ?? []))
        .finally(() => setFetching(false));
    }
  }, [user, loading]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/forms/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema: fields }),
      });
      const data = await res.json();
      if (data.success) {
        setHasChanges(false);
        setEditingId(null);
        setMessage({ type: "success", text: "✓ Form saved!" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: data.error || "Save failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  const addField = () => {
    const f: FormField = {
      id: crypto.randomUUID(),
      name: `field_${Date.now()}`,
      label: "New Field",
      type: "text",
      required: false,
    };
    setFields((prev) => [...prev, f]);
    setHasChanges(true);
    setEditingId(f.id);
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (editingId === id) setEditingId(null);
    setHasChanges(true);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const u = { ...f, ...updates };
        // ONLY update the internal name if it's NOT a standard field (id starts with s)
        if (updates.label && !f.id.startsWith("s")) {
          u.name = updates.label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        }
        return u;
      })
    );
    setHasChanges(true);
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-10 w-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ic = "block w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-400 text-sm pointer-events-none select-none";

  // Renders a fake (non-interactive) preview of each field type
  const renderFakeInput = (field: FormField) => {
    switch (field.type) {
      case "textarea":
        return <div className={`${ic} h-16`} />;
      case "select":
        return (
          <div className={`${ic} flex justify-between items-center`}>
            <span>Select an option</span>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        );
      case "checkbox":
        return (
          <div className="flex items-center gap-3 px-1 py-2 pointer-events-none select-none">
            <div className="h-5 w-5 rounded border-2 border-gray-300 bg-gray-100 flex-shrink-0" />
            <span className="text-sm text-gray-400">{field.label}</span>
          </div>
        );
      case "file":
        return (
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm pointer-events-none select-none">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Choose File (PDF, JPG, PNG)
          </div>
        );
      default:
        return (
          <div className={ic}>
            {field.type === "date" ? "dd/mm/yyyy" : field.type === "number" ? "0" : field.type === "email" ? "user@example.com" : "Enter text…"}
          </div>
        );
    }
  };

  const lc = "block text-sm font-semibold text-gray-700 mb-1.5";

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        title={`Form Builder — ${formTitle}`}
        subtitle="Click any field to edit. Hover and click × to remove. All fields from every step are shown here."
      />

      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-3">
          <button
            onClick={() => router.push("/dashboard/staff/super_admin/forms")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Forms
          </button>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                Unsaved changes
              </span>
            )}
            <button
              onClick={save}
              disabled={saving || !hasChanges}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving…" : "Save Form"}
            </button>
          </div>
        </div>

        {message && (
          <div className={`px-4 py-3 rounded-xl border text-sm font-medium ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
            {message.text}
          </div>
        )}

        {/* Form Preview Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{formTitle}</h2>
            <p className="text-xs text-gray-400 mb-8">
              {fields.length} field{fields.length !== 1 ? "s" : ""} — click a field to edit, hover to remove.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className={`group relative ${
                    field.type === "textarea" || field.type === "checkbox" || field.type === "file"
                      ? "col-span-1 md:col-span-2"
                      : ""
                  }`}
                >
                  <div
                    className={`rounded-xl border-2 transition-all p-3 cursor-pointer
                      ${editingId === field.id
                        ? "border-blue-400 bg-blue-50/40 shadow-sm"
                        : "border-transparent hover:border-blue-200 hover:bg-gray-50/80"
                      }`}
                    onClick={() => setEditingId(editingId === field.id ? null : field.id)}
                  >
                    {/* Label row — hide label for checkbox (it's rendered inside the input) */}
                    {field.type !== "checkbox" && (
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`${lc} cursor-pointer`}>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                          title="Remove field"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* For checkbox, show remove button on the right of the row */}
                    {field.type === "checkbox" && (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">{renderFakeInput(field)}</div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all ml-2 flex-shrink-0"
                          title="Remove field"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {field.type !== "checkbox" && renderFakeInput(field)}

                    {/* Inline edit panel */}
                    {editingId === field.id && (
                      <div
                        className="mt-3 pt-3 border-t border-blue-200 space-y-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Label</label>
                            <input
                              autoFocus
                              type="text"
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400"
                              value={field.label}
                              onChange={(e) => updateField(field.id, { label: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Input Type</label>
                            <select
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400"
                              value={field.type}
                              onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                            >
                              <option value="text">Short Text</option>
                              <option value="textarea">Long Text</option>
                              <option value="number">Number</option>
                              <option value="date">Date</option>
                              <option value="email">Email</option>
                              <option value="select">Dropdown</option>
                              <option value="checkbox">Checkbox</option>
                              <option value="file">File Upload</option>
                            </select>
                          </div>
                        </div>

                        {field.type === "select" && (
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-600">
                              Dropdown Options <span className="font-normal text-gray-400"> (separate by comma or new line)</span>
                            </label>
                            <textarea
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 min-h-[100px]"
                              defaultValue={field.options?.join(", ") || ""}
                              placeholder={"Option A, Option B, Option C"}
                              onBlur={(e) => {
                                const opts = e.target.value.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
                                updateField(field.id, { options: opts });
                              }}
                              onChange={(e) => {
                                // Live update for preview, but more leniently to allow typing commas
                                const opts = e.target.value.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
                                updateField(field.id, { options: opts });
                              }}
                            />
                            <p className="text-[10px] text-gray-400 bg-gray-50 p-2 rounded-md border border-gray-100 flex items-center gap-1.5">
                              <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              You can use either a comma or a new line to separate options.
                            </p>
                          </div>
                        )}

                        {field.type !== "checkbox" && field.type !== "file" && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 rounded"
                              checked={field.required}
                              onChange={(e) => updateField(field.id, { required: e.target.checked })}
                            />
                            <span className="text-sm font-medium text-gray-700">Required field</span>
                          </label>
                        )}

                        <div className="flex justify-end">
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs text-blue-600 font-semibold hover:underline"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add field */}
            <button
              onClick={addField}
              className="mt-8 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-semibold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Field
            </button>

            {/* Submit button preview */}
            <div className="pt-8 mt-6 border-t border-gray-100">
              <button disabled className="px-8 py-3 bg-[#4caf50] text-white rounded-lg font-semibold opacity-30 cursor-not-allowed">
                Submit
              </button>
              <p className="text-xs text-gray-400 mt-1">Submit button — preview only</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating save bar */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white border border-gray-200 shadow-2xl rounded-2xl px-6 py-3 z-50">
          <span className="text-sm font-medium text-gray-700">You have unsaved changes</span>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Form"}
          </button>
        </div>
      )}
    </div>
  );
}
