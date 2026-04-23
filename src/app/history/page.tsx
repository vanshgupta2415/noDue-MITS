"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";

// ─── Student History Types ───
interface StudentApproval {
  id: string;
  stage: number;
  department: string;
  status: string;
  remarks: string | null;
  actionDate: string | null;
  reviewerName: string | null;
  reviewerRole: string | null;
}

interface StudentApplication {
  id: string;
  type: 'NODUES' | 'NOC' | 'BONAFIDE';
  applicationNo: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  fullName: string;
  course: string;
  totalStages: number;
  approvedStages: number;
  completionPercentage: number;
  rejectedBy: {
    department: string;
    stage: number;
    remarks: string | null;
    actionDate: string | null;
    reviewerName: string | null;
  } | null;
  approvals: StudentApproval[];
}

interface StudentHistoryData {
  type: "student";
  totalApplications: number;
  accepted: number;
  rejected: number;
  inProgress: number;
  applications: StudentApplication[];
}

// ─── Reviewer History Types ───
interface ReviewerHistoryItem {
  approvalId: string;
  stage: number;
  department: string;
  status: string;
  remarks: string | null;
  actionDate: string | null;
  application: {
    id: string;
    applicationNo: string;
    fullName: string;
    course: string;
    overallStatus: string;
    createdAt: string;
  };
}

interface ReviewerHistoryData {
  type: "reviewer";
  totalProcessed: number;
  totalApproved: number;
  totalRejected: number;
  history: ReviewerHistoryItem[];
}

