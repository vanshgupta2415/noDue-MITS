import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const roles = await prisma.systemRole.findMany({ 
      orderBy: { label: 'asc' } 
    });
    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    console.error("Fetch Roles Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch roles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { label, value, isUniversal } = await req.json();
    if (!label || !value) {
      return NextResponse.json({ success: false, error: "Label and value are required" }, { status: 400 });
    }

    // Generate a simple ID for new entries
    const idCount = await prisma.systemRole.count();
    const id = `role_${idCount + 1}_${Date.now().toString().slice(-4)}`;

    const role = await prisma.systemRole.upsert({
      where: { value },
      update: { 
        label, 
        isUniversal: isUniversal ?? true 
      },
      create: { 
        id, 
        label, 
        value, 
        isUniversal: isUniversal ?? true 
      }
    });

    return NextResponse.json({ success: true, data: role });
  } catch (error) {
    console.error("Update Role Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update role" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const value = searchParams.get("value");

    if (!value) {
      return NextResponse.json({ success: false, error: "Value is required" }, { status: 400 });
    }

    await prisma.systemRole.delete({
      where: { value }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Role Error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete role" }, { status: 500 });
  }
}
