import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

// Map roles → department they can approve
const ROLE_DEPT_MAP: Record<string, string> = {
  FACULTY: "Faculty",
  CLASS_COORDINATOR: "Class Coordinator",
  HOD: "HOD",
  HOSTEL_WARDEN: "Hostel Warden",
  LIBRARY_ADMIN: "Library",
  WORKSHOP_ADMIN: "Workshop / Lab",
  TP_OFFICER: "Training & Placement Cell",
  GENERAL_OFFICE: "General Office",
  ACCOUNTS_OFFICER: "Accounts Office",
};

export async function PATCH(request: Request) {
  try {
    // --- Auth check ---
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }
    if (session.role === "STUDENT") {
      return NextResponse.json(
        { success: false, error: "Students cannot approve" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { approvalId, status, remarks } = body;

    // --- Validate input ---
    if (!approvalId || typeof approvalId !== "string") {
      return NextResponse.json(
        { success: false, error: "approvalId is required" },
        { status: 400 }
      );
    }
    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json(
        { success: false, error: 'status must be "APPROVED" or "REJECTED"' },
        { status: 400 }
      );
    }
    
    // --- MANDATORY REMARKS: remarks must be provided and non-empty ---
    if (!remarks || typeof remarks !== "string" || remarks.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Remarks are mandatory to ${status === "APPROVED" ? "approve" : "reject"} this application. Please provide detailed reasoning for your decision.` 
        },
        { status: 400 }
      );
    }

    // --- Fetch the approval record ---
    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        application: {
          include: { approvals: { orderBy: { stage: "asc" } } },
        },
      },
    });

    if (!approval) {
      return NextResponse.json(
        { success: false, error: "Approval not found" },
        { status: 404 }
      );
    }

    // --- Authorization: staff can only approve their department ---
    const allowedDept = ROLE_DEPT_MAP[session.role];
    if (allowedDept && approval.department !== allowedDept) {
      return NextResponse.json(
        { success: false, error: "You cannot approve for this department" },
        { status: 403 }
      );
    }

    // NEW: Academic Department check for Faculty/HOD/Coordinator
    if (["FACULTY", "HOD", "CLASS_COORDINATOR"].includes(session.role) && session.department) {
      const student = await prisma.user.findUnique({
        where: { id: approval.application.studentId },
        select: { department: true }
      });
      if (student?.department !== session.department) {
        return NextResponse.json(
          { success: false, error: `You can only approve applications from the ${session.department} department.` },
          { status: 403 }
        );
      }
    }

    // --- Stage validation: this approval must be the application's current stage ---
    if (approval.stage !== approval.application.currentStage) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot action stage ${approval.stage} — application is at stage ${approval.application.currentStage}`,
        },
        { status: 409 }
      );
    }

    // --- Prevent double-action ---
    if (approval.status !== "UNDER_REVIEW") {
      return NextResponse.json(
        { success: false, error: "This approval has already been actioned" },
        { status: 409 }
      );
    }

    // 1. Update the approval record (including approvedBy from session)
    await prisma.approval.update({
      where: { id: approvalId },
      data: {
        status,
        remarks: remarks.trim(),
        approvedBy: session.userId,
        actionDate: new Date(),
      },
    });

    const application = approval.application;

    // 2. Handle stage progression
    if (status === "APPROVED") {
      // Find the next stage from the approval list (fixes hostel-skip bug)
      const currentIndex = application.approvals.findIndex(
        (a: any) => a.id === approvalId
      );
      const nextApproval = application.approvals[currentIndex + 1];

      if (nextApproval) {
        // Move to the next approval's stage (auto-skips hostel if not in list)
        await prisma.application.update({
          where: { id: application.id },
          data: { currentStage: nextApproval.stage, status: "IN_PROGRESS" },
        });
      } else {
        // All stages done — fully approved
        await prisma.application.update({
          where: { id: application.id },
          data: { status: "FULLY_APPROVED" },
        });
      }
    } else if (status === "REJECTED") {
      // Any rejection → mark entire application rejected
      await prisma.application.update({
        where: { id: application.id },
        data: { status: "REJECTED" },
      });
    }

    return NextResponse.json({ success: true, message: "Status updated" });
  } catch (error) {
    console.error("Approval Update Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update status" },
      { status: 500 }
    );
  }
}