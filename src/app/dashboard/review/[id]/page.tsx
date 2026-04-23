"use client";
import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";

interface Application {
  id: string;
  applicationNo: string;
  studentId: string;
  status: string;
  fullName: string;
  fatherName: string;
  phoneNumber: string;
  address: string;
  passOutYear: number;
  course: string;
  cgpa: number;
  isHostelResident: boolean;
  hostelName: string | null;
  roomNumber: string | null;
  cautionMoneyRefund: boolean;
  receiptNumber: string | null;
  feeReceipts: string[];
  marksheet: string | null;
  bankDetails: string | null;
  collegeId: string | null;
  currentStage: number;
  createdAt: string;
  approvals: Approval[];
  dynamicData?: Record<string, any>;
}

interface Approval {
  id: string;
  applicationId: string;
  stage: number;
  department: string;
  status: string;
  remarks: string | null;
  actionDate: string | null;
  approvedBy: string | null;
}

export default function ApplicationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [remarksError, setRemarksError] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (!loading && user && user.role === "STUDENT") {
      router.push("/dashboard");
      return;
    }
    if (!loading && user) {
      fetchApplicationDetails();
    }
  }, [user, loading, id]);

  const fetchApplicationDetails = async () => {
    try {
      const res = await fetch(`/api/applications/${id}`);
      const data = await res.json();
      if (data.success) {
        setApplication(data.data);
      } else {
        setFetchError(data.error || "Failed to fetch application");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setFetchError("Failed to fetch application details");
    } finally {
      setFetching(false);
    }
  };

  const handleAction = async (status: "APPROVED" | "REJECTED") => {
    // Validate remarks are provided
    if (!remarks.trim()) {
      setRemarksError(
        status === "APPROVED"
          ? "Remarks are mandatory to approve this application"
          : "Remarks are mandatory to reject this application"
      );
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setRemarksError("");

    try {
      // Find the current stage's approval record
      const currentApproval = application?.approvals.find(
        (a) => a.stage === application.currentStage
      );

      if (!currentApproval) {
        setSubmitError("Could not find approval record for this stage");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/approvals", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approvalId: currentApproval.id,
          status,
          remarks: remarks.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Show success and redirect
        alert(
          `Application ${status === "APPROVED" ? "approved" : "rejected"} successfully!`
        );
        router.push(`/dashboard/staff/${user?.role.toLowerCase().replace(/_/g, "_")}`);
      } else {
        setSubmitError(data.error || "Failed to submit action");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setSubmitError("Failed to submit action");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-10 w-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading application...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="Application Review"
          subtitle="View and process applications"
        />
        <div className="p-6 lg:p-8">
          <div className="bg-red-50 border border-red-200/60 rounded-2xl p-12 text-center">
            <svg
              className="h-16 w-16 text-red-600 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-bold text-red-900">{fetchError}</h3>
            <button
              onClick={() => router.back()}
              className="mt-6 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="Application Review"
          subtitle="View and process applications"
        />
        <div className="p-6 lg:p-8">
          <div className="bg-gray-50 border border-gray-200/60 rounded-2xl p-12 text-center">
            <h3 className="text-lg font-bold text-gray-900">
              Application not found
            </h3>
            <button
              onClick={() => router.back()}
              className="mt-6 inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    IN_PROGRESS: "text-yellow-600 bg-yellow-50",
    SUBMITTED: "text-blue-600 bg-blue-50",
    FULLY_APPROVED: "text-emerald-600 bg-emerald-50",
    REJECTED: "text-red-600 bg-red-50",
  };

  const approvalStatusColor: Record<string, string> = {
    UNDER_REVIEW: "bg-yellow-50 text-yellow-700 border-yellow-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
  };

  // Get the current approval for this stage
  const currentApproval = application.approvals.find(
    (a) => a.stage === application.currentStage
  );

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Application Review"
        subtitle={`Application ${application.applicationNo}`}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Header Card */}
        <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {application.fullName}
              </h2>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-sm text-gray-500">
                  Application: <span className="font-mono font-bold text-blue-600">{application.applicationNo}</span>
                </span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor[application.status]}`}>
                  {application.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Submitted</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(application.createdAt).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <p className="text-gray-900 font-medium">{application.fullName}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Father&apos;s Name
                  </label>
                  <p className="text-gray-900 font-medium">{application.fatherName}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <p className="text-gray-900 font-medium">{application.phoneNumber}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Address
                  </label>
                  <p className="text-gray-900 font-medium">{application.address}</p>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Academic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Course
                  </label>
                  <p className="text-gray-900 font-medium">{application.course}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Pass Out Year
                  </label>
                  <p className="text-gray-900 font-medium">{application.passOutYear}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    CGPA
                  </label>
                  <p className="text-gray-900 font-medium">{application.cgpa.toFixed(2)}</p>
                </div>
                {application.collegeId && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      College ID
                    </label>
                    <p className="text-gray-900 font-medium">{application.collegeId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Hostel Information */}
            {application.isHostelResident && (
              <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Hostel Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Hostel Name
                    </label>
                    <p className="text-gray-900 font-medium">{application.hostelName}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Room Number
                    </label>
                    <p className="text-gray-900 font-medium">{application.roomNumber}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Fee Information */}
            {(application.cautionMoneyRefund || application.feeReceipts.length > 0) && (
              <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Fee Information
                </h3>
                <div className="space-y-4">
                  {application.feeReceipts.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Fee Receipts
                      </label>
                      <div className="space-y-1">
                        {application.feeReceipts.map((receipt, idx) => (
                          <p key={idx} className="text-gray-900 font-medium">
                            • {receipt}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {application.cautionMoneyRefund && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Caution Money Refund Receipt
                      </label>
                      <p className="text-gray-900 font-medium">
                        {application.receiptNumber || "N/A"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dynamic Details */}
            {application.dynamicData && Object.keys(application.dynamicData).length > 0 && (
              <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Additional Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(application.dynamicData).map(([key, val]) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        {key}
                      </label>
                      <p className="text-gray-900 font-medium">{val != null && val !== "" ? String(val) : "N/A"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Section */}
            {(application.marksheet || application.bankDetails || application.collegeId || application.feeReceipts.length > 0) && (
              <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Uploaded Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {application.marksheet && (
                    <div className="bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                            Marksheet
                          </p>
                          <p className="text-sm text-blue-900 font-medium mt-1 break-all">
                            {application.marksheet}
                          </p>
                        </div>
                        <a
                          href={application.marksheet}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 shrink-0"
                        >
                          <svg
                            className="h-6 w-6 text-blue-400 hover:text-blue-600 transition-colors"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      </div>
                    </div>
                  )}

                  {application.bankDetails && (
                    <div className="bg-linear-to-br from-green-50 to-emerald-50 border border-green-200/60 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">
                            Bank Details
                          </p>
                          <p className="text-sm text-green-900 font-medium mt-1 break-all">
                            {application.bankDetails}
                          </p>
                        </div>
                        <a
                          href={application.bankDetails}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 shrink-0"
                        >
                          <svg
                            className="h-6 w-6 text-green-400 hover:text-green-600 transition-colors"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      </div>
                    </div>
                  )}

                  {application.collegeId && (
                    <div className="bg-linear-to-br from-purple-50 to-violet-50 border border-purple-200/60 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                            College ID Proof
                          </p>
                          <p className="text-sm text-purple-900 font-medium mt-1 break-all">
                            {application.collegeId}
                          </p>
                        </div>
                        <a
                          href={application.collegeId}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 shrink-0"
                        >
                          <svg
                            className="h-6 w-6 text-purple-400 hover:text-purple-600 transition-colors"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      </div>
                    </div>
                  )}

                  {application.feeReceipts.length > 0 && (
                    <div className="bg-linear-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                            Fee Receipts
                          </p>
                          {application.feeReceipts.map((receipt, idx) => (
                            <p key={idx} className="text-sm text-amber-900 font-medium mt-1 break-all">
                              {receipt}
                            </p>
                          ))}
                        </div>
                        {application.feeReceipts[0] && (
                          <a
                            href={application.feeReceipts[0]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 shrink-0"
                          >
                            <svg
                              className="h-6 w-6 text-amber-400 hover:text-amber-600 transition-colors"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar (1 column) */}
          <div className="space-y-6">
            {/* Approval Timeline */}
            <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Approval Status
              </h3>
              <div className="space-y-3">
                {application.approvals.map((approval) => (
                  <div
                    key={approval.id}
                    className={`border rounded-lg p-3 text-sm ${approvalStatusColor[approval.status]}`}
                  >
                    <p className="font-semibold">{approval.department}</p>
                    <p className="text-xs opacity-75 mt-0.5">
                      Stage {approval.stage}
                    </p>
                    {approval.status !== "UNDER_REVIEW" && (
                      <>
                        <p className="text-xs opacity-75 mt-1">
                          {approval.remarks && `Remarks: ${approval.remarks}`}
                        </p>
                        <p className="text-xs opacity-75">
                          {approval.actionDate &&
                            new Date(approval.actionDate).toLocaleDateString("en-IN")}
                        </p>
                      </>
                    )}
                    {approval.stage === application.currentStage && (
                      <p className="text-xs font-semibold mt-1 inline-block bg-white/50 px-2 py-0.5 rounded">
                        Current Stage
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Review Actions */}
            {currentApproval && currentApproval.status === "UNDER_REVIEW" && (
              <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Your Decision
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Remarks
                      <span className="text-red-500 ml-1">*</span>
                      <span className="text-xs font-normal text-gray-500 ml-1">
                        (Required)
                      </span>
                    </label>
                    <textarea
                      value={remarks}
                      onChange={(e) => {
                        setRemarks(e.target.value);
                        if (remarksError) setRemarksError("");
                      }}
                      placeholder="Please provide detailed remarks for your decision..."
                      className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none ${
                        remarksError
                          ? "border-red-300 bg-red-50 focus:ring-red-500"
                          : "border-gray-200 bg-gray-50 focus:ring-blue-500"
                      }`}
                      rows={5}
                    />
                    {remarksError && (
                      <p className="text-sm text-red-600 mt-2">{remarksError}</p>
                    )}
                  </div>

                  {submitError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-700">{submitError}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => handleAction("APPROVED")}
                      disabled={submitting}
                      className="flex-1 bg-emerald-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {submitting ? "Processing..." : "✓ Approve"}
                    </button>
                    <button
                      onClick={() => handleAction("REJECTED")}
                      disabled={submitting}
                      className="flex-1 border border-red-300 text-red-600 py-2.5 px-4 rounded-lg font-semibold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? "Processing..." : "✕ Reject"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentApproval && currentApproval.status !== "UNDER_REVIEW" && (
              <div className={`rounded-2xl shadow-sm p-6 border ${approvalStatusColor[currentApproval.status]}`}>
                <h3 className="font-bold mb-2">Already Processed</h3>
                <p className="text-sm">
                  Status: <span className="font-semibold">{currentApproval.status}</span>
                </p>
                {currentApproval.remarks && (
                  <p className="text-sm mt-2">
                    Remarks: <span className="font-medium">{currentApproval.remarks}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="flex justify-start">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
