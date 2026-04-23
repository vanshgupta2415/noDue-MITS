/**
 * server.ts — Local session helper (replaces Supabase)
 *
 * We store a signed JWT in an httpOnly cookie called "auth_token".
 * This file provides getSessionWithPrisma() so existing call-sites
 * continue to work without changes.
 */
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export interface LocalSession {
  id: string;
  name: string;
  email: string;
  role: string;
  enrollmentNo?: string | null;
  department?: string | null;
}

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Reads and verifies the auth_token cookie.
 * Returns the session payload or null if missing / invalid.
 */
export async function getSessionWithPrisma(): Promise<LocalSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());

    return {
      id: payload.userId as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as string,
      enrollmentNo: (payload.enrollmentNo as string | undefined) ?? null,
      department: (payload.department as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
}

// Keep for legacy import compatibility — not used anymore
export async function createSupabaseServerClient() {
  throw new Error("Supabase has been removed. Use getSessionWithPrisma() instead.");
}
export function createSupabaseServiceClient() {
  throw new Error("Supabase has been removed.");
}
