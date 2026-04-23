"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function PendingApprovalPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 via-white to-blue-50 px-6">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-gray-100 text-center">
        <div className="inline-flex items-center justify-center h-20 w-20 bg-amber-50 rounded-full mb-6">
          <svg className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Registration Under Review</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Thank you for registering, <span className="font-semibold text-gray-900">{user?.name}</span>. 
          Your request has been sent to the <span className="font-semibold text-blue-600">General Office</span> for approval.
        </p>

        <div className="bg-blue-50 rounded-xl p-4 mb-8 text-left border border-blue-100">
          <h3 className="text-sm font-bold text-blue-700 mb-1 flex items-center">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            What happens next?
          </h3>
          <p className="text-xs text-blue-600">
            Once the General Office approves your registration, you will be able to access the portal using your Google account. You will receive an email notification when your account is activated.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
        >
          Back to Login
        </button>
        
        <p className="mt-8 text-xs text-gray-400">
          MITS Gwalior &mdash; No-Dues Certificate Portal
        </p>
      </div>
    </div>
  );
}
