"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";

interface NocApplication {
  id: string;
  applicationNo: string;
  studentName: string;
  enrollmentNo: string;
  currentYear: string;
  createdAt: string;
  status: string;
  hodApprovalStatus: string;
  tpcApprovalStatus: string;
}

export default function NocAdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [nocs, setNocs] = useState<NocApplication[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (!loading && user?.role === "STUDENT") {
      router.push("/dashboard");
      return;
    }

    if (user && ["HOD", "TP_OFFICER"].includes(user.role)) {
      fetchNocs();
    } else if (user) {
      // Other roles not allowed in NOC
      router.push(`/dashboard/staff/${user.role.toLowerCase()}`);
    }
  }, [user, loading, router]);

  const fetchNocs = async () => {
    try {
      const res = await fetch("/api/noc");
      const data = await res.json();
      if (data.success) {
        setNocs(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch NOCs:", err);
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

  const pendingCount = nocs.length;

  return (
    <div className="min-h-screen pb-12">
      <PageHeader title="NOC Administration" subtitle="Manage No Objection Certificates" />

      <div className="p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                <p className="text-xs text-gray-400 font-medium">
                  {user?.role === "SUPER_ADMIN" ? "Total Applications" : "Pending Actions"}
                </p>
              </div>
            </div>
            <button
               onClick={() => router.push(`/dashboard/staff/${user?.role.toLowerCase()}`)}
               className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              Back to Main Dashboard
            </button>
          </div>
        </div>

        {nocs.length === 0 ? (
          <div className="bg-white border border-gray-200/60 rounded-2xl p-12 text-center shadow-sm">
            <div className="mx-auto h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">All Clear!</h3>
            <p className="text-gray-400 text-sm mt-1">No NOC requests found for your role at the moment.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-900">NOC Applications</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Application No</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/80">
                  {nocs.map((noc) => (
                    <tr
                      key={noc.id}
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                      onClick={() => router.push(`/noc/review/${noc.id}`)}
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-sm text-gray-900">{noc.studentName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{noc.enrollmentNo} - {noc.currentYear}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono bg-purple-50 text-purple-700 px-2.5 py-1 rounded border border-purple-200">
                          {noc.applicationNo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                           noc.status === "SUBMITTED" || noc.status === "IN_PROGRESS"
                             ? "bg-amber-50 text-amber-700 border-amber-200"
                             : noc.status === "FULLY_APPROVED" 
                             ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                             : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {noc.status === "FULLY_APPROVED" ? "APPROVED" : noc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(noc.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/noc/review/${noc.id}`);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
                        >
                          Review
                        </button>
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
