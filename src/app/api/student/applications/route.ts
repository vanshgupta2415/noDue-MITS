import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, error: "Not authorized" },
        { status: 401 }
      );
    }

    const studentId = session.userId;

    // Fetch all application types concurrently
    const [noduesApps, nocApps, bonafideApps] = await Promise.all([
      prisma.application.findMany({
        where: { studentId },
        include: { approvals: { orderBy: { stage: "asc" } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.nocApplication.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.bonafideApplication.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Unified format mapping with explicit types
    const unified = [
      ...noduesApps.map((app: any) => ({
        id: app.id,
        applicationNo: app.applicationNo,
        type: "NODUES",
        typeLabel: "No Dues Certificate",
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        details: {
          fullName: app.fullName,
          course: app.course,
        },
        approvals: app.approvals.map((a: any) => ({
          id: a.id,
          stage: a.stage,
          department: a.department,
          status: a.status,
          remarks: a.remarks,
          actionDate: a.actionDate,
        })),
        completionPercentage: app.approvals.length > 0 
          ? Math.round((app.approvals.filter((a: any) => a.status === "APPROVED").length / app.approvals.length) * 100) 
          : 0,
      })),
      ...nocApps.map((app: any) => ({
        id: app.id,
        applicationNo: app.applicationNo,
        type: "NOC",
        typeLabel: "No Objection Certificate",
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        details: {
          companyName: app.companyName,
          duration: app.durationInDays,
        },
        approvals: [
          { stage: 1, department: "HOD", status: app.hodApprovalStatus, remarks: app.hodRemarks },
          { stage: 2, department: "Training & Placement Cell", status: app.tpcApprovalStatus, remarks: app.tpcRemarks },
        ],
        completionPercentage: (([app.hodApprovalStatus, app.tpcApprovalStatus].filter(s => s === "APPROVED").length) / 2) * 100,
      })),
      ...bonafideApps.map((app: any) => ({
        id: app.id,
        applicationNo: app.applicationNo,
        type: "BONAFIDE",
        typeLabel: "Bonafide Certificate",
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        details: {
          semester: app.semester,
          session: app.session,
        },
        approvals: [
          { stage: 1, department: "HOD", status: app.hodApprovalStatus, remarks: app.hodRemarks },
        ],
        completionPercentage: app.hodApprovalStatus === "APPROVED" ? 100 : 0,
      })),
    ];

    // Final sort by creation date
    unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, data: unified });
  } catch (error) {
    console.error("Fetch Unified Applications Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch application statuses" },
      { status: 500 }
    );
  }
}
