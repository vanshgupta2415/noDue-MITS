"use client";
import React, { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface NocData {
  id: string;
  applicationNo: string;
  studentName: string;
  enrollmentNo: string;
  currentYear: string;
  companyName: string;
  companyLocation: string;
  companyAddress: string;
  companyWebsite: string;
  recipientName: string;
  recipientDesignation: string;
  durationInDays: string;
  startDate: string;
  endDate: string;
  applyingThrough: string;
  stipend: string;
  status: string;
  createdAt: string;
  student: {
    name: string;
    email: string;
    enrollmentNo: string;
    department: string;
  };
}

/* ── Certificate text constants (matching the .hbs template) ───── */
const CERT_CONTACT_LINE =
  "Phone: 0751-2409300, Email: registrar@mitsgwl.ac.in, Website: www.mitsgwalior.in";
const CERT_SALUTATION = "Dear Sir/Madam,";
const CERT_CLOSING_LINE1 = "We would be grateful if you could kindly consider the student.";
const CERT_CLOSING_LINE2 = "Thanking You.";
const CERT_SIGNER_TITLE = "Training & Placement Officer";
const CERT_SCAN_LABEL = "Scan QR to verify this certificate";
const CERT_CONTACT_NOTE =
  "For any queries, contact: tnp@mitsgwl.ac.in";
const CERT_FOOTER_DECLARATION =
  "This is a system-generated letter with approval from the authority. There is no need for a signature and seal on a hard copy.";

function getDegreeFromDept(department: string) {
  const deptMap: Record<string, string> = {
    CSE: "B.Tech - Computer Science & Engineering",
    EC: "B.Tech - Electronics & Communication",
    ME: "B.Tech - Mechanical Engineering",
    CE: "B.Tech - Civil Engineering",
    EE: "B.Tech - Electrical Engineering",
    IT: "B.Tech - Information Technology",
  };
  return deptMap[department] || `B.Tech - ${department}`;
}

export default function NocCertificate({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<NocData | null>(null);
  const [loading, setLoading] = useState(true);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCertificateData();
  }, [id]);

  const fetchCertificateData = async () => {
    try {
      const res = await fetch(`/api/noc/${id}`);
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
    pdf.save(`NOC_${data?.enrollmentNo || "Certificate"}.pdf`);
  };

  /* ── Loading ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
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
            Your NOC request hasn&apos;t been fully approved yet. Once both HOD and T&amp;P Officer approve, you&apos;ll be
            able to download your certificate here.
          </p>
          <button onClick={() => router.back()} className="px-6 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  /* ── Derived values ───────────────────────────────────────────── */
  const formattedDate = new Date(data.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const refNo = `MITS/TnP/${new Date(data.createdAt).getFullYear()}/${data.applicationNo}`;
  const studentDepartment = data.student?.department || "CSE";
  const degree = "B.Tech";
  const branch = studentDepartment;
  const studentName = data.studentName || data.student?.name || "";
  const enrollmentNo = data.enrollmentNo || data.student?.enrollmentNo || "";

  const certPara1 = `This is to certify that ${studentName}, bearing Enrollment No. ${enrollmentNo}, is a bonafide student of ${getDegreeFromDept(studentDepartment)}, ${data.currentYear || "IV"} Year at Madhav Institute of Technology & Science (MITS), Gwalior. The Institute has no objection to the student undergoing an internship/training at ${data.companyName}, ${data.companyLocation}.`;

  const certPara2 = `The Institute hereby grants a No Objection Certificate (NOC) for the period of ${data.durationInDays || "N/A"} days, starting from ${data.startDate ? new Date(data.startDate).toLocaleDateString("en-GB") : "N/A"} to ${data.endDate ? new Date(data.endDate).toLocaleDateString("en-GB") : "N/A"}. During this period, the student will be responsible for maintaining the decorum and discipline expected by the Institute.`;

  const signerName = "T&P Officer, MITS Gwalior";

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
          className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition shadow-md flex items-center gap-2"
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

      {/* ── Certificate (matches nocCertificate.hbs) ──────────────── */}
      <div
        ref={certificateRef}
        id="noc-certificate-content"
        style={{
          width: "794px",
          minHeight: "1123px",
          background: "#fff",
          padding: "0 50px 50px 50px",
          position: "relative",
          fontFamily: "'Times New Roman', Times, serif",
          color: "#111",
          minWidth: "794px",
        }}
      >
        {/* Header image */}
        <div style={{ width: "calc(100% + 100px)", marginLeft: "-50px", marginBottom: "18px" }}>
          <img src="/assets/image1.jpeg" alt="MITS Gwalior Header" style={{ width: "100%", display: "block" }} />
        </div>

        {/* Contact bar */}
        <div style={{ textAlign: "center", fontSize: "11.5px", marginBottom: "10px" }}>
          {CERT_CONTACT_LINE}
        </div>

        {/* Divider */}
        <hr style={{ border: "none", borderTop: "2px solid #555", marginBottom: "12px" }} />

        {/* Ref & Date */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "bold", marginBottom: "18px" }}>
          <span>Ref.: {refNo}</span>
          <span>Date: {formattedDate}</span>
        </div>

        {/* Addressee */}
        <div style={{ fontSize: "12.5px", lineHeight: 1.7, marginBottom: "16px" }}>
          To,<br />
          {data.recipientName && <>{data.recipientName}<br /></>}
          {data.recipientDesignation && <>{data.recipientDesignation}<br /></>}
          {data.companyName}<br />
          {data.companyLocation}
        </div>

        {/* Salutation */}
        <div style={{ fontSize: "12.5px", fontWeight: "bold", marginBottom: "14px" }}>
          {CERT_SALUTATION}
        </div>

        {/* Body paragraph 1 */}
        <div style={{ fontSize: "12.5px", lineHeight: 1.65, textAlign: "justify", marginBottom: "14px" }}>
          {certPara1}
        </div>

        {/* Body paragraph 2 */}
        <div style={{ fontSize: "12.5px", lineHeight: 1.65, textAlign: "justify", marginBottom: "14px" }}>
          {certPara2}
        </div>

        {/* Student Table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "24px",
            fontSize: "12.5px",
          }}
        >
          <thead>
            <tr>
              <th style={{ border: "1px solid #555", padding: "10px 14px", textAlign: "center", fontWeight: "bold" }}>S.No.</th>
              <th style={{ border: "1px solid #555", padding: "10px 14px", textAlign: "center", fontWeight: "bold" }}>Name of the Student</th>
              <th style={{ border: "1px solid #555", padding: "10px 14px", textAlign: "center", fontWeight: "bold" }}>Enrollment No.</th>
              <th style={{ border: "1px solid #555", padding: "10px 14px", textAlign: "center", fontWeight: "bold" }}>Course-branch</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #555", padding: "10px 14px", textAlign: "center" }}>1.</td>
              <td style={{ border: "1px solid #555", padding: "10px 14px", textAlign: "center" }}>{studentName}</td>
              <td style={{ border: "1px solid #555", padding: "10px 14px", textAlign: "center" }}>{enrollmentNo}</td>
              <td style={{ border: "1px solid #555", padding: "10px 14px", textAlign: "center" }}>{degree} - {branch}</td>
            </tr>
          </tbody>
        </table>

        {/* Closing */}
        <div style={{ fontSize: "12.5px", marginBottom: "6px" }}>{CERT_CLOSING_LINE1}</div>
        <br />
        <div style={{ fontSize: "12.5px", marginBottom: "6px" }}>{CERT_CLOSING_LINE2}</div>

        {/* Signature block */}
        <div style={{ marginTop: "10px", fontSize: "12.5px" }}>
          {/* Signature image placeholder – will be filled when T&P officer uploads a signature */}
          <div style={{ height: "60px", marginBottom: "2px" }} />
          <div style={{ fontWeight: "bold" }}>({signerName})</div>
          <div style={{ fontWeight: "bold" }}>{CERT_SIGNER_TITLE}</div>
        </div>

        {/* QR Section */}
        <div style={{ marginTop: "18px", fontSize: "12.5px" }}>
          <QRCodeSVG
            value={typeof window !== "undefined" ? `${window.location.origin}/noc/certificate/${data.id}` : `https://localhost:3000/noc/certificate/${data.id}`}
            size={80}
            level="H"
          />
          <div style={{ fontWeight: "bold", marginBottom: "8px", marginTop: "6px" }}>{CERT_SCAN_LABEL}</div>
          <div style={{ fontSize: "12px", marginBottom: "50px" }}>{CERT_CONTACT_NOTE}</div>
        </div>

        {/* Footer Declaration */}
        <div
          style={{
            fontStyle: "italic",
            fontSize: "11px",
            position: "absolute",
            bottom: "28px",
            left: "50px",
            right: "50px",
            whiteSpace: "nowrap",
          }}
        >
          <strong>Important Declaration:</strong> {CERT_FOOTER_DECLARATION}
        </div>
      </div>
    </div>
  );
}
