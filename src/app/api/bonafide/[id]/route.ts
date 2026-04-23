import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    const bonafideApplication = await (prisma as any).bonafideApplication.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            enrollmentNo: true,
            department: true,
            avatarUrl: true,
          },
        },
        hod: {
          select: {
            name: true,
            signatureUrl: true,
            department: true,
          }
        }
      },
    });

    if (!bonafideApplication) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    // Auth logic: student or specific roles
    if (session.role === "STUDENT" && bonafideApplication.studentId !== session.userId) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }
    
    if (session.role === "STUDENT" || ["HOD"].includes(session.role)) {
       return NextResponse.json({ success: true, data: bonafideApplication });
    }

    return NextResponse.json(
      { success: false, error: "Access denied" },
      { status: 403 }
    );
  } catch (error) {
    console.error("Fetch Bonafide Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch application" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, remarks, updates } = body;
    // action: "APPROVE_HOD", "REJECT_HOD", "SUPER_ADMIN_EDIT"

    const application = await (prisma as any).bonafideApplication.findUnique({ where: { id } });
    if (!application) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    if (session.role === "HOD" && (action === "APPROVE_HOD" || action === "REJECT_HOD")) {
      const status = action === "APPROVE_HOD" ? "APPROVED" : "REJECTED";
      const globalStatus = status === "REJECTED" ? "REJECTED" : "FULLY_APPROVED"; // Only HOD approval needed
      
      const updated = await (prisma as any).bonafideApplication.update({
        where: { id },
        data: {
          hodApprovalStatus: status,
          hodRemarks: remarks || null,
          status: globalStatus as any,
          hodId: action === "APPROVE_HOD" ? session.userId : undefined,
        },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: "Invalid action or permission denied" }, { status: 403 });
  } catch (error) {
    console.error("Bonafide Update Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update Bonafide application." }, { status: 500 });
  }
}
