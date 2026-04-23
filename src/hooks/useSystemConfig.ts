import { useState, useEffect, useCallback } from "react";

export interface DepartmentConfig {
  value: string;
  label: string;
}

export interface RoleConfig {
  value: string;
  label: string;
  isUniversal: boolean;
}

// Institute departments — value is stored in DB, label is shown in UI
export const DEFAULT_DEPARTMENTS: DepartmentConfig[] = [
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

export const DEFAULT_ROLES: RoleConfig[] = [
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

export function useSystemConfig() {
  const [departments, setDepartments] = useState<DepartmentConfig[]>(DEFAULT_DEPARTMENTS);
  const [roles, setRoles] = useState<RoleConfig[]>(DEFAULT_ROLES);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const universalRoles = roles.filter(r => r.isUniversal && r.value !== "STUDENT" && r.value !== "SUPER_ADMIN");
  const departmentRoles = roles.filter(r => !r.isUniversal && r.value !== "STUDENT");

  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const resDepts = await fetch("/api/system/departments").catch(() => null);
      if (resDepts && resDepts.ok) {
         const data = await resDepts.json();
         if (data.success && data.data.length > 0) {
             setDepartments(data.data);
         }
      }

      const resRoles = await fetch("/api/system/roles").catch(() => null);
      if (resRoles && resRoles.ok) {
         const data = await resRoles.json();
         if (data.success && data.data.length > 0) {
             setRoles(data.data);
         }
      }
    } catch (err) {
      console.error("Failed to load config, using defaults.");
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    departments,
    roles,
    universalRoles,
    departmentRoles,
    loadingConfig,
    reloadConfig: fetchConfig,
  };
}
