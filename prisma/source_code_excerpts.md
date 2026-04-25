# MITS Student Portal - Source Code Excerpts

Here are several key excerpts from the project's source code, highlighting the full-stack architecture, database design, backend logic, and frontend components.

## 1. Database Schema (`prisma/schema.prisma`)
This schema defines the relational structure of the database using Prisma. It includes the user models, application models for various certificates (NOC, Bonafide), and dynamic form configurations.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model User {
  id                   String                @id @default(cuid())
  email                String                @unique
  passwordHash         String
  avatarUrl            String?
  enrollmentNo         String?               @unique
  name                 String
  department           String?
  createdAt            DateTime              @default(now())
  role                 String                @default("STUDENT")
  fatherName           String?
  passOutYear          Int?
  status               UserStatus            @default(ACTIVE)
  applications         Application[]         @relation("StudentApplications")
  bonafideApplications BonafideApplication[] @relation("StudentBonafideApplications")
  nocApplications      NocApplication[]      @relation("StudentNocApplications")
  bonafideApprovals    BonafideApplication[] @relation("HODBonafideApprovals")
  signatureUrl         String?
}

model NocApplication {
  id                   String            @id @default(cuid())
  applicationNo        String            @unique
  studentId            String
  status               ApplicationStatus @default(IN_PROGRESS)
  enrollmentNo         String?
  studentName          String?
  currentYear          String?
  companyName          String?
  companyLocation      String?
  companyAddress       String?
  companyWebsite       String?
  durationInDays       String?
  startDate            DateTime?
  endDate              DateTime?
  recipientName        String?
  recipientDesignation String?
  applyingThrough      String?
  stipend              String?
  offerLetterUrl       String?
  hodApprovalStatus    ApprovalStatus    @default(UNDER_REVIEW)
  hodRemarks           String?
  tpcApprovalStatus    ApprovalStatus    @default(UNDER_REVIEW)
  tpcRemarks           String?
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt
  dynamicData          Json?             @default("{}")
  student              User              @relation("StudentNocApplications", fields: [studentId], references: [id])

  @@index([studentId])
}

model FormTemplate {
  id        String   @id @default(cuid())
  formType  String   @unique
  schema    Json     @default("[]")
  updatedAt DateTime @updatedAt
}

enum UserStatus {
  ACTIVE
  PENDING
  REJECTED
}

enum ApplicationStatus {
  IN_PROGRESS
  SUBMITTED
  FULLY_APPROVED
  REJECTED
}

enum ApprovalStatus {
  UNDER_REVIEW
  APPROVED
  REJECTED
}
```

## 2. Authentication Route (`src/app/api/auth/login/route.ts`)
This Next.js API route handles user authentication. It uses `bcryptjs` for secure password comparison and `jose` to issue signed JWTs that are stored in HTTP-only cookies.

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }
    if (!password || typeof password !== "string") {
      return NextResponse.json({ success: false, error: "Password is required" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 });
    }

    // 2. Verify password with bcrypt
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 });
    }

    // 3. Create a signed JWT (7 day expiry)
    const token = await new SignJWT({
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

    // 4. Determine redirect path
    let redirectPath = "/dashboard";
    if (user.role === "SUPER_ADMIN") {
      redirectPath = "/dashboard/staff/super_admin";
    } else if (user.role !== "STUDENT") {
      redirectPath = `/dashboard/staff/${user.role.toLowerCase()}`;
    }

    // 5. Set httpOnly cookie and return user data
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
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
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ success: false, error: "Authentication failed" }, { status: 500 });
  }
}
```

## 3. Dynamic Form Handling (`src/app/noc/apply/page.tsx`)
This is a snippet from the frontend NOC Application page. It demonstrates dynamic form generation based on the JSON schema retrieved from the backend, handling file uploads, and tracking application steps.

```tsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";

const STEPS = ["General Details", "Company & Additional Info"];

export default function ApplyNoc() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    enrollmentNo: "",
    studentName: "",
    currentYear: "",
    companyName: "",
    // ...
  });

  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [dynamicData, setDynamicData] = useState<Record<string, any>>({});
  const [allFields, setAllFields] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user) {
      setFormData((prev) => ({
        ...prev,
        studentName: user.name || "",
        enrollmentNo: user.enrollmentNo || "",
      }));

      // Fetch dynamic schema from the database
      const loadSchema = () => {
        fetch("/api/forms/noc", { cache: "no-store" })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.data?.schema) {
              setAllFields(data.data.schema);
              const standardKeys = ["enrollmentNo","studentName", /*...*/ ];
              const extras = (data.data.schema as any[]).filter((f) => !standardKeys.includes(f.name));
              setDynamicFields(extras);
              
              const initial: Record<string, any> = {};
              extras.forEach((f: any) => { initial[f.name] = ""; });
              setDynamicData(prev => ({ ...initial, ...prev }));
            }
          })
          .catch(console.error);
      };

      loadSchema();
    }
  }, [user, loading, router]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/noc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          dynamicData, // Send dynamically generated custom fields
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Handle success
      }
    } catch {
       // Handle error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Form UI ...
}
```

## 4. Super Admin Staff Dashboard (`src/app/dashboard/staff/[role]/page.tsx`)
This excerpt shows part of the highly complex Super Admin dashboard component which uses real-time state management to handle dynamic role creation, departmental configurations, user management, and overarching platform stats.

```tsx
"use client";
import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getRoleName } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import { useSystemConfig } from "@/hooks/useSystemConfig";
export default function StaffDashboard({ params }: { params: Promise<{ role: string }> }) {
  const { role } = use(params);
  const { departments, roles, universalRoles, departmentRoles, loadingConfig, reloadConfig } = useSystemConfig();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [adminStats, setAdminStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [quickAssignEmail, setQuickAssignEmail] = useState("");
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (role === "super_admin") {
      fetchAdminStats();
    }
  }, [user, loading, role]);
  const fetchAdminStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (data.success) {
        setAdminStats(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch admin stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };
  const handleQuickAssign = async (targetRole: string, department?: string) => {
    if (!quickAssignEmail.trim()) return;
    try {
      const searchRes = await fetch(`/api/admin/users?search=${encodeURIComponent(quickAssignEmail.trim())}`);
      const searchData = await searchRes.json();
      if (searchData.success && searchData.data.length > 0) {
        const targetUser = searchData.data[0];
        await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: targetUser.id,
            role: targetRole,
            department: department || undefined,
          }),
        });
        fetchAdminStats(); // Refresh
      }
    } catch (err) {
      console.error(err);
    }
  };
  if (loading || loadingConfig) {
    return <div>Loading dashboard...</div>;
  }
  return (
    <div className="min-h-screen">
      <PageHeader title="Super Admin Panel" subtitle="Manage user roles and system administration" />
