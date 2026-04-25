import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/session";

// Map roles to the department/stage they're allowed to query
const ROLE_DEPT_MAP: Record<string, { department: string; stage: number }> = {
  FACULTY: { department: "Faculty", stage: 1 },
  CLASS_COORDINATOR: { department: "Class Coordinator", stage: 2 },
  HOD: { department: "HOD", stage: 3 },
  HOSTEL_WARDEN: { department: "Hostel Warden", stage: 4 },
  LIBRARY_ADMIN: { department: "Library", stage: 5 },
  WORKSHOP_ADMIN: { department: "Workshop / Lab", stage: 6 },
  TP_OFFICER: { department: "Training & Placement Cell", stage: 7 },
  GENERAL_OFFICE: { department: "General Office", stage: 8 },
  ACCOUNTS_OFFICER: { department: "Accounts Office", stage: 9 },
};

// GET /api/applications?studentId=xxx  — student fetches their own apps
// GET /api/applications?department=xxx&stage=N — staff fetches pending approvals
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const studentId = request.nextUrl.searchParams.get("studentId");
    const department = request.nextUrl.searchParams.get("department");
    const stage = request.nextUrl.searchParams.get("stage");

    // --- Student fetching their own applications ---
    if (studentId) {
      // Students can only fetch their own data
      if (session.role === "STUDENT" && session.userId !== studentId) {
        return NextResponse.json(
          { success: false, error: "Access denied" },
          { status: 403 }
        );
      }

      const applications = await prisma.application.findMany({
        where: { studentId },
        include: {
          approvals: { orderBy: { stage: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      });

      const enriched = applications.map((app: any) => {
        const total = app.approvals.length;
        const approved = app.approvals.filter(
          (a: any) => a.status === "APPROVED"
        ).length;
        const completionPercentage =
          total > 0 ? Math.round((approved / total) * 100) : 0;
        return { ...app, completionPercentage };
      });

      return NextResponse.json({ success: true, data: enriched });
    }

    // --- Staff fetching pending approvals for their department ---
    if (department && stage) {
      // Verify the staff member is allowed to query this department
      if (session.role === "STUDENT") {
        return NextResponse.json(
          { success: false, error: "Students cannot access staff data" },
          { status: 403 }
        );
      }

      const allowed = ROLE_DEPT_MAP[session.role];
      if (
        allowed &&
        (allowed.department !== department || allowed.stage !== Number(stage))
      ) {
        return NextResponse.json(
          { success: false, error: "Access denied for this department" },
          { status: 403 }
        );
      }

      const where: any = {
        department,
        stage: Number(stage),
        status: "UNDER_REVIEW",
      };

      // Filter by academic department for departmental roles
      if (["FACULTY", "HOD", "CLASS_COORDINATOR"].includes(session.role) && session.department) {
        where.application = {
          student: {
            department: session.department
          }
        };
      }

      const approvals = await prisma.approval.findMany({
        where,
        include: { 
          application: {
            include: {
              student: {
                select: {
                  name: true,
                  email: true,
                  department: true,
                  enrollmentNo: true
                }
              }
            }
          }
        },
        orderBy: { application: { createdAt: "asc" } },
      });

      return NextResponse.json({ success: true, data: approvals });
    }

    return NextResponse.json(
      { success: false, error: "Provide studentId or department+stage query params" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Fetch Applications Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

// --- Input validation helpers ---
function validateString(val: unknown, name: string, maxLen = 500): string | null {
  if (!val || typeof val !== "string" || val.trim().length === 0) {
    return `${name} is required`;
  }
  if (val.length > maxLen) {
    return `${name} must be ${maxLen} characters or fewer`;
  }
  return null;
}

function validatePhone(val: unknown): string | null {
  if (!val || typeof val !== "string") return "Phone number is required";
  // Allow digits, spaces, +, - (10-15 chars after stripping)
  const digits = val.replace(/[\s\-\+]/g, "");
  if (digits.length < 10 || digits.length > 15 || !/^\d+$/.test(digits)) {
    return "Invalid phone number";
  }
  return null;
}

export async function POST(request: Request) {
  try {
    // --- Auth check: only students can submit ---
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }
    if (session.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, error: "Only students can submit applications" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // --- Validate required fields ---
    const errors: string[] = [];
    const sErr = (e: string | null) => { if (e) errors.push(e); };

    sErr(validateString(body.fullName, "Full Name", 200));
    sErr(validateString(body.fatherName, "Father's Name", 200));
    sErr(validatePhone(body.phoneNumber));
    sErr(validateString(body.address, "Address", 1000));
    sErr(validateString(body.course, "Course", 100));

    // Pass out year
    const passOutYear = body.passOutYear ? Number(body.passOutYear) : NaN;
    if (isNaN(passOutYear) || passOutYear < 2000 || passOutYear > 2100) {
      errors.push("Pass Out Year must be between 2000 and 2100");
    }

    // CGPA
    const cgpaNum = body.cgpa ? Number(body.cgpa) : NaN;
    if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      errors.push("CGPA must be between 0 and 10");
    }
    const cgpa = cgpaNum;

    // Hostel fields
    const isHostelResident = Boolean(body.isHostelResident);
    if (isHostelResident) {
      sErr(validateString(body.hostelName, "Hostel Name", 200));
      sErr(validateString(body.roomNumber, "Room Number", 50));
    }

    // Caution money
    const cautionMoneyRefund = Boolean(body.cautionMoneyRefund);
    if (cautionMoneyRefund) {
      sErr(validateString(body.receiptNumber, "Receipt Number", 100));
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join("; ") },
        { status: 400 }
      );
    }

    // --- Verify user exists in database ---
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User account not found. Please log in again." },
        { status: 404 }
      );
    }

    // --- Prevent duplicate applications ---
    const existing = await prisma.application.findFirst({
      where: {
        studentId: session.userId,
        status: { in: ["SUBMITTED", "IN_PROGRESS"] },
      },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "You already have a pending application" },
        { status: 409 }
      );
    }

    // --- Create application (studentId comes from session, NOT user input) ---
    const applicationNo = `#${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

    const newApplication = await prisma.application.create({
      data: {
        applicationNo,
        studentId: session.userId, // SECURE: from JWT, not request body
        fullName: body.fullName.trim(),
        fatherName: body.fatherName.trim(),
        phoneNumber: body.phoneNumber.trim(),
        address: body.address.trim(),
        passOutYear,
        course: body.course.trim(),
        cgpa,
        isHostelResident,
        hostelName: isHostelResident ? body.hostelName?.trim() : null,
        roomNumber: isHostelResident ? body.roomNumber?.trim() : null,
        cautionMoneyRefund,
        receiptNumber: cautionMoneyRefund ? body.receiptNumber?.trim() : null,
        feeReceipts: Array.isArray(body.feeReceipts) ? body.feeReceipts : [],
        marksheet: body.marksheet || null,
        bankDetails: body.bankDetails || null,
        collegeId: body.collegeId || null,
        status: "SUBMITTED",
        currentStage: 1,
        approvals: {
          create: [
            { stage: 1, department: "Faculty" },
            { stage: 2, department: "Class Coordinator" },
            { stage: 3, department: "HOD" },
            ...(isHostelResident
              ? [{ stage: 4, department: "Hostel Warden" }]
              : []),
            { stage: 5, department: "Library" },
            { stage: 6, department: "Workshop / Lab" },
            { stage: 7, department: "Training & Placement Cell" },
            { stage: 8, department: "General Office" },
            { stage: 9, department: "Accounts Office" },
          ],
        },
      },
      include: { approvals: { orderBy: { stage: "asc" } } },
    });

    return NextResponse.json(
      { success: true, message: "Application Submitted", data: newApplication },
      { status: 201 }
    );
  } catch (error) {
    console.error("Application Submission Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to submit application: ${errorMessage}` },
      { status: 500 }
    );
  }
}