type HistoryData = StudentHistoryData | ReviewerHistoryData;

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<HistoryData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (!loading && user) {
      fetchHistory();
    }
  }, [user, loading]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/applications/history");
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setFetchError(result.error || "Failed to fetch history");
      }
    } catch {
      setFetchError("Network error while fetching history");
    } finally {
      setFetching(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-10 w-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading history...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen">
        <PageHeader title="History" subtitle="View your application and review history" />
        <div className="p-6 lg:p-8">
          <div className="bg-red-50 border border-red-200/60 rounded-2xl p-12 text-center">
            <h3 className="text-lg font-bold text-red-900">{fetchError}</h3>
          </div>
        </div>
      </div>
    );
  }

  const isStudent = data?.type === "student";

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; bg: string; text: string }> = {
      FULLY_APPROVED: { label: "Approved", bg: "bg-emerald-50", text: "text-emerald-700" },
      REJECTED: { label: "Rejected", bg: "bg-red-50", text: "text-red-700" },
      SUBMITTED: { label: "In Progress", bg: "bg-amber-50", text: "text-amber-700" },
      IN_PROGRESS: { label: "In Progress", bg: "bg-amber-50", text: "text-amber-700" },
      APPROVED: { label: "Approved", bg: "bg-emerald-50", text: "text-emerald-700" },
      UNDER_REVIEW: { label: "Pending", bg: "bg-yellow-50", text: "text-yellow-700" },
    };
    const config = map[status] || { label: status, bg: "bg-gray-50", text: "text-gray-700" };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // ─── Student History View ───
  if (isStudent) {
    const studentData = data as StudentHistoryData;

    return (
      <div className="min-h-screen">
        <PageHeader title="Application History" subtitle="Track all your applications and their outcomes" />

        <div className="p-6 lg:p-8 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{studentData.totalApplications}</p>
                  <p className="text-xs text-gray-400 font-medium">Total Applied</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{studentData.accepted}</p>
                  <p className="text-xs text-gray-400 font-medium">Accepted</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{studentData.rejected}</p>
                  <p className="text-xs text-gray-400 font-medium">Rejected</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center">
                  <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{studentData.inProgress}</p>
                  <p className="text-xs text-gray-400 font-medium">In Progress</p>
                </div>
              </div>
            </div>
          </div>

          {/* Applications List */}
          {studentData.applications.length === 0 ? (
            <div className="bg-white border border-gray-200/60 rounded-2xl p-12 text-center shadow-sm">
              <div className="mx-auto h-16 w-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">No History Yet</h3>
              <p className="text-gray-400 text-sm mt-1">You haven&apos;t submitted any applications.</p>
              <Link href="/apply" className="mt-4 inline-block px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                Apply Now
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {studentData.applications.map((app) => (
                <div key={app.id} className="bg-white border border-gray-200/60 rounded-2xl shadow-sm overflow-hidden">
                  {/* Application Header */}
                  <button
                    onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                    className="w-full text-left p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        app.type === 'NODUES' ? 'bg-blue-50 text-blue-700' :
                        app.type === 'NOC' ? 'bg-purple-50 text-purple-700' :
                        'bg-emerald-50 text-emerald-700'
                      }`}>
                        {app.type === 'NODUES' ? 'No Dues' : app.type}
                      </span>
                      <span className="text-sm font-mono font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-lg">
                        #{app.applicationNo}
                      </span>
                      {statusBadge(app.status)}
                      <span className="text-sm text-gray-500">
                        Applied: {new Date(app.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500">
                        {app.approvedStages}/{app.totalStages} cleared
                      </span>
                      <svg
                        className={`h-5 w-5 text-gray-400 transition-transform ${expandedApp === app.id ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Rejection Info */}
                  {app.rejectedBy && (
                    <div className="mx-5 mb-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
                      <p className="text-red-800">
                        <strong>Rejected by:</strong> {app.rejectedBy.department} (Stage {app.rejectedBy.stage})
                        {app.rejectedBy.reviewerName && <> &mdash; {app.rejectedBy.reviewerName}</>}
                      </p>
                      {app.rejectedBy.remarks && (
                        <p className="text-red-700 mt-1"><strong>Reason:</strong> {app.rejectedBy.remarks}</p>
                      )}
                      {app.rejectedBy.actionDate && (
                        <p className="text-red-600 text-xs mt-1">
                          on {new Date(app.rejectedBy.actionDate).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric"
                          })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Expanded Approval Timeline */}
                  {expandedApp === app.id && (
                    <div className="border-t border-gray-100 p-5">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                        Approval Timeline
                      </h4>
                      <div className="space-y-3">
                        {app.approvals.map((approval) => {
                          const statusColors: Record<string, string> = {
                            APPROVED: "border-emerald-200 bg-emerald-50",
                            REJECTED: "border-red-200 bg-red-50",
                            UNDER_REVIEW: "border-yellow-200 bg-yellow-50",
                          };
                          return (
                            <div
                              key={approval.id}
                              className={`border rounded-xl p-3 ${statusColors[approval.status] || "border-gray-200 bg-gray-50"}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{approval.department}</p>
                                  <p className="text-xs text-gray-500">Stage {approval.stage}</p>
                                </div>
                                <div className="text-right">
                                  {statusBadge(approval.status)}
                                  {approval.reviewerName && (
                                    <p className="text-xs text-gray-500 mt-1">by {approval.reviewerName}</p>
                                  )}
                                </div>
                              </div>
                              {approval.remarks && (
                                <p className="text-xs text-gray-600 mt-2 bg-white/60 rounded-lg px-2 py-1">
                                  {approval.remarks}
                                </p>
                              )}
                              {approval.actionDate && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(approval.actionDate).toLocaleDateString("en-IN", {
                                    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                                  })}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Reviewer History View ───
  const reviewerData = data as ReviewerHistoryData;

  return (
    <div className="min-h-screen">
      <PageHeader title="Review History" subtitle="Your approval and rejection records" />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{reviewerData.totalProcessed}</p>
                <p className="text-xs text-gray-400 font-medium">Total Processed</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{reviewerData.totalApproved}</p>
                <p className="text-xs text-gray-400 font-medium">Approved</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{reviewerData.totalRejected}</p>
                <p className="text-xs text-gray-400 font-medium">Rejected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Processed Applications Table */}
        {reviewerData.history.length === 0 ? (
          <div className="bg-white border border-gray-200/60 rounded-2xl p-12 text-center shadow-sm">
            <div className="mx-auto h-16 w-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">No Review History</h3>
            <p className="text-gray-400 text-sm mt-1">You haven&apos;t processed any applications yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Processed Applications</h3>
              <span className="text-xs text-gray-400">{reviewerData.history.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Application</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Applicant</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Decision</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Remarks</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Overall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/80">
                  {reviewerData.history.map((item) => (
                    <tr
                      key={item.approvalId}
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/review/${item.application.id}`)}
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">
                          {item.application.applicationNo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-sm text-gray-900">{item.application.fullName}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.application.course}</td>
                      <td className="px-6 py-4">
                        {statusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 max-w-48 truncate" title={item.remarks || undefined}>
                          {item.remarks || "—"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {item.actionDate
                          ? new Date(item.actionDate).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short", year: "numeric"
                            })
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        {statusBadge(item.application.overallStatus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
