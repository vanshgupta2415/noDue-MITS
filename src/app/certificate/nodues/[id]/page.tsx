"use client";
import React, { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ApprovalData {
  id: string;
  stage: number;
  department: string;
  status: string;
  remarks: string | null;
  actionDate: string | null;
}

interface NoDuesData {
  id: string;
  applicationNo: string;
  fullName: string;
  fatherName: string;
  course: string;
  passOutYear: number;
  status: string;
  createdAt: string;
  student: {
    name: string;
    email: string;
    enrollmentNo: string;
    department: string;
  };
  approvals: ApprovalData[];
}

export default function NoDuesCertificate({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<NoDuesData | null>(null);
  const [loading, setLoading] = useState(true);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCertificateData();
  }, [id]);

  const fetchCertificateData = async () => {
    try {
      const res = await fetch(`/api/applications/${id}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        alert("Failed to load certificate data");
      }
    } catch (error) {
      console.error("Error fetching certificate:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    const element = certificateRef.current;
    const canvas = await html2canvas(element, {
      scale: 4,
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight, undefined, "NONE");
    pdf.save(`NoDues_${data?.student?.enrollmentNo || "Certificate"}.pdf`);
  };

  /* ── Loading ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  /* ── Not ready ────────────────────────────────────────────────── */
  if (!data || data.status !== "FULLY_APPROVED") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md">
          <svg className="h-16 w-16 text-amber-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Certificate Not Ready</h1>
          <p className="text-gray-500 mb-6">
            Your No-Dues clearance hasn&apos;t been fully approved by all departments yet.
            Once every department clears your dues, you&apos;ll be able to download your certificate here.
          </p>
          <button onClick={() => router.back()} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  /* ── Derived values ───────────────────────────────────────────── */
  const studentName = data.fullName || data.student?.name || "";
  const enrollmentNo = data.student?.enrollmentNo || "";
  const department = data.student?.department || "";
  const degree = data.course || "B.Tech";
  const academicYear = `${data.passOutYear - 1}–${data.passOutYear}`;

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-neutral-100 py-10 px-4 print:p-0 print:bg-white flex flex-col items-center">
      {/* Action bar */}
      <div className="mb-8 flex gap-4 print:hidden">
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50 transition shadow-sm flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </button>
        <button
          onClick={handleDownloadPDF}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition shadow-md flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Download PDF
        </button>
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition shadow-md flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Print
        </button>
      </div>

      {/* ── Certificate (matches noDuesCertificate.hbs) ────────────── */}
      <div
        ref={certificateRef}
        id="nodues-certificate-content"
        style={{
          width: "794px",
          minHeight: "1123px",
          background: "#fff",
          fontFamily: "'Inter', sans-serif",
          color: "#1e293b",
          padding: "40px",
          minWidth: "794px",
          position: "relative",
        }}
      >
        {/* Double border frame */}
        <div
          style={{
            border: "15px double #1e293b",
            padding: "40px",
            position: "relative",
            minHeight: "1043px",
          }}
        >
          {/* Logo top-right */}
          <img
            src="/assets/image1.jpeg"
            alt="MITS Logo"
            style={{
              position: "absolute",
              top: "40px",
              right: "40px",
              width: "100px",
            }}
          />

          {/* Watermark */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-45deg)",
              fontSize: "120px",
              color: "rgba(30, 58, 138, 0.03)",
              fontWeight: 900,
              zIndex: 0,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            MITS GWALIOR
          </div>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "50px", position: "relative", zIndex: 1 }}>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 800,
                margin: 0,
                textTransform: "uppercase",
                color: "#1e3a8a",
              }}
            >
              Madhav Institute of Technology &amp; Science
            </h1>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 600,
                margin: "5px 0",
                color: "#475569",
              }}
            >
              (A Govt. Aided UGC Autonomous &amp; NAAC Accredited Institute)
            </h2>
            <p style={{ fontSize: "12px", margin: "2px 0" }}>
              Race Course Road, Gwalior, Madhya Pradesh - 474005
            </p>
            <p style={{ fontSize: "12px", margin: "2px 0" }}>
              Tel: 0751-2409397 | Fax: 0751-2664684 | Web: mitsgwl.ac.in
            </p>
          </div>

          {/* Title */}
          <div
            style={{
              textAlign: "center",
              margin: "40px 0",
              borderBottom: "2px solid #1e3a8a",
              display: "inline-block",
              paddingBottom: "10px",
              width: "100%",
              position: "relative",
              zIndex: 1,
            }}
          >
            <h3
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#1e3a8a",
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              No-Dues Certificate
            </h3>
          </div>

          {/* Content */}
          <div
            style={{
              fontSize: "16px",
              lineHeight: 1.8,
              margin: "40px 0",
              textAlign: "justify",
              position: "relative",
              zIndex: 1,
            }}
          >
            This is to certify that Mr./Ms.{" "}
            <span
              style={{
                fontWeight: 700,
                borderBottom: "1px dotted #94a3b8",
                padding: "0 5px",
                color: "#000",
              }}
            >
              {studentName}
            </span>
            , bearing Enrollment No./Roll No.{" "}
            <span
              style={{
                fontWeight: 700,
                borderBottom: "1px dotted #94a3b8",
                padding: "0 5px",
                color: "#000",
              }}
            >
              {enrollmentNo}
            </span>
            , a student of{" "}
            <span
              style={{
                fontWeight: 700,
                borderBottom: "1px dotted #94a3b8",
                padding: "0 5px",
                color: "#000",
              }}
            >
              {degree}
            </span>{" "}
            in the department of{" "}
            <span
              style={{
                fontWeight: 700,
                borderBottom: "1px dotted #94a3b8",
                padding: "0 5px",
                color: "#000",
              }}
            >
              {department}
            </span>
            , has successfully completed the No-Dues clearance process for the year{" "}
            <span
              style={{
                fontWeight: 700,
                borderBottom: "1px dotted #94a3b8",
                padding: "0 5px",
                color: "#000",
              }}
            >
              {academicYear}
            </span>
            .
            <br />
            <br />
            The student has no outstanding dues, liabilities, or obligations towards any department of the
            Institute, including Library, Hostels, Laboratories, Sports, and Accounts.
            <br />
            <br />
            All required documents, projects, and materials have been submitted and verified by the respective
            authorities.
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: "80px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* QR Section */}
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  padding: "5px",
                  display: "inline-block",
                }}
              >
                <QRCodeSVG
                  value={
                    typeof window !== "undefined"
                      ? `${window.location.origin}/certificate/verify/${data.id}`
                      : `https://localhost:3000/certificate/verify/${data.id}`
                  }
                  size={90}
                  level="H"
                />
              </div>
              <p
                style={{
                  fontSize: "9px",
                  marginTop: "5px",
                  color: "#94a3b8",
                  fontFamily: "monospace",
                }}
              >
                Verify: {data.applicationNo}
              </p>
            </div>

            {/* Signature */}
            <div style={{ textAlign: "center", width: "180px" }}>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  margin: "10px 0 0 0",
                  borderTop: "1px solid #1f2937",
                  paddingTop: "5px",
                }}
              >
                REGISTRAR
              </p>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>
                MITS, Gwalior
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
