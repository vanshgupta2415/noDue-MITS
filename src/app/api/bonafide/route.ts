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

      const applications = await (prisma as any).bonafideApplication.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ success: true, data: applications });
    }

    // Role-based fetching
    if (role === "HOD") {
      const pending = await (prisma as any).bonafideApplication.findMany({
        where: { 
          hodApprovalStatus: "UNDER_REVIEW",
          student: {
            department: session.department
          }
        },
        include: {
          student: {
            select: {
              name: true,
              email: true,
              department: true,
            }
          }
        },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json({ success: true, data: pending });
    }

    return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });

    return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
  } catch (error) {
    console.error("Bonafide Fetch Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch Bonafide applications" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
    }

    const body = await request.json();
    const existing = await (prisma as any).bonafideApplication.findFirst({
      where: {
        studentId: session.userId,
        status: { in: ["SUBMITTED", "IN_PROGRESS"] },
      },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: "You already have a pending Bonafide application." }, { status: 409 });
    }

    const applicationNo = `B-FIDE-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

    const bonafideApplication = await (prisma as any).bonafideApplication.create({
      data: {
        applicationNo,
        studentId: session.userId,
        enrollmentNo: body.enrollmentNo,
        studentName: body.studentName,
        fatherName: body.fatherName,
        currentYear: body.currentYear,
        semester: body.semester,
        emailAddress: body.emailAddress,
        session: body.session,
        dynamicData: body.dynamicData || {},
        status: "SUBMITTED",
      },
    });

    return NextResponse.json({ success: true, data: bonafideApplication }, { status: 201 });
  } catch (error) {
    console.error("Bonafide Submit Error:", error);
    return NextResponse.json({ success: false, error: "Failed to submit Bonafide application." }, { status: 500 });
  }
}
