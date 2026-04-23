import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  enrollmentNo?: string;
  department?: string;
}

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Read the session from the auth_token cookie in API routes.
 * Returns a JWTPayload-compatible object or null.
 */
export async function getServerSession(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
      name: payload.name as string,
      enrollmentNo: payload.enrollmentNo as string | undefined,
      department: payload.department as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Read the session from the auth_token cookie in middleware (from a NextRequest).
 */
export async function getSessionFromRequest(request: NextRequest): Promise<JWTPayload | null> {
  try {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
      name: payload.name as string,
      enrollmentNo: payload.enrollmentNo as string | undefined,
      department: payload.department as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Alias for backward compatibility with call-sites that used getSessionWithPrisma.
 * Returns the full user record from DB to ensure freshness.
 */
export async function getSessionWithPrisma() {
  const session = await getServerSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    enrollmentNo: user.enrollmentNo,
    department: user.department,
  };
}
