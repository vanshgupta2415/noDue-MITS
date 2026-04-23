import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";

import { randomBytes } from "crypto";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

async function issueJwt(user: {
  id: string;
  email: string;
  role: string;
  status: string;
  name: string;
  enrollmentNo?: string | null;
  department?: string | null;
}) {
  return new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    name: user.name,
    enrollmentNo: user.enrollmentNo ?? undefined,
    department: user.department ?? undefined,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

/**
 * POST /api/auth/verify-institute-email
 *
 * Called after Google OAuth when a new user needs to complete their profile.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { enrollmentNo, department, instituteEmail, fullName, fatherName, passOutYear } = body;

    console.log("📝 Verify institute email request:", {
      enrollmentNo: enrollmentNo ? "***" : undefined,
      department,
      instituteEmail: instituteEmail ? "***" : undefined,
      fullName,
    });

    // --- Validate department (required for all) ---
    if (!department || typeof department !== "string" || !department.trim()) {
      return NextResponse.json(
        { success: false, error: "Department is required" },
        { status: 400 }
      );
    }

    // --- Read Google data from the pending cookie ---
    const cookieStore = await cookies();
    const pendingCookie = cookieStore.get("pending_google_auth")?.value;

    if (!pendingCookie) {
      return NextResponse.json(
        { success: false, error: "Session expired. Please sign in with Google again." },
        { status: 400 }
      );
    }

    let googleData: {
      supabaseUid: string;
      googleEmail: string;
      googleName: string;
      avatarUrl: string | null;
    };

    try {
      googleData = JSON.parse(pendingCookie);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid session data. Please try again." },
        { status: 400 }
      );
    }

    // --- Determine role and status ---
    const emailLower = googleData.googleEmail.toLowerCase().trim();
    const domain = emailLower.split("@")[1];

    let role: string;
    let status: "ACTIVE" | "PENDING" = "ACTIVE";
    let finalEmail = emailLower;
    let finalName = googleData.googleName;

    if (domain === "mitsgwl.ac.in") {
      role = "STUDENT";
    } else if (domain === "mitsgwl.com") {
      role = "FACULTY";
    } else {
      // External email
      role = "STUDENT"; // As per request, treat them as students needing approval
      status = "PENDING";
      if (fullName) finalName = fullName;
      
      // We don't require instituteEmail anymore for external users, 
      // they just fill their details and wait for approval.
    }

    // --- Validate enrollmentNo for students ---
    if (role === "STUDENT" || status === "PENDING") {
      if (!enrollmentNo || typeof enrollmentNo !== "string" || !enrollmentNo.trim()) {
        return NextResponse.json(
          { success: false, error: "Enrollment number is required" },
          { status: 400 }
        );
      }

      const existingEnrollment = await prisma.user.findUnique({
        where: { enrollmentNo: enrollmentNo.toUpperCase() },
      });
      if (existingEnrollment && existingEnrollment.id !== googleData.supabaseUid) {
        return NextResponse.json(
          { success: false, error: "This enrollment number is already registered." },
          { status: 409 }
        );
      }
    }

    // --- Check if email already exists ---
    const existingUser = await prisma.user.findUnique({ where: { email: finalEmail } });

    let savedUser;

    if (existingUser) {
      if (existingUser.id !== googleData.supabaseUid) {
        return NextResponse.json(
          { success: false, error: "This email is already registered to another account." },
          { status: 409 }
        );
      }

      // Same Google UID — update profile details
      savedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: finalName,
          avatarUrl: googleData.avatarUrl || existingUser.avatarUrl,
          department,
          enrollmentNo: enrollmentNo?.toUpperCase() || existingUser.enrollmentNo,
          fatherName: fatherName || existingUser.fatherName,
          passOutYear: passOutYear || existingUser.passOutYear,
          status: status, // Update status (e.g. if they re-submitted)
        },
      });
    } else {
      // --- Create new Google user ---
      const unusablePasswordHash =
        "$2a$12$" + randomBytes(22).toString("base64").slice(0, 31) + ".GOOGLE_OAUTH_ACCOUNT";

      savedUser = await prisma.user.create({
        data: {
          id: googleData.supabaseUid,
          email: finalEmail,
          name: finalName,
          avatarUrl: googleData.avatarUrl,
          department,
          role,
          status,
          fatherName,
          passOutYear,
          passwordHash: unusablePasswordHash,
          enrollmentNo: enrollmentNo?.toUpperCase(),
        },
      });
    }

    // --- Clean up pending cookie ---
    cookieStore.delete("pending_google_auth");

    // --- Issue JWT and return ---
    return signInAndRespond(savedUser);
  } catch (error) {
    console.error("❌ Verify institute email error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// ─── Helper: issue JWT cookie + return JSON response ──────────────────────────
async function signInAndRespond(user: any) {
  let redirectPath = "/dashboard";
  if (user.role === "STUDENT") {
    redirectPath = "/dashboard";
  } else if (user.role === "SUPER_ADMIN") {
    redirectPath = "/dashboard/staff/super_admin";
  } else {
    redirectPath = `/dashboard/staff/${user.role.toLowerCase()}`;
  }

  // If pending, middleware will handle redirection to /pending-approval
  // But we can also set it here for immediate client-side redirection
  if (user.status === "PENDING") {
    redirectPath = "/pending-approval";
  }

  const token = await issueJwt(user);

  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      enrollmentNo: user.enrollmentNo,
      department: user.department,
    },
    redirectPath,
  });

  response.cookies.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
