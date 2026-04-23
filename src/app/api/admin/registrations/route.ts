import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/registrations
 * 
 * Fetches all users with PENDING status.
 * Restricted to SUPER_ADMIN and GENERAL_OFFICE.
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "GENERAL_OFFICE")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const pendingUsers = await prisma.user.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: pendingUsers });
  } catch (error) {
    console.error("Fetch Registrations Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch registrations" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/registrations
 * 
 * Approves or Rejects a user registration.
 * Body: { userId: string, action: "APPROVE" | "REJECT" }
 */
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "GENERAL_OFFICE")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { userId, action } = await req.json();

    if (!userId || !action) {
      return NextResponse.json({ success: false, error: "User ID and action are required" }, { status: 400 });
    }

    if (action === "APPROVE") {
      await prisma.user.update({
        where: { id: userId },
        data: { status: "ACTIVE" },
      });
      return NextResponse.json({ success: true, message: "User registration approved successfully." });
    } else if (action === "REJECT") {
      await prisma.user.update({
        where: { id: userId },
        data: { status: "REJECTED" },
      });
      return NextResponse.json({ success: true, message: "User registration rejected." });
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Update Registration Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update registration" }, { status: 500 });
  }
}
