"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";

export default function FormBuilderSelector() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "SUPER_ADMIN")) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (user?.role !== "SUPER_ADMIN") return null;

  const forms = [
    { title: "NOC Form", type: "noc", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
    { title: "Bonafide Certificate Form", type: "bonafide", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { title: "No Dues Form", type: "nodues", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  ];

  return (
    <div className="min-h-screen pb-12">
      <PageHeader title="Dynamic Form Builder" subtitle="Select a form to customize its fields" />

      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {forms.map((form) => (
            <Link key={form.type} href={`/dashboard/staff/super_admin/forms/${form.type}`}>
              <div className="bg-white p-8 rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col items-center text-center h-full group">
                <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={form.icon} />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{form.title}</h3>
                <p className="text-gray-500 mt-2 text-sm">Add, edit, or remove fields dynamically for this application form.</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
