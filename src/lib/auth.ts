// Simple client-side auth helper using localStorage
// In production, replace with proper session/JWT management

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  enrollmentNo?: string;
  department?: string;
  signatureUrl?: string;
}

const SESSION_KEY = "nodue_user_session";

export function saveSession(user: UserSession) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
}

export function getSession(): UserSession | null {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(SESSION_KEY);
    if (data) {
      try {
        return JSON.parse(data) as UserSession;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function clearSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function isStudent(role: string) {
  return role === "STUDENT";
}

export function isSuperAdmin(role: string) {
  return role === "SUPER_ADMIN";
}

export function isStaff(role: string) {
  return role !== "STUDENT" && role !== "SUPER_ADMIN";
}

export function getRoleName(role: string): string {
  const names: Record<string, string> = {
    STUDENT: "Student",
    FACULTY: "Faculty",
    CLASS_COORDINATOR: "Class Coordinator",
    HOD: "Head of Department",
    HOSTEL_WARDEN: "Hostel Warden",
    LIBRARY_ADMIN: "Library Admin",
    WORKSHOP_ADMIN: "Workshop Admin",
    TP_OFFICER: "T&P Officer",
    GENERAL_OFFICE: "General Office",
    ACCOUNTS_OFFICER: "Accounts Officer",
    SUPER_ADMIN: "Super Admin",
  };
  return names[role] || role;
}
