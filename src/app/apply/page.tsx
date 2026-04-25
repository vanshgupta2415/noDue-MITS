"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";

const STEPS = [
  "Personal Details",
  "Academic Details",
  "Hostel & Prerequisites",
  "Upload Documents",
  "Review & Submit",
];

interface FormData {
  fullName: string;
  email: string;
  fatherName: string;
  phoneNumber: string;
  address: string;
  enrollmentNo: string;
  department: string;
  passOutYear: string;
  course: string;
  cgpa: string;
  isHostelResident: string | boolean;
  hostelName: string;
  roomNumber: string;
  cautionMoneyRefund: string | boolean;
  receiptNumber: string;
  exitSurvey: string | boolean;
  feesCleared: string | boolean;
  projectCertSubmitted: string | boolean;
  feeReceipts: string;
  marksheet: string;
  bankDetails: string;
  collegeId: string;
  declaration: boolean;
}

export default function ApplyNoDues() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    fatherName: "",
    phoneNumber: "",
    address: "",
    enrollmentNo: "",
    department: "",
    passOutYear: "",
    course: "",
    cgpa: "",
    isHostelResident: false,
    hostelName: "",
    roomNumber: "",
    cautionMoneyRefund: false,
    receiptNumber: "",
    exitSurvey: false,
    feesCleared: false,
    projectCertSubmitted: false,
    feeReceipts: "",
    marksheet: "",
    bankDetails: "",
    collegeId: "",
    declaration: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [highestValidStep, setHighestValidStep] = useState(1);
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
    }
    if (!loading && user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.name || "",
        email: user.email || "",
        enrollmentNo: user.enrollmentNo || "",
        department: user.department || "",
      }));

      // Fetch extra custom fields from form builder
      const standardKeys = ["fullName","email","fatherName","phoneNumber","address","enrollmentNo","department","passOutYear","course","cgpa","isHostelResident","hostelName","roomNumber","cautionMoneyRefund","receiptNumber","exitSurvey","feesCleared","projectCertSubmitted","feeReceipts","marksheet","bankDetails","collegeId","declaration"];
      
      const loadSchema = () => {
        fetch("/api/forms/nodues", { cache: "no-store" })
          .then((r) => r.json())
          .then((data) => {
            if (data.success && Array.isArray(data.data?.schema)) {
              setAllFields(data.data.schema);
              const extras = (data.data.schema as any[]).filter((f) => !standardKeys.includes(f.name));
              setDynamicFields(extras);
              const initial: Record<string, any> = {};
              extras.forEach((f: any) => { initial[f.name] = ""; });
              setDynamicData(prev => ({ ...initial, ...prev })); // Preserve existing data if any
            }
          })
          .catch(console.error)
          .finally(() => setFetchingSchema(false));
      };

      loadSchema();

      // Real-time update: refresh schema when window is focused
      window.addEventListener("focus", loadSchema);
      return () => window.removeEventListener("focus", loadSchema);
    }
  }, [user, loading, router]);


  // File upload state
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { name: string; size: number }>>({});

  const handleFileUpload = async (
    category: string,
    field: keyof FormData,
    file: File
  ) => {
    setUploading((prev) => ({ ...prev, [category]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (data.success) {
        update(field, data.data.url);
        setUploadedFiles((prev) => ({
          ...prev,
          [category]: { name: file.name, size: file.size },
        }));
      } else {
        setFieldErrors((prev) => ({ ...prev, [field]: data.error || "Upload failed" }));
      }
    } catch {
      setFieldErrors((prev) => ({ ...prev, [field]: "Network error during upload" }));
    } finally {
      setUploading((prev) => ({ ...prev, [category]: false }));
    }
  };

  const update = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateDynamic = (field: string, value: any) => {
    setDynamicData((prev) => ({ ...prev, [field]: value }));
    const errKey = `dynamic_${field}`;
    if (fieldErrors[errKey]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[errKey];
        return next;
      });
    }
  };

  // Per-stage validation — returns errors map (empty = valid)
  const validateStep = (stepNum: number): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (stepNum === 1) {
      if (!formData.fullName.trim()) errors.fullName = "Full Name is required";
      if (!formData.email.trim()) errors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
        errors.email = "Enter a valid email address";
      if (!formData.fatherName.trim()) errors.fatherName = "Father's Name is required";
      if (!formData.phoneNumber.trim()) errors.phoneNumber = "Phone Number is required";
      else {
        const digits = formData.phoneNumber.replace(/[\s\-\+]/g, "");
        if (digits.length < 10 || !/^\d+$/.test(digits))
          errors.phoneNumber = "Enter a valid phone number (min 10 digits)";
      }
      if (!formData.address.trim()) errors.address = "Address is required";

      // Validate dynamic fields
      dynamicFields.forEach((f) => {
        if (f.required && !dynamicData[f.name]) {
          errors[`dynamic_${f.name}`] = `${f.label} is required`;
        }
      });
    }

    if (stepNum === 2) {
      if (!formData.enrollmentNo.trim()) errors.enrollmentNo = "Enrollment Number is required";
      if (!formData.department) errors.department = "Department is required";
      if (!formData.passOutYear.trim()) errors.passOutYear = "Pass Out Year is required";
      else {
        const year = Number(formData.passOutYear);
        if (year < 2000 || year > 2100) errors.passOutYear = "Year must be between 2000 and 2100";
      }
      if (!formData.course) errors.course = "Course is required";
      if (!formData.cgpa.trim()) errors.cgpa = "CGPA is required";
      else {
        const cgpa = Number(formData.cgpa);
        if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) errors.cgpa = "CGPA must be between 0 and 10";
      }
    }

    if (stepNum === 3) {
      if (formData.isHostelResident === true || formData.isHostelResident === "Yes") {
        if (!formData.hostelName?.trim()) errors.hostelName = "Hostel Name is required";
        if (!formData.roomNumber?.trim()) errors.roomNumber = "Room Number is required";
      }
      if (formData.cautionMoneyRefund === true || formData.cautionMoneyRefund === "Yes") {
        if (!formData.receiptNumber?.trim()) errors.receiptNumber = "Receipt Number is required";
      }
      if (formData.exitSurvey !== true && formData.exitSurvey !== "Yes") errors.exitSurvey = "Exit Survey must be completed";
      if (formData.feesCleared !== true && formData.feesCleared !== "Yes") errors.feesCleared = "All fees must be cleared";
      if (formData.projectCertSubmitted !== true && formData.projectCertSubmitted !== "Yes") errors.projectCertSubmitted = "Project/Internship certificate must be submitted";
    }

    // Stage 4 (documents) — URLs are optional, no hard validation
    // Stage 5 (review) — declaration checked at submit time

    return errors;
  };

  const nextStep = () => {
    const errors = validateStep(step);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return; // Block progression
    }
    setFieldErrors({});
    const next = Math.min(step + 1, 5);
    setStep(next);
    setHighestValidStep((prev) => Math.max(prev, next));
  };

  const prevStep = () => {
    setFieldErrors({});
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!formData.declaration) {
      setSubmitError("Please accept the declaration before submitting.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError("");

    try {
      // Convert string numbers to actual numbers
      const passOutYear = parseInt(formData.passOutYear, 10);
      const cgpa = parseFloat(formData.cgpa);

      if (isNaN(passOutYear) || isNaN(cgpa)) {
        setSubmitError("Invalid numeric values for Pass Out Year or CGPA");
        setIsSubmitting(false);
        return;
      }

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // DO NOT send studentId - backend gets it from session
          fullName: formData.fullName.trim(),
          fatherName: formData.fatherName.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          address: formData.address.trim(),
          passOutYear,
          course: formData.course.trim(),
          cgpa,
          isHostelResident: formData.isHostelResident,
          hostelName: formData.isHostelResident ? formData.hostelName?.trim() : null,
          roomNumber: formData.isHostelResident ? formData.roomNumber?.trim() : null,
          cautionMoneyRefund: formData.cautionMoneyRefund,
          receiptNumber: formData.cautionMoneyRefund ? formData.receiptNumber?.trim() : null,
          feeReceipts: formData.feeReceipts ? [formData.feeReceipts.trim()] : [],
          marksheet: formData.marksheet ? formData.marksheet.trim() : null,
          bankDetails: formData.bankDetails ? formData.bankDetails.trim() : null,
          collegeId: formData.collegeId ? formData.collegeId.trim() : null,
          dynamicData,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitSuccess(true);
      } else {
        // Handle specific error cases
        if (data.error && data.error.includes("not found")) {
          setSubmitError(
            "Your session has expired or is invalid. Please log in again."
          );
        } else {
          setSubmitError(data.error || "Failed to submit application");
        }
      }
    } catch (error) {
      console.error("Submission error:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Network error. Please try again."
      );
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
        <PageHeader title="Apply for No Dues" subtitle="Submit your clearance application" />
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[70vh]">
          <div className="bg-white rounded-2xl border border-gray-200/60 p-12 shadow-sm max-w-lg w-full text-center">
            <div className="mx-auto h-20 w-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
              <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
            <p className="text-gray-500 mb-8">
              Your No-Dues application has been submitted. Track your approval progress from the dashboard.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => router.push("/track")}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Track Status
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const inputClasses =
    "block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white outline-none transition-all text-gray-900";
  const inputErrorClasses =
    "block w-full px-4 py-3 bg-red-50 border border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white outline-none transition-all text-gray-900";
  const labelClasses = "block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5";
  const errorTextClasses = "text-xs text-red-600 mt-1";

  // Update highest step whenever we successfully move forward
  const handleStepClick = (targetStep: number) => {
    if (targetStep <= highestValidStep) {
      // Can go back or to any previously validated step
      setFieldErrors({});
      setStep(targetStep);
    }
    // Can't jump forward past validated steps
  };

  const renderField = (name: string, value: any, onChange: (val: any) => void, error?: string, defaultType: string = "text", defaultOptions?: string[]) => {
    const f = allFields.find(f => f.name === name);
    const type = f?.type || defaultType;
    const label = f?.label || name;
    const required = f?.required ?? true;
    const options = f?.options || defaultOptions || [];
    const ic = inputClasses;
    const iec = inputErrorClasses;
    const lc = labelClasses;
    const ec = errorTextClasses;
    return (
      <div>
        <label className={lc}>{label}{required && " *"}</label>
        {type === "select" ? (
          <select className={error ? iec : ic} value={value?.toString() || ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select Option</option>
            {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : type === "textarea" ? (
          <textarea className={error ? iec : ic} value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
        ) : type === "checkbox" ? (
          <div className="flex items-center space-x-3 py-2 text-gray-700">
            <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" checked={value === true || value === "Yes" || value === "true"} onChange={(e) => onChange(e.target.checked)} />
            <span className="text-sm">{label}</span>
          </div>
        ) : type === "file" ? (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <input 
              type="file" 
              className="hidden" 
              id={`file-${name}`}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const fd = new FormData();
                   fd.append("file", file);
                   fd.append("category", name);
                   setUploading(prev => ({ ...prev, [name]: true }));
                   const res = await fetch("/api/upload", { method: "POST", body: fd });
                   const data = await res.json();
                   if (data.success) {
                     onChange(data.url);
                   }
                   setUploading(prev => ({ ...prev, [name]: false }));
                }
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
    <div className="min-h-screen">
      <PageHeader title="Apply for No Dues" subtitle="Submit your clearance application" />

      <div className="p-6 lg:p-8">
        {/* Progress Header */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="bg-linear-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 text-white">
            <h2 className="text-lg font-bold">Apply for No-Dues Certificate</h2>
            <p className="text-blue-100 text-sm mt-1">
              Stage {step} of 5 &mdash; {STEPS[step - 1]}
            </p>
            <div className="mt-4 bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>

        {/* Step Indicators */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {STEPS.map((label, i) => {
            const stepNum = i + 1;
            const isAccessible = stepNum <= highestValidStep;
            const isCurrent = step === stepNum;
            const isCompleted = stepNum < step;

            return (
              <button
                key={i}
                onClick={() => handleStepClick(stepNum)}
                disabled={!isAccessible}
                className={`flex-1 min-w-30 px-4 py-3 text-xs font-medium text-center transition-colors ${
                  isCurrent
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                    : isCompleted
                    ? "text-green-600 bg-green-50/30 cursor-pointer"
                    : isAccessible
                    ? "text-gray-600 cursor-pointer hover:bg-gray-50"
                    : "text-gray-300 cursor-not-allowed"
                }`}
              >
                <span className="block">
                  {isCompleted ? "✓" :  stepNum}
                </span>
                <span className="hidden sm:block mt-0.5">{label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-8">
          {/* Stage 1: Personal Details */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">
                Personal Details
              </h3>
              {Object.keys(fieldErrors).length > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  Please fill in all required fields before proceeding.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {allFields
                  .filter(f => ["fullName", "email", "fatherName", "phoneNumber", "address"].includes(f.name))
                  .map(f => (
                    <div key={f.id} className={f.type === "textarea" ? "col-span-1 md:col-span-2" : ""}>
                      {renderField(f.name, formData[f.name as keyof FormData], (val) => update(f.name as keyof FormData, val), fieldErrors[f.name])}
                    </div>
                  ))
                }
              </div>

              {dynamicFields.length > 0 && (
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">Additional Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {dynamicFields.map((field) => (
                      <div key={field.id} className={field.type === "textarea" ? "col-span-1 md:col-span-2" : ""}>
                        <label className={labelClasses}>
                          {field.label} {field.required && "*"}
                        </label>
                        {field.type === "select" ? (
                          <select
                            className={fieldErrors[`dynamic_${field.name}`] ? inputErrorClasses : inputClasses}
                            value={dynamicData[field.name] || ""}
                            onChange={(e) => updateDynamic(field.name, e.target.value)}
                          >
                            <option value="">Select an option</option>
                            {field.options?.map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.type === "textarea" ? (
                          <textarea
                            className={fieldErrors[`dynamic_${field.name}`] ? inputErrorClasses : inputClasses}
                            value={dynamicData[field.name] || ""}
                            onChange={(e) => updateDynamic(field.name, e.target.value)}
                            rows={3}
                          />
                        ) : (
                          <input
                            type={field.type}
                            className={fieldErrors[`dynamic_${field.name}`] ? inputErrorClasses : inputClasses}
                            value={dynamicData[field.name] || ""}
                            onChange={(e) => updateDynamic(field.name, e.target.value)}
                          />
                        )}
                        {fieldErrors[`dynamic_${field.name}`] && (
                          <p className={errorTextClasses}>{fieldErrors[`dynamic_${field.name}`]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stage 2: Academic Details */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">
                Academic Details
              </h3>
              {Object.keys(fieldErrors).length > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  Please fill in all required fields before proceeding.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {allFields
                  .filter(f => ["enrollmentNo", "department", "course", "cgpa", "passOutYear"].includes(f.name))
                  .map(f => (
                    <div key={f.id}>
                      {renderField(f.name, formData[f.name as keyof FormData], (val) => update(f.name as keyof FormData, val), fieldErrors[f.name])}
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* Stage 3: Hostel & Caution Money & Prerequisites */}
          {step === 3 && (
            <div className="space-y-8">
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-4">Hostel / Residential Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1 md:col-span-2">
                    {renderField("isHostelResident", formData.isHostelResident, (val) => update("isHostelResident", val), fieldErrors.isHostelResident)}
                  </div>

                  {(formData.isHostelResident === true || formData.isHostelResident === "Yes") && (
                    <>
                      {allFields
                        .filter(f => ["hostelName", "roomNumber", "cautionMoneyRefund"].includes(f.name))
                        .map(f => (
                          <div key={f.id} className={f.name === "cautionMoneyRefund" ? "col-span-1 md:col-span-2" : ""}>
                            {renderField(f.name, formData[f.name as keyof FormData], (val) => update(f.name as keyof FormData, val), fieldErrors[f.name])}
                          </div>
                        ))
                      }
                    </>
                  )}
                </div>
              </div>

              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-4">Final Submission Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {allFields
                    .filter(f => {
                      const names = ["exitSurvey", "feesCleared", "projectCertSubmitted"];
                      if (formData.cautionMoneyRefund === true || formData.cautionMoneyRefund === "Yes") {
                        names.unshift("receiptNumber");
                      }
                      return names.includes(f.name);
                    })
                    .map(f => (
                      <div key={f.id}>
                        {renderField(f.name, formData[f.name as keyof FormData], (val) => update(f.name as keyof FormData, val), fieldErrors[f.name])}
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* Stage 4: Upload Documents */}
          {step === 4 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">
                Upload Documents
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">How to upload documents:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Click the <strong>&quot;Choose File&quot;</strong> button for each document section below.</li>
                  <li>A file dialog box will open — select your file (PDF, JPEG, PNG, or WebP, max 10MB).</li>
                  <li>The file will be automatically uploaded and securely stored.</li>
                  <li>A green confirmation will appear once the upload is successful.</li>
                </ol>
              </div>
              <div className="grid grid-cols-1 gap-5">
                {allFields
                  .filter(f => ["feeReceipts", "marksheet", "bankDetails", "collegeId"].includes(f.name))
                  .map(f => (
                    <div key={f.id}>
                      <p className="text-xs text-gray-400 mb-3 ml-1">Upload {f.label}</p>
                      {renderField(f.name, formData[f.name as keyof FormData], (val) => update(f.name as keyof FormData, val), fieldErrors[f.name])}
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* Stage 5: Review & Submit */}
          {step === 5 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">
                Review & Submit
              </h3>

              {/* Personal Details Review */}
              <div className="bg-gray-50 p-5 rounded-xl">
                <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">
                  Personal Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">{getLabel("fullName", "Name")}:</span> <span className="font-medium text-gray-900">{formData.fullName}</span></div>
                  <div><span className="text-gray-500">{getLabel("email", "Email")}:</span> <span className="font-medium text-gray-900">{formData.email}</span></div>
                  <div><span className="text-gray-500">{getLabel("fatherName", "Father")}:</span> <span className="font-medium text-gray-900">{formData.fatherName}</span></div>
                  <div><span className="text-gray-500">{getLabel("phoneNumber", "Phone")}:</span> <span className="font-medium text-gray-900">{formData.phoneNumber}</span></div>
                  <div className="col-span-2"><span className="text-gray-500">{getLabel("address", "Address")}:</span> <span className="font-medium text-gray-900">{formData.address}</span></div>
                </div>
              </div>

              {/* Academic Details Review */}
              <div className="bg-gray-50 p-5 rounded-xl">
                <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">
                  Academic Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">{getLabel("enrollmentNo", "Enrollment")}:</span> <span className="font-medium text-gray-900">{formData.enrollmentNo}</span></div>
                  <div><span className="text-gray-500">{getLabel("department", "Department")}:</span> <span className="font-medium text-gray-900">{formData.department}</span></div>
                  <div><span className="text-gray-500">{getLabel("course", "Course")}:</span> <span className="font-medium text-gray-900">{formData.course}</span></div>
                  <div><span className="text-gray-500">{getLabel("passOutYear", "Pass Out")}:</span> <span className="font-medium text-gray-900">{formData.passOutYear}</span></div>
                  <div><span className="text-gray-500">{getLabel("cgpa", "CGPA")}:</span> <span className="font-medium text-gray-900">{formData.cgpa}</span></div>
                </div>
              </div>

              {/* Hostel Review */}
              <div className="bg-gray-50 p-5 rounded-xl">
                <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">
                  Hostel & Caution Money
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">{getLabel("isHostelResident", "Hostel Resident")}:</span> <span className="font-medium text-gray-900">{formData.isHostelResident?.toString()}</span></div>
                  {formData.isHostelResident === "Yes" && (
                    <>
                      <div><span className="text-gray-500">{getLabel("hostelName", "Hostel")}:</span> <span className="font-medium text-gray-900">{formData.hostelName}</span></div>
                      <div><span className="text-gray-500">{getLabel("roomNumber", "Room")}:</span> <span className="font-medium text-gray-900">{formData.roomNumber}</span></div>
                    </>
                  )}
                  <div><span className="text-gray-500">{getLabel("cautionMoneyRefund", "Caution Refund")}:</span> <span className="font-medium text-gray-900">{formData.cautionMoneyRefund?.toString()}</span></div>
                </div>
              </div>

              {/* Declaration */}
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl">
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 text-blue-600 rounded mt-0.5"
                    checked={formData.declaration}
                    onChange={(e) => update("declaration", e.target.checked)}
                  />
                  <span className="text-sm text-gray-700 leading-relaxed">
                    I hereby declare that all information provided is true and correct. 
                    I understand that providing false information may result in rejection 
                    of my application and disciplinary action.
                  </span>
                </label>
              </div>

              {submitError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center border border-red-100">
                  {submitError}
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            {step < 5 ? (
              <button
                onClick={nextStep}
                className="ml-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Next Stage
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.declaration}
                className="ml-auto px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Application</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}