import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "HOD") {
      return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
    }

    const { signatureUrl } = await request.json();

    if (!signatureUrl) {
      return NextResponse.json({ success: false, error: "Signature URL is required" }, { status: 400 });
    }

    await (prisma.user as any).update({
      where: { id: session.userId },
      data: { signatureUrl },
    });

    return NextResponse.json({ success: true, message: "Signature updated successfully" });
  } catch (error) {
    console.error("HOD Signature Update Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update signature" }, { status: 500 });
  }
}
