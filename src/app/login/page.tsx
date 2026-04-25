"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user } = useAuth();

  // Show Google auth errors from redirect
  useEffect(() => {
    const authError = searchParams.get("error");
    if (authError) {
      const messages: Record<string, string> = {
        google_auth_failed: "Google sign-in failed. Please try again.",
        no_code: "Authentication callback missing. Please try again.",
        callback_failed: "Could not complete Google sign-in. Please try again.",
        unsupported_domain: "Only .com (faculty) and .in (student) email domains are supported.",
      };
      setError(messages[authError] || "Authentication failed. Please try again.");
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "STUDENT") {
        router.push("/dashboard");
      } else {
        router.push(`/dashboard/staff/${user.role.toLowerCase()}`);
      }
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        // Save to auth context
        login({
          id: data.user.id || "",
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          status: data.user.status || "ACTIVE",
          enrollmentNo: data.user.enrollmentNo,
          department: data.user.department,
        });
        router.push(data.redirectPath);
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ─── Left Panel: College Branding ─── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-blue-800 overflow-hidden">
        {/* Background image with overlay */}
        <img
          src="./assets/mits.png"
          alt="College campus"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-linear-to-br from-blue-900/80 via-blue-800/60 to-indigo-900/80" />

        {/* Content on top of image */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top: Logo & name */}
          <div>
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <span className="text-white text-lg font-bold">ND</span>
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">noDue-MITS</h2>
                <p className="text-blue-200 text-xs">Certificate Portal</p>
              </div>
            </div>
          </div>

          {/* Center: Main tagline */}
          <div className="space-y-6">
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
              Madhav Institute of<br />
              Technology &amp; Science
            </h1>
            <p className="text-blue-200 text-lg max-w-md leading-relaxed">
              Track approvals 
              from all departments in one place: fast, transparent, and paperless.
            </p>

          </div>

          {/* Bottom: Footer */}
          <div className="flex items-center space-x-2 text-blue-300 text-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Gwalior, Madhya Pradesh, India</span>
          </div>
        </div>
      </div>

      {/* ─── Right Panel: Login Form ─── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-linear-to-br from-gray-50 via-white to-blue-50 px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile-only branding (hidden on desktop since left panel shows it) */}
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center h-14 w-14 bg-blue-600 rounded-2xl shadow-lg mb-3">
              <span className="text-white text-xl font-bold">ND</span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">noDue-MITS</h1>
            <p className="mt-1 text-gray-500 text-sm">No-Dues Certificate Portal</p>
          </div>

          {/* Login Card */}
          <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-gray-100">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-sm text-gray-500 mt-1">
                Sign in with your institute credentials
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleLogin}>
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center border border-red-100 flex items-center justify-center space-x-2">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Institute Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    required
                    className="block w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white outline-none transition-all text-gray-900"
                    placeholder="name@mitsgwl.ac.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    required
                    className="block w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white outline-none transition-all text-gray-900"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-6">
              <div className="flex items-center space-x-3">
                <span className="h-px flex-1 bg-gray-200"></span>
                <span className="text-xs text-gray-400 font-medium uppercase">Or</span>
                <span className="h-px flex-1 bg-gray-200"></span>
              </div>

              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={() => {
                  setIsGoogleLoading(true);
                  setError("");
                  window.location.href = "/api/auth/google";
                }}
                className="mt-4 flex items-center justify-center space-x-2 w-full py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGoogleLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Redirecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Sign in with Google</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            MITS Gwalior &mdash; No-Dues Certificate Portal
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}