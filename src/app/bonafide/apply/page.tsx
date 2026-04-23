"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";

export default function ApplyBonafide() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [formData, setFormData] = useState({
    studentName: "",
    enrollmentNo: "",
    fatherName: "",
    semester: "",
    emailAddress: "",
    session: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [dynamicData, setDynamicData] = useState<Record<string, any>>({});
  const [fetchingSchema, setFetchingSchema] = useState(true);
  const [allFields, setAllFields] = useState<any[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  
  const getLabel = (name: string, fallback: string) => {
    return allFields.find((f) => f.name === name)?.label || fallback;
  };
  const isRequired = (name: string) => {
    return allFields.find((f) => f.name === name)?.required ?? true;
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user) {
      setFormData((prev) => ({
        ...prev,
        studentName: user.name || "",
        enrollmentNo: user.enrollmentNo || "",
        emailAddress: user.email || "",
      }));

      const standardKeys = ["studentName","enrollmentNo","fatherName","semester","emailAddress","session"];

      const loadSchema = () => {
        fetch("/api/forms/bonafide", { cache: "no-store" })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.data?.schema) {
              setAllFields(data.data.schema);
              const extras = (data.data.schema as any[]).filter((f) => !standardKeys.includes(f.name));
              setDynamicFields(extras);
              const initial: Record<string, any> = {};
              extras.forEach((f: any) => { initial[f.name] = ""; });
              setDynamicData(prev => ({ ...initial, ...prev }));
            }
          })
          .catch(console.error)
          .finally(() => setFetchingSchema(false));
      };

      loadSchema();

      window.addEventListener("focus", loadSchema);
      return () => window.removeEventListener("focus", loadSchema);
    }
  }, [user, loading, router]);

  const update = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const updateDynamic = (field: string, value: any) => {
    setDynamicData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[`d_${field}`]) setFieldErrors((prev) => { const n = { ...prev }; delete n[`d_${field}`]; return n; });
  };

  const handleFileUpload = async (file: File, field: string) => {
    setUploading(prev => ({ ...prev, [field]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "bonafide_extra");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        updateDynamic(field, data.data.url);
      } else {
        setFieldErrors((prev) => ({ ...prev, [`d_${field}`]: data.error || "Upload failed" }));
      }
    } catch {
      setFieldErrors((prev) => ({ ...prev, [`d_${field}`]: "Network error during upload" }));
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.studentName.trim()) errors.studentName = "Student Name is required";
    if (!formData.enrollmentNo.trim()) errors.enrollmentNo = "Enrollment No is required";
    if (!formData.fatherName.trim()) errors.fatherName = "Father's Name is required";
    if (!formData.semester) errors.semester = "Semester is required";
    if (!formData.emailAddress.trim()) errors.emailAddress = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.emailAddress)) errors.emailAddress = "Invalid email";
    if (!formData.session) errors.session = "Session is required";
    dynamicFields.forEach((f) => {
      if (f.required && !dynamicData[f.name]) errors[`d_${f.name}`] = `${f.label} is required`;
    });
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/bonafide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, dynamicData }),
      });
      const data = await res.json();
      if (data.success) setSubmitSuccess(true);
      else setSubmitError(data.error || "Failed to submit");
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || fetchingSchema) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-10 w-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Bonafide Form" subtitle="Submit your Bonafide application" />
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[70vh]">
          <div className="bg-white rounded-2xl border border-gray-200/60 p-12 shadow-sm max-w-lg w-full text-center">
            <div className="mx-auto h-20 w-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
              <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
            <p className="text-gray-500 mb-8">Your Bonafide Certificate application is pending review by the HOD.</p>
            <button onClick={() => router.push("/track")}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm">
              Track Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ic = "block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all";
  const iec = "block w-full px-4 py-3 bg-red-50 border border-red-300 rounded-xl outline-none text-gray-900 focus:bg-white focus:ring-2 focus:ring-red-500 transition-all";
  const lc = "block text-sm font-semibold text-gray-700 mb-1.5";
  const ec = "text-xs text-red-600 mt-1";

  const renderField = (name: string, value: any, onChange: (val: any) => void, error?: string, defaultType: string = "text", defaultOptions?: string[]) => {
    const f = allFields.find(f => f.name === name);
    const type = f?.type || defaultType;
    const label = f?.label || name;
    const required = f?.required ?? true;
    const options = f?.options || defaultOptions || [];

    return (
      <div>
        <label className={lc}>{label}{required && " *"}</label>
        {type === "select" ? (
          <select className={error ? iec : ic} value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select Option</option>
            {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : type === "textarea" ? (
          <textarea className={error ? iec : ic} value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
        ) : type === "checkbox" ? (
          <div className="flex items-center space-x-3 py-2">
            <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
            <span className="text-sm text-gray-700">{label}</span>
          </div>
        ) : type === "file" ? (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <input 
              type="file" 
              className="hidden" 
              id={`file-${name}`}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, name);
              }} 
            />
            {value ? (
               <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span className="text-sm text-emerald-800 font-medium truncate max-w-[200px]">Uploaded</span>
                  </div>
                  <button type="button" onClick={() => document.getElementById(`file-${name}`)?.click()} className="text-xs text-blue-600 font-bold hover:underline">Replace</button>
               </div>
            ) : (
               <button type="button" onClick={() => document.getElementById(`file-${name}`)?.click()} disabled={uploading[name]}
                 className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-all font-medium disabled:opacity-50">
                 {uploading[name] ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      <span>Uploading...</span>
                    </>
                 ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                      <span>Choose File</span>
                    </>
                 )}
               </button>
            )}
          </div>
        ) : (
          <input type={type} className={error ? iec : ic} value={value} onChange={(e) => onChange(e.target.value)} />
        )}
        {error && <p className={ec}>{error}</p>}
      </div>
    );
  };

  const currentYear = new Date().getFullYear();
  const sessions = [`${currentYear-1}-${currentYear}`, `${currentYear}-${currentYear+1}`, `${currentYear+1}-${currentYear+2}`];

  return (
    <div className="min-h-screen pb-12">
      <PageHeader title="Bonafide Form" subtitle="Apply for Bonafide Certificate" />
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-8">Bonafide Form</h2>

            {submitError && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{submitError}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Render standard fields dynamically from schema */}
              {allFields
                .filter(f => ["studentName", "enrollmentNo", "fatherName", "semester", "emailAddress", "session"].includes(f.name))
                .map(f => (
                  <div key={f.id}>
                    {renderField(f.name, formData[f.name as keyof typeof formData], (val) => update(f.name, val), fieldErrors[f.name])}
                  </div>
                ))
              }

              {/* Dynamic extra fields */}
              {dynamicFields.map((field) => (
                <div key={field.id} className={field.type === "textarea" ? "col-span-1 md:col-span-2" : ""}>
                  {renderField(field.name, dynamicData[field.name], (val) => updateDynamic(field.name, val), fieldErrors[`d_${field.name}`], field.type, field.options)}
                </div>
              ))}
            </div>

            <div className="pt-6 mt-4 border-t border-gray-100">
              <button onClick={handleSubmit} disabled={isSubmitting}
                className="w-full md:w-auto px-8 py-3 bg-[#4caf50] text-white rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50">
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
