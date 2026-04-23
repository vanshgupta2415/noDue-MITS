import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const depts = await prisma.systemDepartment.findMany({ 
      orderBy: { label: 'asc' } 
    });
    return NextResponse.json({ success: true, data: depts });
  } catch (error) {
    console.error("Fetch Departments Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch departments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { label, value } = await req.json();
    if (!label || !value) {
      return NextResponse.json({ success: false, error: "Label and value are required" }, { status: 400 });
    }

    // Generate a simple ID if it's a new entry
    const idCount = await prisma.systemDepartment.count();
    const id = `dept_${idCount + 1}_${Date.now().toString().slice(-4)}`;

    const dept = await prisma.systemDepartment.upsert({
      where: { value },
      update: { label },
      create: { id, label, value }
    });

    return NextResponse.json({ success: true, data: dept });
  } catch (error) {
    console.error("Update Department Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update department" }, { status: 500 });
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

    await prisma.systemDepartment.delete({
      where: { value }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Department Error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete department" }, { status: 500 });
  }
}
