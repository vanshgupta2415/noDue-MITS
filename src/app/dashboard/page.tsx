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
  status: string;
  createdAt: string;
  approvals: Approval[];
  completionPercentage: number;
}

export default function StudentDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [activeTab, setActiveTab] = useState<'nodues' | 'noc' | 'bonafide'>('nodues');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "STUDENT") {
      router.push(`/dashboard/staff/${user.role.toLowerCase()}`);
      return;
    }
    setFetching(true);
    fetchApplications();
  }, [user, loading, router]);

  const fetchApplications = async () => {
    try {
      const res = await fetch(`/api/student/applications`);
      const data = await res.json();
      if (data.success) {
        setApplications(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setFetching(false);
    }
  };

  if (loading || !user || user.role !== "STUDENT") return null;

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-10 w-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Find No Dues for completion stats
  const noDues = applications.find(a => a.type === 'NODUES');
  const approvedCount = noDues?.approvals?.filter((a: any) => a.status === "APPROVED").length || 0;
  const totalDepts = noDues?.approvals?.length || 0;
  const completion = noDues?.completionPercentage || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
      case "PENDING":
        return { label: "Pending", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
      case "IN_PROGRESS":
        return { label: "In Progress", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
      case "FULLY_APPROVED":
      case "APPROVED":
        return { label: "Approved", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
      case "REJECTED":
        return { label: "Rejected", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" };
      default:
        return { label: status, bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" };
    }
  };


  return (
    <div className="min-h-screen">
      <PageHeader title="Dashboard" subtitle="Welcome back, track your clearance progress" />

      <div className="p-6 lg:p-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="bg-linear-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Welcome, {user?.name}!</h1>
                <p className="text-blue-100 mt-1 text-sm">Enrollment: {user?.enrollmentNo || "N/A"} &bull; {user?.department || ""}</p>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  {applications.length > 0 ? (
                    applications.map((app) => {
                      const badge = getStatusBadge(app.status);
                      return (
                        <span key={app.id} className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold ${badge.bg} ${badge.text} border ${badge.border} shadow-sm`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current mr-1.5" />
                          {app.type === "NODUES" ? "No-Dues" : app.type === "NOC" ? "NOC" : "Bonafide"}: {badge.label}
                        </span>
                      );
                    })
                  ) : (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-gray-50/20 text-blue-100 border border-white/20`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-100 mr-1.5" />
                      Status: No applications yet
                    </span>
                  )}
                </div>
              </div>

              {/* Completion Ring (No Dues only for now, as it's the main clearance one) */}
              <div className="mt-6 lg:mt-0 flex items-center space-x-4">
                <div className="relative h-24 w-24 text-white">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-white/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path className="text-white" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${completion}, 100`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold">{completion}%</span>
                  </div>
                </div>
                <div className="text-sm text-blue-100 font-medium">No-Dues<br />Progress</div>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Services Tabs */}
        <div className="bg-white rounded-3xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="p-6 lg:p-8 border-b border-gray-50 bg-gray-50/30">
            <h2 className="text-xl font-bold text-gray-900">Certificate Services</h2>
            <p className="text-sm text-gray-500 mt-1">Apply for and track all your official college certificates</p>
          </div>
          
          <div className="flex border-b border-gray-100 p-2 gap-2 bg-gray-50/30">
            {[
              { id: 'nodues', label: 'No Dues', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { id: 'noc', label: 'NOC', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
              { id: 'bonafide', label: 'Bonafide', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? "bg-white text-blue-600 shadow-sm ring-1 ring-gray-200" 
                    : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 lg:p-10">
            {activeTab === 'nodues' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">No Dues Certificate</h3>
                  <p className="text-gray-500 leading-relaxed mb-8">
                    Required for final year students to clear all departmental dues (Library, Hostel, Sports, etc.) 
                    before receiving their degree or TC.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link href="/apply" className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                      Apply Now
                    </Link>
                    <Link href="/track" className="px-8 py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                      Track Status
                    </Link>
                  </div>
                </div>
                <div className="hidden lg:block bg-blue-50 rounded-3xl p-8 relative overflow-hidden group">
                  <div className="relative z-10">
                    <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h4 className="font-bold text-blue-900 mb-2">Did you know?</h4>
                    <p className="text-sm text-blue-700/80">You can download your e-No Dues certificate instantly once all departments provide approval.</p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 h-32 w-32 bg-blue-100 rounded-full group-hover:scale-110 transition-transform duration-500" />
                </div>
              </div>
            )}

            {activeTab === 'noc' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">No Objection Certificate</h3>
                  <p className="text-gray-500 leading-relaxed mb-8">
                    Essential for internships, industrial training, or official visits to other organizations 
                    during your course of study.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link href="/noc/apply" className="px-8 py-3 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20">
                      Apply Now
                    </Link>
                    <Link href="/track" className="px-8 py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                      Track Status
                    </Link>
                  </div>
                </div>
                <div className="hidden lg:block bg-purple-50 rounded-3xl p-8 relative overflow-hidden group">
                  <div className="relative z-10">
                    <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                      <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </div>
                    <h4 className="font-bold text-purple-900 mb-2">Training & Placement</h4>
                    <p className="text-sm text-purple-700/80">NOC requests are typically approved by your HOD and the T&P Cell officer.</p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 h-32 w-32 bg-purple-100 rounded-full group-hover:scale-110 transition-transform duration-500" />
                </div>
              </div>
            )}

            {activeTab === 'bonafide' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Bonafide Certificate</h3>
                  <p className="text-gray-500 leading-relaxed mb-8">
                    Used for proof of enrollment, applying for scholarships, education loans, 
                    or renewing a passport/ID.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {applications.find(a => a.type === 'BONAFIDE' && a.status === 'FULLY_APPROVED') ? (
                      <Link 
                        href={`/bonafide/certificate/${applications.find(a => a.type === 'BONAFIDE' && a.status === 'FULLY_APPROVED').id}`} 
                        className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download Certificate
                      </Link>
                    ) : (
                      <Link href="/bonafide/apply" className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
                        Apply Now
                      </Link>
                    )}
                    <Link href="/track" className="px-8 py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                      Track Status
                    </Link>
                  </div>
                </div>
                <div className="hidden lg:block bg-emerald-50 rounded-3xl p-8 relative overflow-hidden group">
                  <div className="relative z-10">
                    <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                      <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3c1.268 0 2.39.233 3.416.658M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h4 className="font-bold text-emerald-900 mb-2">Instantly Verified</h4>
                    <p className="text-sm text-emerald-700/80">Bonafide certificates are automatically generated following HOD approval.</p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 h-32 w-32 bg-emerald-100 rounded-full group-hover:scale-110 transition-transform duration-500" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
