import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

async function getSessionFromRequest(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip proxy for API routes and static files
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // 2. Check JWT session from cookie
  const user = await getSessionFromRequest(request);

  // 3. If not logged in, redirect to login
  if (!user) {
    if (pathname === "/login" || pathname === "/verify-institute-email" || pathname === "/pending-approval") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. If logged in and on /login, redirect to dashboard
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 5. If status is PENDING, redirect to /pending-approval
  if (user.status === "PENDING" && pathname !== "/pending-approval") {
    return NextResponse.redirect(new URL("/pending-approval", request.url));
  }

  // 6. If status is ACTIVE and on /pending-approval, redirect to dashboard
  if (user.status === "ACTIVE" && pathname === "/pending-approval") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/apply/:path*",
    "/track/:path*",
    "/certificate/:path*",
    "/login/:path*",
    "/verify-institute-email/:path*",
    "/pending-approval/:path*",
    "/history/:path*",
  ],
};
