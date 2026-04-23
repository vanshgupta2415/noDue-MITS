"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";

interface Approval {
  id: string;
  stage: number;
  department: string;
  status: "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  actionDate: string | null;
  remarks: string | null;
}

interface Application {
  id: string;
  applicationNo: string;
  type: "NODUES" | "NOC" | "BONAFIDE";
  typeLabel: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  approvals: Approval[];
  completionPercentage: number;
  details: Record<string, any>;
}

export default function TrackStatus() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user?.id) {
      fetchApplications();
    }
  }, [user, loading]);

  const fetchApplications = async () => {
    try {
      const res = await fetch(`/api/student/applications`);
      const data = await res.json();
      if (data.success) {
        setApplications(data.data);
        if (data.data.length > 0) {
          setSelectedId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setFetching(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-10 w-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Application Status" subtitle="Track your certificate progress" />
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[70vh]">
          <div className="bg-white rounded-2xl border border-gray-200/60 p-12 shadow-sm max-w-lg w-full text-center">
            <div className="mx-auto h-16 w-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
              <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">No Active Applications</h3>
            <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
              You haven&apos;t submitted any applications yet. Select a certificate type from the dashboard to apply.
            </p>
            <Link href="/dashboard" className="mt-6 inline-block px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-sm">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const application = applications.find(a => a.id === selectedId) || applications[0];
  const totalStages = application.approvals.length;

  const getOverallStatusConfig = (status: string) => {
    switch (status) {
      case "SUBMITTED":
      case "IN_PROGRESS":
        return { label: "In Progress", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-400" };
      case "FULLY_APPROVED":
        return { label: "Approved", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" };
      case "REJECTED":
        return { label: "Rejected", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" };
      default:
        return { label: "Pending", bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", dot: "bg-gray-400" };
    }
  };

  const overall = getOverallStatusConfig(application.status);

  return (
    <div className="min-h-screen bg-gray-50/30">
      <PageHeader title="Application Status" subtitle="Track all your active certificate requests" />

      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar: Application List */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-1">Your Applications</h3>
            <div className="space-y-3">
              {applications.map((app) => {
                const config = getOverallStatusConfig(app.status);
                const isActive = app.id === selectedId;
                return (
                  <button
                    key={app.id}
                    onClick={() => setSelectedId(app.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                      isActive 
                        ? "bg-white border-blue-600 shadow-lg shadow-blue-500/5 ring-1 ring-blue-600" 
                        : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide mb-2 inline-block ${
                          app.type === 'NODUES' ? 'bg-indigo-50 text-indigo-600' : 
                          app.type === 'NOC' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {app.typeLabel}
                        </span>
                        <h4 className="font-bold text-gray-900 line-clamp-1">{app.applicationNo}</h4>
                      </div>
                      <span className={`h-2 w-2 rounded-full ${config.dot}`} title={config.label} />
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        {new Date(app.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </p>
                      <div className="flex items-center text-[11px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                        {Math.round(app.completionPercentage)}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Content: Details & Timeline */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200/60 shadow-sm overflow-hidden">
              <div className="p-6 lg:p-8 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-gray-900">{application.typeLabel}</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${overall.bg} ${overall.text} ${overall.border}`}>
                      {overall.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 font-medium">Application ID: {application.applicationNo}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Overall Progress</p>
                      <p className="font-bold text-gray-900">{Math.round(application.completionPercentage)}% Complete</p>
                    </div>
                    <div className="h-10 w-10 rounded-full border-4 border-blue-600/10 flex items-center justify-center relative">
                      <svg className="h-10 w-10 -rotate-90 absolute">
                        <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-100" />
                        <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="100" strokeDashoffset={100 - application.completionPercentage} className="text-blue-600 transition-all duration-1000" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 lg:p-8">
                {/* Specific details for NOC/Bonafide only if relevant */}
                {application.type === 'NOC' && application.details.companyName && (
                  <div className="mb-8 p-4 bg-purple-50/50 border border-purple-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Company</p>
                      <p className="font-bold text-purple-900">{application.details.companyName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider text-right">Duration</p>
                      <p className="font-bold text-purple-900 text-right">{application.details.duration} Days</p>
                    </div>
                  </div>
                )}

                <h3 className="text-base font-bold text-gray-900 mb-6 flex items-center">
                  <span className="h-6 w-1 bg-blue-600 rounded-full mr-3" />
                  Approval Timeline
                </h3>

                <div className="relative pl-4">
                  {/* Vertical Line */}
                  <div className="absolute left-[3.5px] top-2 bottom-2 w-[1px] bg-gray-100" />

                  <div className="space-y-8">
                    {application.approvals.map((approval, idx) => {
                      const isRejected = approval.status === "REJECTED";
                      const isApproved = approval.status === "APPROVED";
                      const isUpcoming = !isRejected && !isApproved && (idx > 0 && application.approvals[idx-1].status !== 'APPROVED');

                      return (
                        <div key={idx} className={`relative pl-8 transition-all duration-300 ${isUpcoming ? 'opacity-40 grayscale' : ''}`}>
                          {/* Dot */}
                          <div className={`absolute left-[-16px] top-1.5 h-6 w-6 rounded-full border-4 border-white flex items-center justify-center ${
                            isApproved ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 
                            isRejected ? 'bg-red-500 shadow-lg shadow-red-500/20' : 'bg-amber-400 shadow-lg shadow-amber-400/20'
                          }`}>
                            {isApproved && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            {isRejected && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                          </div>

                          <div className={`p-4 rounded-2xl border transition-all ${
                            isRejected ? 'bg-red-50 border-red-100' : 
                            isApproved ? 'bg-emerald-50/30 border-emerald-100/50' : 'bg-white border-gray-100 shadow-sm'
                          }`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-bold text-gray-900 text-sm">{approval.department}</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Stage {approval.stage}</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                isApproved ? 'bg-emerald-100 text-emerald-700' : 
                                isRejected ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {isRejected ? 'Rejected' : isApproved ? 'Approved' : 'Under Review'}
                              </span>
                            </div>

                            {approval.remarks && (
                              <div className={`mt-3 p-3 rounded-xl text-xs ${isRejected ? 'bg-red-100/50 text-red-800' : 'bg-gray-50 text-gray-600'} italic`}>
                                &quot;{approval.remarks}&quot;
                              </div>
                            )}

                            {approval.actionDate && (
                              <p className="text-[10px] text-gray-400 mt-3 font-medium">
                                {new Date(approval.actionDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {application.status === 'REJECTED' && (
                  <div className="mt-12 bg-red-600 rounded-3xl p-6 text-white overflow-hidden relative">
                    <div className="relative z-10">
                      <h4 className="font-bold text-lg mb-2">Next Steps</h4>
                      <p className="text-sm text-red-100 leading-relaxed mb-4">
                        Your application was rejected. Please review the remarks provided by the department and submit a new request if necessary.
                      </p>
                      <Link href="/dashboard" className="px-5 py-2 bg-white text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors inline-block">
                        Go to Dashboard
                      </Link>
                    </div>
                    <svg className="absolute top-0 right-0 h-40 w-40 text-red-500 opacity-20 -mr-10 -mt-10" fill="currentColor" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="50" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}