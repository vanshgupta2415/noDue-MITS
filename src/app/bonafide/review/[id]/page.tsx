"use client";
import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";

export default function BonafideReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [application, setApplication] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      fetchApplication();
    }
  }, [user, loading]);

  const fetchApplication = async () => {
    try {
      const res = await fetch(`/api/bonafide/${id}`);
      const data = await res.json();
      if (data.success) {
        setApplication(data.data);
        setEditForm(data.data);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to load application" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setFetching(false);
    }
  };

  const handleAction = async (action: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/bonafide/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          remarks,
          updates: action === "SUPER_ADMIN_EDIT" ? editForm : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === "SUPER_ADMIN_EDIT") {
          setIsEditMode(false);
        }
        await fetchApplication();
        setMessage({ type: "success", text: "Action successful" });
      } else {
        setMessage({ type: "error", text: data.error || "Action failed" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-10 w-10 border-3 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen pb-12">
        <PageHeader title="Bonafide Certificate Application" subtitle="Not Found" />
        <div className="p-6 text-center">Application not found or access denied.</div>
      </div>
    );
  }

  const isHOD = user?.role === "HOD";
  const isSuperAdmin = false;

  const renderField = (label: string, fieldKey: string, type = "text") => {
    if (isEditMode) {
      return (
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
          <input
            type={type}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-gray-900 focus:bg-white focus:ring-2 focus:ring-green-500"
            value={editForm[fieldKey] || ""}
            onChange={(e) => setEditForm({ ...editForm, [fieldKey]: e.target.value })}
          />
        </div>
      );
    }

    let val = application[fieldKey];
    
    return (
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
        <p className="text-gray-900 font-medium">{val || "N/A"}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-12">
      <PageHeader title="Bonafide Application Details" subtitle={`Application No: ${application.applicationNo}`} />

      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        
        {message && (
          <div className={`px-4 py-3 rounded-xl border flex items-center shadow-sm text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Application Info</h3>
            {isSuperAdmin && (
              <button
                onClick={() => {
                  if (isEditMode) {
                    setEditForm(application);
                    setIsEditMode(false);
                  } else {
                    setIsEditMode(true);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isEditMode ? 'bg-gray-200 text-gray-800' : 'bg-green-600 text-white hover:bg-green-700'}`}
              >
                {isEditMode ? "Cancel Edit" : "Edit Application"}
              </button>
            )}
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {renderField("Student Name", "studentName")}
            {renderField("Enrollment Number", "enrollmentNo")}
            {renderField("Father's Name", "fatherName")}
            {renderField("Semester", "semester")}
            {renderField("Email Address", "emailAddress")}
            {renderField("Session", "session")}
          </div>

          {/* Dynamic Fields */}
          {application.dynamicData && Object.keys(application.dynamicData).length > 0 && (
            <div className="p-6 pt-0">
              <h4 className="text-sm font-bold text-gray-900 mb-4 border-t border-gray-100 pt-6">Additional Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {Object.entries(application.dynamicData).map(([key, val]) => {
                  if (isEditMode) {
                    return (
                      <div key={key} className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">{key}</label>
                        <input
                          type={typeof val === "number" ? "number" : "text"}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-gray-900 focus:bg-white focus:ring-2 focus:ring-green-500"
                          value={editForm.dynamicData?.[key] ?? ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              dynamicData: {
                                ...editForm.dynamicData,
                                [key]: typeof val === "number" ? Number(e.target.value) : e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={key} className="mb-4">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{key}</label>
                      <p className="text-gray-900 font-medium">{val != null && val !== "" ? String(val) : "N/A"}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isEditMode && (
             <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
               <button
                 disabled={actionLoading}
                 onClick={() => handleAction("SUPER_ADMIN_EDIT")}
                 className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-semibold shadow-sm hover:bg-green-700 disabled:opacity-50"
               >
                 {actionLoading ? "Saving..." : "Save Changes"}
               </button>
             </div>
          )}
        </div>

        {/* Status Blocks */}
        <div className="grid grid-cols-1 gap-6">
           <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
             <h4 className="text-base font-bold text-gray-900 mb-4 border-b pb-2">HOD Approval</h4>
             <p className="text-sm text-gray-600 mb-2">Status: 
               <span className={`ml-2 px-2 py-1 text-xs rounded font-bold ${application.hodApprovalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' : application.hodApprovalStatus === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                 {application.hodApprovalStatus}
               </span>
             </p>
             <p className="text-sm text-gray-600 mb-4">Remarks: {application.hodRemarks || "None"}</p>
             
             {isHOD && application.hodApprovalStatus === "UNDER_REVIEW" && (
                <div className="space-y-3 mt-4 border-t pt-4">
                  <textarea
                    placeholder="Add remarks (optional)"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-green-500"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => handleAction("APPROVE_HOD")} disabled={actionLoading} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">Approve</button>
                    <button onClick={() => handleAction("REJECT_HOD")} disabled={actionLoading} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">Reject</button>
                  </div>
                </div>
             )}
           </div>
        </div>

      </div>
    </div>
  );
}
