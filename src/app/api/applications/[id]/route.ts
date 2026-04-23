import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // --- Auth check ---
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        approvals: {
          orderBy: { stage: "asc" },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            enrollmentNo: true,
            department: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    // --- Authorization: students can only see their own ---
    if (
      session.role === "STUDENT" &&
      application.studentId !== session.userId
    ) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Calculate completion percentage
    const totalStages = application.approvals.length;
    const approvedStages = application.approvals.filter(
      (a) => a.status === "APPROVED"
    ).length;

    const completionPercentage =
      totalStages > 0
        ? Math.round((approvedStages / totalStages) * 100)
        : 0;

    return NextResponse.json({
      success: true,
      data: { ...application, completionPercentage },
    });
  } catch (error) {
    console.error("Fetch Application Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch application details" },
      { status: 500 }
    );
  }
}