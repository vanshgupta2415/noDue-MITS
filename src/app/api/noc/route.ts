import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const studentId = request.nextUrl.searchParams.get("studentId");
    const role = session.role;

    if (studentId) {
      if (role === "STUDENT" && session.userId !== studentId) {
        return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
      }

      const applications = await prisma.nocApplication.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ success: true, data: applications });
    }

    // Role-based fetching
    if (role === "HOD") {
      const pending = await prisma.nocApplication.findMany({
        where: { hodApprovalStatus: "UNDER_REVIEW" },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json({ success: true, data: pending });
    }

    if (role === "TP_OFFICER") {
      // Training & Placement Cell might only see applications approved by HOD, or all?
      // Usually, it's sequential or parallel. It's safer to just fetch their UNDER_REVIEW pending list.
      const pending = await prisma.nocApplication.findMany({
        where: { tpcApprovalStatus: "UNDER_REVIEW" },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json({ success: true, data: pending });
    }

    return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
  } catch (error) {
    console.error("NOC Fetch Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch NOC applications" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
    }

    const body = await request.json();
    const existing = await prisma.nocApplication.findFirst({
      where: {
        studentId: session.userId,
        status: { in: ["SUBMITTED", "IN_PROGRESS"] },
      },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: "You already have a pending NOC application." }, { status: 409 });
    }

    const applicationNo = `NOC-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

    const nocApplication = await prisma.nocApplication.create({
      data: {
        applicationNo,
        student: { connect: { id: session.userId } },
        enrollmentNo: body.enrollmentNo || null,
        studentName: body.studentName || null,
        currentYear: body.currentYear || null,
        companyName: body.companyName || null,
        companyLocation: body.companyLocation || null,
        companyAddress: body.companyAddress || null,
        companyWebsite: body.companyWebsite || null,
        durationInDays: body.durationInDays || null,
        startDate: (body.startDate ? new Date(body.startDate) : null) as any,
        endDate: (body.endDate ? new Date(body.endDate) : null) as any,
        recipientName: body.recipientName || null,
        recipientDesignation: body.recipientDesignation || null,
        applyingThrough: body.applyingThrough || null,
        stipend: body.stipend || null,
        offerLetterUrl: body.offerLetterUrl || null,
        dynamicData: body.dynamicData || {},
        status: "SUBMITTED",
      } as any,
    });

    return NextResponse.json({ success: true, data: nocApplication }, { status: 201 });
  } catch (error) {
    console.error("NOC Submit Error:", error);
    return NextResponse.json({ success: false, error: "Failed to submit NOC application." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { id, action, remarks, updates } = body;
    // action: "APPROVE_HOD", "REJECT_HOD", "APPROVE_TPC", "REJECT_TPC", "SUPER_ADMIN_EDIT"

    const application = await prisma.nocApplication.findUnique({ where: { id } });
    if (!application) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    if ((session.role === "SUPER_ADMIN" || session.role === "ADMIN") && action === "SUPER_ADMIN_EDIT") {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    if (session.role === "HOD" && (action === "APPROVE_HOD" || action === "REJECT_HOD")) {
      const status = action === "APPROVE_HOD" ? "APPROVED" : "REJECTED";
      const globalStatus = status === "REJECTED" ? "REJECTED" : application.tpcApprovalStatus === "APPROVED" ? "FULLY_APPROVED" : application.status;
      
      const updated = await prisma.nocApplication.update({
        where: { id },
        data: {
          hodApprovalStatus: status,
          hodRemarks: remarks || null,
          status: globalStatus,
        },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (session.role === "TP_OFFICER" && (action === "APPROVE_TPC" || action === "REJECT_TPC")) {
      const status = action === "APPROVE_TPC" ? "APPROVED" : "REJECTED";
      const globalStatus = status === "REJECTED" ? "REJECTED" : application.hodApprovalStatus === "APPROVED" ? "FULLY_APPROVED" : application.status;

      const updated = await prisma.nocApplication.update({
        where: { id },
        data: {
          tpcApprovalStatus: status,
          tpcRemarks: remarks || null,
          status: globalStatus,
        },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: "Invalid action or permission denied" }, { status: 403 });
  } catch (error) {
    console.error("NOC Update Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update NOC application." }, { status: 500 });
  }
}
