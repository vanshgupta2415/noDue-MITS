"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";

interface Application {
  id: string;
  applicationNo: string;
  type: string;
  status: string;
  fullName: string;
  course: string;
  createdAt: string;
  updatedAt: string;
}

export default function CertificateSection() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
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
      // Reuse the student applications list API
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

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-10 w-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const approvedApplications = applications.filter(a => a.status === "FULLY_APPROVED");

  return (
    <div className="min-h-screen">
      <PageHeader title="Certificate Center" subtitle="View and download your official certificates" />

      <div className="p-6 lg:p-8">
        {approvedApplications.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {approvedApplications.map((app) => (
              <div key={app.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className={`p-6 bg-linear-to-br ${
                  app.type === 'NODUES' ? 'from-emerald-50 to-teal-50' : 
                  app.type === 'NOC' ? 'from-purple-50 to-indigo-50' : 
                  'from-blue-50 to-indigo-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                      app.type === 'NODUES' ? 'bg-emerald-100 text-emerald-600' : 
                      app.type === 'NOC' ? 'bg-purple-100 text-purple-600' : 
                      'bg-blue-100 text-blue-600'
                    }`}>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm uppercase tracking-wider">
                      Issued
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      {app.type === 'NODUES' ? 'No Dues Certificate' : 
                       app.type === 'NOC' ? 'No Objection Certificate' : 
                       'Bonafide Certificate'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 font-mono uppercase tracking-tight">Ref: {app.applicationNo}</p>
                  </div>
                </div>
                
                <div className="p-5 flex flex-col gap-3 mt-auto border-t border-gray-50 bg-white">
                  <Link 
                    href={
                      app.type === 'BONAFIDE' ? `/bonafide/certificate/${app.id}` :
                      app.type === 'NOC' ? `/noc/certificate/${app.id}` :
                      app.type === 'NODUES' ? `/certificate/nodues/${app.id}` :
                      '#'
                    }
                    className={`w-full py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                      app.type === 'BONAFIDE' 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : app.type === 'NOC'
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PDF
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* No Certificate Available */
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-2xl border border-gray-200/60 p-12 shadow-sm max-w-lg w-full text-center">
              <div className="mx-auto h-20 w-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
                <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">No Certificates Ready</h3>
              <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
                Once your applications are approved, your downloadable certificates will appear here. Currently, no certificates have been fully issued.
              </p>
              <div className="mt-8 flex items-center justify-center gap-4">
                <Link href="/track" className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all text-sm">
                  View Track Status
                </Link>
                <Link href="/dashboard" className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-sm">
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}