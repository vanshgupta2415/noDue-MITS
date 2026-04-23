import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Full default schemas — single source of truth for all form types
const DEFAULT_SCHEMAS: Record<string, any[]> = {
  NOC: [
    { id: "s1",  name: "enrollmentNo",        label: "Enrollment Number",      type: "text",     required: true  },
    { id: "s2",  name: "studentName",          label: "Student Name",           type: "text",     required: true  },
    { id: "s3",  name: "currentYear",          label: "Current Year",           type: "select",   required: true, options: ["1st Year","2nd Year","3rd Year","4th Year"] },
    { id: "s4",  name: "companyName",          label: "Company Name",           type: "text",     required: true  },
    { id: "s5",  name: "companyLocation",      label: "Company Location",       type: "text",     required: true  },
    { id: "s6",  name: "durationInDays",       label: "Duration (Days)",        type: "number",   required: true  },
    { id: "s7",  name: "startDate",            label: "Start Date",             type: "date",     required: true  },
    { id: "s8",  name: "endDate",              label: "End Date",               type: "date",     required: true  },
    { id: "s9",  name: "companyAddress",       label: "Company Address",        type: "textarea", required: true  },
    { id: "s10", name: "companyWebsite",       label: "Company Website",        type: "text",     required: false },
    { id: "s11", name: "applyingThrough",      label: "Applying Through",       type: "select",   required: true, options: ["Campus Placement","Off-Campus","Internship Portal","Direct Application"] },
    { id: "s12", name: "recipientName",        label: "Recipient Name",         type: "text",     required: false },
    { id: "s13", name: "recipientDesignation", label: "Recipient Designation",  type: "text",     required: false },
    { id: "s14", name: "stipend",              label: "Stipend (if any)",       type: "text",     required: false },
    { id: "s15", name: "offerLetterUrl",       label: "Offer Letter / Proof",   type: "file",     required: false },
    { id: "s16", name: "declaration",          label: "I declare all the information is true and correct", type: "checkbox", required: true },
  ],
  BONAFIDE: [
    { id: "s1", name: "studentName",  label: "Student Name",    type: "text",   required: true  },
    { id: "s2", name: "enrollmentNo", label: "Enrollment Id",   type: "text",   required: true  },
    { id: "s3", name: "fatherName",   label: "Father's Name",   type: "text",   required: true  },
    { id: "s4", name: "currentYear",  label: "Current Year",    type: "select", required: true, options: ["1st Year","2nd Year","3rd Year","4th Year"] },
    { id: "s5", name: "semester",     label: "Semester",        type: "select", required: true, options: ["1","2","3","4","5","6","7","8"] },
    { id: "s6", name: "emailAddress", label: "Email Address",   type: "email",  required: true  },
    { id: "s7", name: "session",      label: "Session",         type: "text",   required: true  },
  ],
  NODUES: [
    // Step 1 — Personal Details
    { id: "s1",  name: "fullName",             label: "Full Name",                                      type: "text",     required: true  },
    { id: "s2",  name: "email",                label: "Email Address",                                  type: "email",    required: true  },
    { id: "s3",  name: "fatherName",           label: "Father's Name",                                  type: "text",     required: true  },
    { id: "s4",  name: "phoneNumber",          label: "Phone Number",                                   type: "text",     required: true  },
    { id: "s5",  name: "address",              label: "Permanent Address",                              type: "textarea", required: true  },
    // Step 2 — Academic Details
    { id: "s6",  name: "enrollmentNo",         label: "Enrollment Number",                              type: "text",     required: true  },
    { id: "s7",  name: "department",           label: "Department",                                     type: "select",   required: true, options: ["CSE","IT","ECE","EE","ME","CE"] },
    { id: "s8",  name: "passOutYear",          label: "Pass Out Year",                                  type: "number",   required: true  },
    { id: "s9",  name: "course",               label: "Course",                                         type: "select",   required: true, options: ["B.Tech","M.Tech","MBA","MCA","PhD"] },
    { id: "s10", name: "cgpa",                 label: "CGPA",                                           type: "number",   required: true  },
    // Step 3 — Hostel & Prerequisites
    { id: "s11", name: "isHostelResident",     label: "Are you a Hostel Resident?",                     type: "checkbox", required: false },
    { id: "s12", name: "hostelName",           label: "Hostel Name",                                    type: "text",     required: false },
    { id: "s13", name: "roomNumber",           label: "Room Number",                                    type: "text",     required: false },
    { id: "s14", name: "cautionMoneyRefund",   label: "Caution Money Refund?",                          type: "checkbox", required: false },
    { id: "s15", name: "receiptNumber",        label: "Caution Money Receipt Number",                   type: "text",     required: false },
    { id: "s16", name: "exitSurvey",           label: "Exit Survey Completed ✔",                        type: "checkbox", required: true  },
    { id: "s17", name: "feesCleared",          label: "All Fees Cleared ✔",                             type: "checkbox", required: true  },
    { id: "s18", name: "projectCertSubmitted", label: "Project / Internship Certificate Submitted ✔",   type: "checkbox", required: true  },
    // Step 4 — Upload Documents
    { id: "s19", name: "feeReceipts",          label: "Fee Receipts",                                   type: "file",     required: false },
    { id: "s20", name: "marksheet",            label: "Previous Marksheet",                             type: "file",     required: false },
    { id: "s21", name: "bankDetails",          label: "Bank Passbook / Cancelled Cheque",               type: "file",     required: false },
    { id: "s22", name: "collegeId",            label: "College ID Card",                                type: "file",     required: false },
    // Step 5 — Declaration
    { id: "s23", name: "declaration",          label: "I declare that all information provided is true and correct", type: "checkbox", required: true },
  ],
};


// GET template by type
export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await params;
    const formType = type.toUpperCase();

    // @ts-ignore - Prisma property might be missing from IDE IntelliSense despite generation
    const template = await prisma.formTemplate.findUnique({ where: { formType } });

    // If no saved template, use defaults
    const savedSchema = template?.schema as any[] | undefined;

    if (!savedSchema) {
      const defaultSchema = DEFAULT_SCHEMAS[formType] ?? [];
      return NextResponse.json({ success: true, data: { formType, schema: defaultSchema } });
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error(`Form Template Error:`, error);
    return NextResponse.json({ success: false, error: "Failed to fetch template" }, { status: 500 });
  }
}

// POST update template schema (only SUPER_ADMIN)
export async function POST(request: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
    }

    const { type } = await params;
    const formType = type.toUpperCase();
    const { schema } = await request.json();

    // @ts-ignore - Prisma property might be missing from IDE IntelliSense despite generation
    const updated = await prisma.formTemplate.upsert({
      where: { formType },
      update: { schema },
      create: { formType, schema },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error(`Form Template Update Error:`, error);
    return NextResponse.json({ success: false, error: "Failed to save template" }, { status: 500 });
  }
}
