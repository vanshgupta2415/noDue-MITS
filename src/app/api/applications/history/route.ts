import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

/**
 * GET /api/applications/history
 * 
 * For STUDENTS: Returns all their applications with full approval details,
 *   including acceptance/rejection status and who processed them.
 * 
 * For STAFF/FACULTY: Returns all approvals they have processed (approved/rejected),
 *   including application details, applicant name, and decision info.
 *   Also returns summary counts.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (session.role === "STUDENT") {
      // ─── Student History: Consolidation of all application types ───
      const [noDuesApps, nocApps, bonafideApps] = await Promise.all([
        prisma.application.findMany({
          where: { studentId: session.userId },
          include: { approvals: { orderBy: { stage: "asc" } } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.nocApplication.findMany({
          where: { studentId: session.userId },
          orderBy: { createdAt: "desc" },
        }),
        (prisma as any).bonafideApplication.findMany({
          where: { studentId: session.userId },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      // Map NOC and Bonafide to a compatible structure
      const mappedNoc = nocApps.map((app: any) => ({
        id: app.id,
        type: 'NOC',
        applicationNo: app.applicationNo || 'pending...',
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        fullName: app.studentName,
        course: "Student",
        totalStages: 2, 
        approvedStages: [app.hodApprovalStatus, app.tpcApprovalStatus].filter((s: string) => s === "APPROVED").length,
        completionPercentage: ([app.hodApprovalStatus, app.tpcApprovalStatus].filter((s: string) => s === "APPROVED").length / 2) * 100,
        rejectedBy: app.status === 'REJECTED' ? {
          department: app.hodApprovalStatus === 'REJECTED' ? "HOD" : "T&P Cell",
          stage: app.hodApprovalStatus === 'REJECTED' ? 1 : 2,
          remarks: app.hodRemarks || app.tpcRemarks || "Application declined",
          actionDate: app.updatedAt,
          reviewerName: null
        } : null,
        approvals: [
         {
           id: `noc-${app.id}-hod`,
           stage: 1,
           department: "Head of Department (HOD)",
           status: app.hodApprovalStatus,
           remarks: app.hodRemarks,
           actionDate: app.updatedAt,
           reviewerName: null,
           reviewerRole: "HOD"
         },
         {
           id: `noc-${app.id}-tpc`,
           stage: 2,
           department: "Training & Placement Cell",
           status: app.tpcApprovalStatus,
           remarks: app.tpcRemarks,
           actionDate: app.updatedAt,
           reviewerName: null,
           reviewerRole: "TP"
         }
        ]
      }));

      const mappedBonafide = bonafideApps.map((app: any) => ({
        id: app.id,
        type: 'BONAFIDE',
        applicationNo: app.applicationNo || 'pending...',
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        fullName: app.studentName,
        course: "Student",
        totalStages: 1,
        approvedStages: app.hodApprovalStatus === 'APPROVED' ? 1 : 0,
        completionPercentage: app.hodApprovalStatus === 'APPROVED' ? 100 : 0,
        rejectedBy: app.status === 'REJECTED' ? {
          department: "HOD",
          stage: 1,
          remarks: app.hodRemarks || "Application declined",
          actionDate: app.updatedAt,
          reviewerName: null
        } : null,
        approvals: [
          {
            id: `bonafide-${app.id}-hod`,
            stage: 1,
            department: "Head of Department (HOD)",
            status: app.hodApprovalStatus,
            remarks: app.hodRemarks,
            actionDate: app.updatedAt,
            reviewerName: null,
            reviewerRole: "HOD"
          }
         ]
      }));

      // Map No Dues using the existing enrichment logic
      const reviewerIds = new Set<string>();
      noDuesApps.forEach((app: any) => app.approvals.forEach((a: any) => { if (a.approvedBy) reviewerIds.add(a.approvedBy); }));
      
      const reviewers = reviewerIds.size > 0
        ? await prisma.user.findMany({
            where: { id: { in: Array.from(reviewerIds) } },
            select: { id: true, name: true, role: true },
          })
        : [];
      
      const reviewerMap = Object.fromEntries(reviewers.map((r: any) => [r.id, { name: r.name, role: r.role }]));

      const enrichedNoDues = noDuesApps.map((app: any) => {
        const totalStages = app.approvals.length;
        const approvedStages = app.approvals.filter((a: any) => a.status === "APPROVED").length;
        const rejectedApproval = app.approvals.find((a: any) => a.status === "REJECTED");
        return {
          id: app.id,
          type: 'NODUES',
          applicationNo: app.applicationNo,
          status: app.status,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
          fullName: app.fullName,
          course: app.course,
          totalStages,
          approvedStages,
          completionPercentage: totalStages > 0 ? Math.round((approvedStages / totalStages) * 100) : 0,
          rejectedBy: rejectedApproval ? {
            department: rejectedApproval.department,
            stage: rejectedApproval.stage,
            remarks: rejectedApproval.remarks,
            actionDate: rejectedApproval.actionDate,
            reviewerName: rejectedApproval.approvedBy ? reviewerMap[rejectedApproval.approvedBy]?.name || "Unknown" : null,
          } : null,
          approvals: app.approvals.map((a: any) => ({
            id: a.id,
            stage: a.stage,
            department: a.department,
            status: a.status,
            remarks: a.remarks,
            actionDate: a.actionDate,
            reviewerName: a.approvedBy ? reviewerMap[a.approvedBy]?.name || "Unknown" : null,
            reviewerRole: a.approvedBy ? reviewerMap[a.approvedBy]?.role || null : null,
          })),
        };
      });

      const allApplications = [...enrichedNoDues, ...mappedNoc, ...mappedBonafide].sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return NextResponse.json({
        success: true,
        data: {
          type: "student",
          totalApplications: allApplications.length,
          accepted: allApplications.filter(a => a.status === "FULLY_APPROVED" || a.status === "APPROVED").length,
          rejected: allApplications.filter(a => a.status === "REJECTED").length,
          inProgress: allApplications.filter(a => a.status === "SUBMITTED" || a.status === "IN_PROGRESS" || a.status === "PENDING").length,
          applications: allApplications,
        },
      });
    } else {
      // ─── Staff/Reviewer History: all approvals processed by this user ───
      const processedApprovals = await prisma.approval.findMany({
        where: {
          approvedBy: session.userId,
          status: { in: ["APPROVED", "REJECTED"] },
        },
        include: {
          application: {
            select: {
              id: true,
              applicationNo: true,
              fullName: true,
              course: true,
              status: true,
              createdAt: true,
              studentId: true,
            },
          },
        },
        orderBy: { actionDate: "desc" },
      });

      const totalApproved = processedApprovals.filter((a) => a.status === "APPROVED").length;
      const totalRejected = processedApprovals.filter((a) => a.status === "REJECTED").length;

      const history = processedApprovals.map((a) => ({
        approvalId: a.id,
        stage: a.stage,
        department: a.department,
        status: a.status,
        remarks: a.remarks,
        actionDate: a.actionDate,
        application: {
          id: a.application.id,
          applicationNo: a.application.applicationNo,
          fullName: a.application.fullName,
          course: a.application.course,
          overallStatus: a.application.status,
          createdAt: a.application.createdAt,
        },
      }));

      return NextResponse.json({
        success: true,
        data: {
          type: "reviewer",
          totalProcessed: processedApprovals.length,
          totalApproved,
          totalRejected,
          history,
        },
      });
    }
  } catch (error) {
    console.error("History API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
