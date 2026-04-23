"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";

const STEPS = ["General Details", "Company & Additional Info"];

export default function ApplyNoc() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [formData, setFormData] = useState({
    enrollmentNo: "",
    studentName: "",
    currentYear: "",
    companyName: "",
    companyLocation: "",
    durationInDays: "",
    recipientName: "",
    recipientDesignation: "",
    startDate: "",
    endDate: "",
    companyAddress: "",
    companyWebsite: "",
    applyingThrough: "",
    stipend: "",
    offerLetterUrl: "",
    declaration: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadedFile, setUploadedFile] = useState<{ name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [dynamicData, setDynamicData] = useState<Record<string, any>>({});
  const [fetchingSchema, setFetchingSchema] = useState(true);
  const [allFields, setAllFields] = useState<any[]>([]);
  
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
      }));

      const standardKeys = ["enrollmentNo","studentName","currentYear","companyName","companyLocation","companyAddress","companyWebsite","durationInDays","startDate","endDate","recipientName","recipientDesignation","applyingThrough","stipend","offerLetterUrl"];
      
      const loadSchema = () => {
        fetch("/api/forms/noc", { cache: "no-store" })
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

  const update = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const updateDynamic = (field: string, value: any) => {
    setDynamicData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[`d_${field}`]) setFieldErrors((prev) => { const n = { ...prev }; delete n[`d_${field}`]; return n; });
  };

  const handleFileUpload = async (file: File, field: string = "offerLetterUrl") => {
    setUploading(prev => ({ ...prev, [field]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "noc_offer_letter");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        if (field === "offerLetterUrl") {
          update("offerLetterUrl", data.data.url);
          setUploadedFile({ name: file.name });
        } else {
          updateDynamic(field, data.data.url);
        }
      } else {
        setFieldErrors((prev) => ({ ...prev, [field]: data.error || "Upload failed" }));
      }
    } catch {
       setFieldErrors((prev) => ({ ...prev, [field]: "Network error during upload" }));
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const validateStep = (s: number) => {
    const errors: Record<string, string> = {};
    if (s === 1) {
      if (!formData.enrollmentNo.trim()) errors.enrollmentNo = "Enrollment Number is required";
      if (!formData.studentName.trim()) errors.studentName = "Name is required";
      if (!formData.currentYear) errors.currentYear = "Current Year is required";
      if (!formData.companyName.trim()) errors.companyName = "Company Name is required";
      if (!formData.companyLocation.trim()) errors.companyLocation = "Location is required";
      if (!formData.durationInDays.trim() || isNaN(Number(formData.durationInDays))) errors.durationInDays = "Valid Duration is required";
      if (!formData.startDate) errors.startDate = "Start Date is required";
      if (!formData.endDate) errors.endDate = "End Date is required";
      if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate))
        errors.endDate = "End Date cannot be before Start Date";
    }
    if (s === 2) {
      if (!formData.companyAddress.trim()) errors.companyAddress = "Company Address is required";
      if (!formData.applyingThrough) errors.applyingThrough = "Please specify how you applied";
      dynamicFields.forEach((f) => {
        if (f.required && !dynamicData[f.name]) errors[`d_${f.name}`] = `${f.label} is required`;
      });
    }
    return errors;
  };

  const nextStep = () => {
    const errors = validateStep(step);
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!formData.declaration) { setSubmitError("Please accept the declaration before submitting."); return; }
    const errors = validateStep(2);
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/noc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentNo: formData.enrollmentNo,
          studentName: formData.studentName,
          currentYear: formData.currentYear,
          companyName: formData.companyName,
          companyLocation: formData.companyLocation,
          companyAddress: formData.companyAddress,
          companyWebsite: formData.companyWebsite,
          durationInDays: formData.durationInDays,
          startDate: formData.startDate,
          endDate: formData.endDate,
          recipientName: formData.recipientName,
          recipientDesignation: formData.recipientDesignation,
          applyingThrough: formData.applyingThrough,
          stipend: formData.stipend,
          offerLetterUrl: formData.offerLetterUrl,
          dynamicData,
        }),
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
        <PageHeader title="NOC Application" subtitle="No Objection Certificate" />
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[70vh]">
          <div className="bg-white rounded-2xl border border-gray-200/60 p-12 shadow-sm max-w-lg w-full text-center">
            <div className="mx-auto h-20 w-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
              <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
            <p className="text-gray-500 mb-8">Your NOC application has been submitted and is pending review.</p>
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
                    <span className="text-sm text-emerald-800 font-medium truncate max-w-[200px]">Uploaded Successfully</span>
                  </div>
                  <button type="button" onClick={() => document.getElementById(`file-${name}`)?.click()} className="text-xs text-blue-600 font-bold hover:underline">Replace File</button>
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

  return (
    <div className="min-h-screen pb-12">
      <PageHeader title="NOC Application" subtitle="No Objection Certificate" />
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          {/* Step Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
            <h2 className="text-lg font-bold">NOC Application — Step {step} of {STEPS.length}</h2>
            <p className="text-blue-100 text-sm mt-1">{STEPS[step - 1]}</p>
            <div className="mt-4 bg-white/20 rounded-full h-2">
              <div className="bg-white rounded-full h-2 transition-all duration-500" style={{ width: `${(step / STEPS.length) * 100}%` }} />
            </div>
          </div>

          <div className="flex border-b border-gray-100">
            {STEPS.map((label, i) => (
              <button key={i} disabled={i + 1 > step} onClick={() => i + 1 < step && setStep(i + 1)}
                className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${step === i+1 ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : i+1 < step ? "text-green-600 bg-green-50/30 cursor-pointer" : "text-gray-300 cursor-not-allowed"}`}>
                {i+1 < step ? "✓ " : `${i+1}. `}{label}
              </button>
            ))}
          </div>

          <div className="p-8 space-y-6">
            {submitError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{submitError}</div>}
            {Object.keys(fieldErrors).length > 0 && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">Please fix the errors below.</div>}

            {step === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Step 1 Fields: Enrollment, Name, Year, Company Info, Dates */}
                {allFields
                  .filter(f => ["enrollmentNo", "studentName", "currentYear", "companyName", "companyLocation", "durationInDays", "startDate", "endDate"].includes(f.name))
                  .map(f => (
                    <div key={f.id}>
                      {renderField(f.name, formData[f.name as keyof typeof formData], (val) => update(f.name, val), fieldErrors[f.name])}
                    </div>
                  ))
                }
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Step 2 Standard Fields */}
                  {allFields
                    .filter(f => ["companyAddress", "companyWebsite", "applyingThrough", "recipientName", "recipientDesignation", "stipend"].includes(f.name))
                    .map(f => (
                      <div key={f.id} className={f.type === "textarea" ? "col-span-1 md:col-span-2" : ""}>
                        {renderField(f.name, formData[f.name as keyof typeof formData], (val) => update(f.name, val), fieldErrors[f.name])}
                      </div>
                    ))
                  }

                  {/* Extra dynamic fields added via Form Builder */}
                  {dynamicFields.map((field) => (
                    <div key={field.id} className={field.type === "textarea" ? "col-span-1 md:col-span-2" : ""}>
                      {renderField(field.name, dynamicData[field.name], (val) => updateDynamic(field.name, val), fieldErrors[`d_${field.name}`], field.type, field.options)}
                    </div>
                  ))}
                </div>

                {/* Offer Letter / Proof */}
                {allFields.find(f => f.name === "offerLetterUrl") && (
                  <div className="col-span-1 md:col-span-2">
                    {renderField("offerLetterUrl", formData.offerLetterUrl, (val) => update("offerLetterUrl", val), fieldErrors.offerLetterUrl, "file")}
                  </div>
                )}

                {/* Declaration */}
                <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input type="checkbox" className="h-5 w-5 text-blue-600 rounded mt-0.5" checked={formData.declaration as boolean}
                      onChange={(e) => update("declaration", e.target.checked)} />
                    <span className="text-sm text-gray-700 leading-relaxed">
                      I hereby declare that all the information provided is true and correct.
                      I understand that any false information may result in rejection of this application.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t border-gray-100">
              {step > 1 ? (
                <button onClick={() => { setFieldErrors({}); setStep(1); }}
                  className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors">
                  Back
                </button>
              ) : <div />}
              {step < 2 ? (
                <button onClick={nextStep} className="ml-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                  Next Step
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={isSubmitting || !formData.declaration}
                  className="ml-auto px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
