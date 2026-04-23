import { NextResponse, NextRequest } from "next/server";
import { getSessionWithPrisma } from "@/lib/supabase/server";
import path from "path";
import fs from "fs/promises";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * POST /api/upload
 * Accepts a multipart form upload (field name: "file", plus "category" text field).
 * Saves file to /public/uploads/{userId}/{category}/{timestamp}_{originalName}
 * Returns the public URL of the uploaded file.
 */
export async function POST(request: NextRequest) {
  try {
    // --- Auth check ---
    const user = await getSessionWithPrisma();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category is required (e.g., marksheet, bankDetails, collegeId, feeReceipts)" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size must be under 10MB" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only PDF, JPEG, PNG, and WebP files are allowed" },
        { status: 400 }
      );
    }

    // Build storage path
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const relativePath = `${user.id}/${category}/${timestamp}_${sanitizedName}`;
    const fullDir = path.join(UPLOADS_DIR, user.id, category);
    const fullPath = path.join(UPLOADS_DIR, relativePath);

    // Ensure directory exists
    await fs.mkdir(fullDir, { recursive: true });

    // Write file
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(fullPath, Buffer.from(arrayBuffer));

    // Public URL (served by Next.js static files from /public)
    const publicUrl = `/uploads/${relativePath}`;

    return NextResponse.json({
      success: true,
      data: {
        url: publicUrl,
        path: relativePath,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        category,
      },
    });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
