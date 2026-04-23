"use client";
import React, { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface BonafideData {
  id: string;
  applicationNo: string;
  studentName: string;
  enrollmentNo: string;
  fatherName: string;
  currentYear: string;
  semester: string;
  session: string;
  status: string;
  createdAt: string;
  student: {
    department: string;
  };
  hod?: {
    name: string;
    signatureUrl: string;
    department: string;
  };
}

/* ── Certificate text constants (matching the .hbs template) ───── */
const CERT_TITLE = "BONAFIDE CERTIFICATE";
const CERT_INTRO = "This is to certify that based on the records available with the Institute:";
const CERT_NAME_LABEL = "Name of the Student";
const CERT_PARENT_LABEL = "Son/Daughter of Mr.";
const CERT_COURSE_LABEL = "Programme/Branch";
const CERT_SESSION_LABEL = "Session/Year";
const CERT_SIGNER_TITLE = "Head of Department";
const CERT_SCAN_LABEL = "Scan this to verify this certificate";
const CERT_IMPORTANT_DECLARATION = "This is a system-generated letter with approval from the authority. There is no need for a signature and seal on a hard copy.";
const CERT_FOOTER_CREDIT = "This software is designed by SDC in MITS Gwalior.";

export default function BonafideCertificate({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<BonafideData | null>(null);
  const [loading, setLoading] = useState(true);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCertificateData();
  }, [id]);

  const fetchCertificateData = async () => {
    try {
      const res = await fetch(`/api/bonafide/${id}`);
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
    pdf.save(`Bonafide_${data?.enrollmentNo || "Certificate"}.pdf`);
  };

  /* ── Loading ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
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
          <p className="text-gray-500 mb-6">Your Bonafide request hasn't been fully approved yet. Once approved, you'll be able to download your certificate here.</p>
          <button onClick={() => router.back()} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition">Go Back</button>
        </div>
      </div>
    );
  }

  /* ── Derived values ───────────────────────────────────────────── */
  const formattedDate = new Date(data.createdAt).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const refNo = `BF/${new Date(data.createdAt).getFullYear().toString().slice(-2)}/${data.id.slice(-4).toUpperCase()}`;

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
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-md flex items-center gap-2"
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

      {/* ── Certificate (matches bonafideCertificate (1).hbs) ───────── */}
      <div
        ref={certificateRef}
        id="bonafide-certificate-content"
        style={{
          width: "210mm",
          height: "297mm",
          padding: "5mm 22mm 15mm 22mm",
          boxSizing: "border-box",
          position: "relative",
          fontFamily: "'Times New Roman', serif",
          backgroundColor: "#fff",
          color: "#000",
          minWidth: "210mm",
        }}
      >
        {/* HEADER */}
        <div style={{ textAlign: "center", borderBottom: "2px solid black", paddingBottom: "5px", marginBottom: "15px" }}>
          <img src="/assets/image1.jpeg" alt="MITS Header" style={{ width: "100%", height: "85px", objectFit: "contain" }} />
        </div>

        {/* TITLE */}
        <div style={{ textAlign: "center", fontSize: "22px", fontWeight: "700", margin: "10px 0 20px", padding: "15px 0", letterSpacing: "1px" }}>
          {CERT_TITLE}
        </div>

        {/* META */}
        <div style={{ display: "flex", flexDirection: "column", fontSize: "16px", marginBottom: "25px", lineHeight: "1.5" }}>
          <div><strong>Ref.: {refNo}</strong></div>
          <div><strong>Date: {formattedDate}</strong></div>
        </div>

        {/* MAIN TEXT */}
        <div style={{ fontSize: "17px", lineHeight: "1.6", textAlign: "justify", marginBottom: "30px" }}>
          {CERT_INTRO}
        </div>

        {/* DETAILS */}
        <div style={{ fontSize: "17px", lineHeight: "1.6", marginBottom: "80px" }}>
          <strong>{CERT_NAME_LABEL}</strong> : {data.studentName}<br />
          <strong>{CERT_PARENT_LABEL}</strong> : {data.fatherName}<br />
          <strong>{CERT_COURSE_LABEL}</strong> : B. Tech / {data.student?.department || "N/A"}<br />
          <strong>{CERT_SESSION_LABEL}</strong> : {data.session || "N/A"} / {data.currentYear || "N/A"}
        </div>

        {/* FOOTER AREA (Positioned absolute or at bottom flow) */}
        <div style={{ position: "absolute", bottom: "18mm", left: "22mm", right: "22mm", textAlign: "center" }}>
          
          {/* Signature on Left */}
          <div style={{ textAlign: "left", marginBottom: "20px" }}>
            {data.hod?.signatureUrl ? (
              <img src={data.hod.signatureUrl} alt="HOD Signature" style={{ height: "55px", marginBottom: "2px" }} />
            ) : (
              <div style={{ height: "55px" }} />
            )}
            <div style={{ fontSize: "15px", lineHeight: "1.4", fontWeight: "bold", textAlign: "left" }}>
              Shri {data.hod?.name || "HOD Name"}<br />
              {CERT_SIGNER_TITLE}<br />
              {data.hod?.department || data.student?.department}
            </div>
          </div>

          {/* QR Code */}
          <div style={{ textAlign: "left", marginBottom: "25px" }}>
            <QRCodeSVG 
              value={typeof window !== "undefined" ? `${window.location.origin}/bonafide/verify/${data.id}` : `https://localhost:3000/bonafide/verify/${data.id}`} 
              size={85} 
              level="H" 
            />
            <p style={{ fontSize: "12px", marginTop: "4px", marginBottom: "0", fontWeight: "normal" }}>{CERT_SCAN_LABEL}</p>
          </div>

          <div style={{ fontStyle: "italic", fontSize: "13px", marginBottom: "8px", fontWeight: "normal" }}>
            <strong>Important Declaration:</strong> {CERT_IMPORTANT_DECLARATION}
          </div>
          
          <hr style={{ border: "0", borderTop: "1px solid black", margin: "6px 0" }} />
          
          <div style={{ fontSize: "13px" }}>
            {CERT_FOOTER_CREDIT}
          </div>
        </div>
      </div>
    </div>
  );
}
