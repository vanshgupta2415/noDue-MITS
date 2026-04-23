import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

// GET all templates
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });

    // @ts-ignore - Prisma property might be missing from IDE IntelliSense despite generation
    const templates = await prisma.formTemplate.findMany();
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error("Form Template Fetch Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch forms" }, { status: 500 });
  }
}
