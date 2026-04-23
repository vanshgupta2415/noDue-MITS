import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const DEFAULT_DEPARTMENTS = [
  { value: "CE", label: "Civil Engineering" },
  { value: "ME", label: "Mechanical Engineering" },
  { value: "EE", label: "Electrical Engineering" },
  { value: "ECE", label: "Electronics Engineering" },
  { value: "CSE", label: "Computer Science & Engineering" },
  { value: "IT", label: "Information Technology" },
  { value: "CAI", label: "Centre for Artificial Intelligence" },
  { value: "CIoT", label: "Centre for Internet of Things" },
  { value: "EMC", label: "Engineering Mathematics & Computing" },
  { value: "CCST", label: "Centre for Computer Science and Technology" },
  { value: "CH", label: "Chemical Engineering" },
  { value: "ARCH", label: "Architecture & Planning" },
  { value: "AS", label: "Applied Science" },
  { value: "HUM", label: "Humanities and Management" },
  { value: "ETCE", label: "Electronics and Telecommunications Engineering" },
  { value: "MCA", label: "MCA" },
  { value: "MBA", label: "MBA" },
  { value: "PHY", label: "Physics" },
  { value: "MATH", label: "Mathematics" },
];

const DEFAULT_ROLES = [
  { value: "STUDENT", label: "Student", isUniversal: false },
  { value: "FACULTY", label: "Faculty", isUniversal: false },
  { value: "CLASS_COORDINATOR", label: "Class Coordinator", isUniversal: false },
  { value: "HOD", label: "Head of Department", isUniversal: false },
  { value: "HOSTEL_WARDEN", label: "Hostel Warden", isUniversal: true },
  { value: "LIBRARY_ADMIN", label: "Library Admin", isUniversal: true },
  { value: "WORKSHOP_ADMIN", label: "Workshop Admin", isUniversal: true },
  { value: "TP_OFFICER", label: "T&P Officer", isUniversal: true },
  { value: "GENERAL_OFFICE", label: "General Office", isUniversal: true },
  { value: "ACCOUNTS_OFFICER", label: "Accounts Officer", isUniversal: true },
  { value: "SUPER_ADMIN", label: "System Admin", isUniversal: true },
];

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // Run in transaction to ensure atomicity
    await prisma.$transaction([
      prisma.systemDepartment.deleteMany({}),
      prisma.systemRole.deleteMany({}),
      prisma.systemDepartment.createMany({
        data: DEFAULT_DEPARTMENTS.map((d, i) => ({
          id: `dept_def_${i + 1}`,
          ...d
        }))
      }),
      prisma.systemRole.createMany({
        data: DEFAULT_ROLES.map((r, i) => ({
          id: `role_def_${i + 1}`,
          ...r
        }))
      })
    ]);

    return NextResponse.json({ success: true, message: "System configurations restored to defaults" });
  } catch (error) {
    console.error("System Reset Error:", error);
    return NextResponse.json({ success: false, error: "Failed to reset system configurations" }, { status: 500 });
  }
}
