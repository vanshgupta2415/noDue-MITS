import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

function issueJwt(user: {
  id: string;
  email: string;
  role: string;
  name: string;
  enrollmentNo?: string | null;
  department?: string | null;
}) {
  return new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    enrollmentNo: user.enrollmentNo ?? undefined,
    department: user.department ?? undefined,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

function setCookieAndRedirect(token: string, redirectPath: string, appUrl: string) {
  const response = NextResponse.redirect(new URL(redirectPath, appUrl));
  response.cookies.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  // Clear OAuth state cookie
  response.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });
  return response;
}

function getRedirectPath(role: string) {
  if (role === "SUPER_ADMIN") return "/dashboard/staff/super_admin";
  if (role === "STUDENT") return "/dashboard";
  return `/dashboard/staff/${role.toLowerCase()}`;
}

/**
 * GET /api/auth/callback
 * Google OAuth 2.0 callback handler.
 *
 * Flow:
 *  1. Validate the `state` param against the stored cookie (CSRF protection)
 *  2. Exchange the `code` for Google tokens
 *  3. Fetch the Google user profile
 *  4. If the user exists in DB → issue JWT and redirect to their dashboard
 *  5. If new user → store Google profile in a temp cookie and redirect to
 *     /verify-institute-email so they can complete their profile
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const appUrl = process.env.NEXTAUTH_URL || url.origin;

  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorParam = url.searchParams.get("error");

    // User denied access
    if (errorParam) {
      console.warn("Google OAuth error:", errorParam);
      return NextResponse.redirect(new URL("/login?error=google_auth_failed", appUrl));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/login?error=no_code", appUrl));
    }

    // ── CSRF validation ──────────────────────────────────────
    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state")?.value;
    if (!storedState || storedState !== state) {
      console.warn("OAuth state mismatch. Possible CSRF.");
      return NextResponse.redirect(new URL("/login?error=state_mismatch", appUrl));
    }

    // ── Exchange code for tokens ─────────────────────────────
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${appUrl}/api/auth/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error("Token exchange failed:", text);
      return NextResponse.redirect(new URL("/login?error=callback_failed", appUrl));
    }

    const tokenData = await tokenRes.json() as { access_token: string; id_token: string };

    // ── Fetch Google user profile ────────────────────────────
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      console.error("Failed to fetch Google profile");
      return NextResponse.redirect(new URL("/login?error=callback_failed", appUrl));
    }

    const googleProfile = await profileRes.json() as {
      id: string;
      email: string;
      name: string;
      picture?: string;
    };

    console.log("✅ Google profile received:", { email: googleProfile.email, id: googleProfile.id });

    // ── Determine role from email domain ─────────────────────
    const emailLower = googleProfile.email.toLowerCase().trim();
    const domain = emailLower.split("@")[1];

    let autoRole: string | null = null;
    if (domain === "mitsgwl.ac.in") autoRole = "STUDENT";
    else if (domain === "mitsgwl.com") autoRole = "FACULTY";

    // ── Check if user already exists in DB ───────────────────
    const existingUser = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (existingUser) {
      // Existing user → issue JWT and redirect
      console.log("✅ Existing user found, signing in:", existingUser.email);
      const token = await issueJwt(existingUser);
      return setCookieAndRedirect(token, getRedirectPath(existingUser.role), appUrl);
    }

    // ── New user ─────────────────────────────────────────────
    // For institute email domains, we can auto-create with a temp password.
    // The user won't need a password since they'll always use Google sign-in.
    if (autoRole && (domain === "mitsgwl.ac.in" || domain === "mitsgwl.com")) {
      // Store pending google data in a temp cookie for the profile completion step
      const pendingData = JSON.stringify({
        supabaseUid: googleProfile.id, // kept for compat with verify-institute-email route
        googleEmail: emailLower,
        googleName: googleProfile.name,
        avatarUrl: googleProfile.picture ?? null,
        autoRole,
      });

      // Pass ?type so the profile completion page knows which fields to show
      const typeParam = domain === "mitsgwl.ac.in" ? "student" : "faculty";
      const response = NextResponse.redirect(
        new URL(`/verify-institute-email?type=${typeParam}`, appUrl)
      );
      response.cookies.set("pending_google_auth", pendingData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 15, // 15 minutes
      });
      response.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });
      return response;
    }

    // External (non-institute) email → also send to profile completion
    const pendingData = JSON.stringify({
      supabaseUid: googleProfile.id,
      googleEmail: emailLower,
      googleName: googleProfile.name,
      avatarUrl: googleProfile.picture ?? null,
      autoRole: null,
    });

    const response = NextResponse.redirect(
      new URL("/verify-institute-email?type=external", appUrl)
    );
    response.cookies.set("pending_google_auth", pendingData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
    });
    response.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });
    return response;

  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(new URL("/login?error=callback_failed", appUrl));
  }
}
