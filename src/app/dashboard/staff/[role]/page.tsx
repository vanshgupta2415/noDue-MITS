"use client";
import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getRoleName } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import { useSystemConfig } from "@/hooks/useSystemConfig";

// Map every role to its department name (used in the approval records) and stage number
const ROLE_TO_DEPT: Record<string, { department: string; stage: number }> = {
  faculty: { department: "Faculty", stage: 1 },
  class_coordinator: { department: "Class Coordinator", stage: 2 },
  hod: { department: "HOD", stage: 3 },
  hostel_warden: { department: "Hostel Warden", stage: 4 },
  library_admin: { department: "Library", stage: 5 },
  workshop_admin: { department: "Workshop / Lab", stage: 6 },
  tp_officer: { department: "Training & Placement Cell", stage: 7 },
  general_office: { department: "General Office", stage: 8 },
  accounts_officer: { department: "Accounts Office", stage: 9 },
};


interface SearchedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string | null;
  enrollmentNo: string | null;
  createdAt: string;
}

interface ApprovalItem {
  id: string;
  department: string;
  stage: number;
  status: string;
  application: {
    id: string;
    applicationNo: string;
    fullName: string;
    course: string;
    createdAt: string;
    currentStage: number;
  };
}

export default function StaffDashboard({ params }: { params: Promise<{ role: string }> }) {
  const { role } = use(params);
  const { departments, roles, universalRoles, departmentRoles, loadingConfig, reloadConfig } = useSystemConfig();
  const DEPT_LABEL_MAP: Record<string, string> = Object.fromEntries(departments.map(d => [d.value, d.label]));
  const DEPT_SPECIFIC_ROLES = departmentRoles.map(r => r.value);
  const ASSIGNABLE_ROLES = roles;
  const { user, loading } = useAuth();
  const router = useRouter();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  // Super Admin state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [newRole, setNewRole] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [assigning, setAssigning] = useState(false);
  // Quick role assignment via clickable blocks
  const [quickAssignRole, setQuickAssignRole] = useState<string | null>(null);
  const [quickAssignEmail, setQuickAssignEmail] = useState("");
  const [quickAssigning, setQuickAssigning] = useState(false);
  const [selectedDeptForRoles, setSelectedDeptForRoles] = useState("");
  const [adminMessage, setAdminMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [adminStats, setAdminStats] = useState<{
    totalUsers: number;
    totalStudents: number;
    totalFaculty: number;
    totalApplications: number;
    pendingApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    roleDistribution: { role: string; count: number }[];
    recentUsers: SearchedUser[];
    roleOccupants: { name: string; role: string; department: string | null }[];
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showAddRoleForm, setShowAddRoleForm] = useState(false);
  const [showAddDeptForm, setShowAddDeptForm] = useState(false);
  
  // Registration Approvals (General Office only)
  const [registrations, setRegistrations] = useState<SearchedUser[]>([]);
  const [fetchingRegistrations, setFetchingRegistrations] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const deptInfo = ROLE_TO_DEPT[role];
  const roleName = getRoleName(role.toUpperCase());

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (!loading && user && user.role === "STUDENT") {
      router.push("/dashboard");
      return;
    }
    if (deptInfo) {
      fetchPendingApprovals();
      fetchApprovalStats();
      if (role === "general_office") {
        fetchPendingRegistrations();
      }
    } else {
      // Super Admin or unknown role — no approvals to fetch
      setFetching(false);
      if (role === "super_admin") {
        fetchAdminStats();
      }
    }
  }, [user, loading, role]);

  const fetchPendingRegistrations = async () => {
    setFetchingRegistrations(true);
    try {
      const res = await fetch("/api/admin/registrations");
      const data = await res.json();
      if (data.success) {
        setRegistrations(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch registrations:", err);
    } finally {
      setFetchingRegistrations(false);
    }
  };

  const handleRegistrationAction = async (userId: string, action: "APPROVE" | "REJECT") => {
    setActionLoading(userId);
    setRegistrationMessage(null);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setRegistrationMessage({ type: "success", text: data.message });
        setRegistrations((prev) => prev.filter((u) => u.id !== userId));
      } else {
        setRegistrationMessage({ type: "error", text: data.error || "Action failed" });
      }
    } catch {
      setRegistrationMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setActionLoading(null);
    }
  };

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

  const fetchApprovalStats = async () => {
    try {
      const res = await fetch("/api/approvals/stats");
      const data = await res.json();
      if (data.success) {
        setApprovedCount(data.data.totalApproved);
        setRejectedCount(data.data.totalRejected);
      }
    } catch (err) {
      console.error("Failed to fetch approval stats:", err);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const res = await fetch(
        `/api/applications?department=${encodeURIComponent(deptInfo.department)}&stage=${deptInfo.stage}`
      );
      const data = await res.json();
      if (data.success) {
        setApprovals(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch approvals:", err);
    } finally {
      setFetching(false);
    }
  };

  const handleAction = async (approvalId: string, status: "APPROVED" | "REJECTED") => {
    setActionLoading(approvalId);
    try {
      const res = await fetch("/api/approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          status,
          remarks: remarks[approvalId] || null,
          approvedBy: user?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
        // Refresh the stats to get updated counts
        fetchApprovalStats();
      }
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || loadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-10 w-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Super Admin view
  if (role === "super_admin") {
    const handleSearch = async () => {
      if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
      setSearching(true);
      setAdminMessage(null);
      try {
        const res = await fetch(`/api/admin/users?search=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.data);
          if (data.data.length === 0) {
            setAdminMessage({ type: "error", text: "No users found matching your search." });
          }
        } else {
          setAdminMessage({ type: "error", text: data.error || "Search failed" });
        }
      } catch {
        setAdminMessage({ type: "error", text: "Failed to search users" });
      } finally {
        setSearching(false);
      }
    };

    const handleAssignRole = async () => {
      if (!selectedUser || !newRole) return;
      setAssigning(true);
      setAdminMessage(null);
      try {
        const res = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUser.id,
            role: newRole,
            department: newDepartment || undefined,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setAdminMessage({ type: "success", text: data.message });
          setSearchResults((prev) =>
            prev.map((u) =>
              u.id === selectedUser.id
                ? { ...u, role: newRole, department: newDepartment || u.department }
                : u
            )
          );
          setSelectedUser(null);
          setNewRole("");
          setNewDepartment("");
          // Refresh stats after role change
          fetchAdminStats();
        } else {
          setAdminMessage({ type: "error", text: data.error || "Failed to assign role" });
        }
      } catch {
        setAdminMessage({ type: "error", text: "Something went wrong" });
      } finally {
        setAssigning(false);
      }
    };

    const handleQuickAssign = async (targetRole: string, department?: string) => {
      if (!quickAssignEmail.trim()) return;
      setQuickAssigning(true);
      setAdminMessage(null);
      try {
        const searchRes = await fetch(`/api/admin/users?search=${encodeURIComponent(quickAssignEmail.trim())}`);
        const searchData = await searchRes.json();
        if (!searchData.success || searchData.data.length === 0) {
          setAdminMessage({ type: "error", text: "No user found with that email." });
          return;
        }
        const targetUser = searchData.data.find(
          (u: SearchedUser) => u.email.toLowerCase() === quickAssignEmail.trim().toLowerCase()
        );
        if (!targetUser) {
          setAdminMessage({ type: "error", text: "No exact email match found. Enter the full email address." });
          return;
        }
        const res = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: targetUser.id,
            role: targetRole,
            department: department || undefined,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setAdminMessage({
            type: "success",
            text: `${targetUser.name} (${targetUser.email}) assigned as ${getRoleName(targetRole)}${department ? ` — ${department}` : ""}.`,
          });
          setQuickAssignEmail("");
          setQuickAssignRole(null);
          fetchAdminStats();
        } else {
          setAdminMessage({ type: "error", text: data.error || "Failed to assign role" });
        }
      } catch {
        setAdminMessage({ type: "error", text: "Something went wrong" });
      } finally {
        setQuickAssigning(false);
      }
    };

    return (
      <div className="min-h-screen">
        <PageHeader title="Super Admin Panel" subtitle="Manage user roles and system administration" />
        <div className="p-6 lg:p-8 space-y-6">



          {/* Status Message */}
          {adminMessage && (
            <div className={`p-4 rounded-xl text-sm font-medium border flex items-center space-x-2 ${
              adminMessage.type === "success"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}>
              {adminMessage.type === "success" ? (
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
              <span>{adminMessage.text}</span>
            </div>
          )}

          {/* ─── Overview Stats ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{statsLoading ? "..." : adminStats?.totalUsers ?? 0}</p>
                  <p className="text-xs text-gray-400 font-medium">Total Users</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{statsLoading ? "..." : adminStats?.totalStudents ?? 0}</p>
                  <p className="text-xs text-gray-400 font-medium">Students</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center">
                  <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{statsLoading ? "..." : adminStats?.totalApplications ?? 0}</p>
                  <p className="text-xs text-gray-400 font-medium">Applications</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{statsLoading ? "..." : adminStats?.approvedApplications ?? 0}</p>
                  <p className="text-xs text-gray-400 font-medium">Approved</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Application Status Breakdown ─── */}
          {adminStats && (adminStats.pendingApplications > 0 || adminStats.rejectedApplications > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-yellow-50 rounded-xl flex items-center justify-center">
                    <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{adminStats.pendingApplications}</p>
                    <p className="text-xs text-gray-400 font-medium">In Progress</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{adminStats.rejectedApplications}</p>
                    <p className="text-xs text-gray-400 font-medium">Rejected</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Universal Roles ─── */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-1">Universal Roles</h3>
            <p className="text-sm text-gray-400 mb-4">Click a role to assign it to a user by email.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {universalRoles.map((r) => {
                const occupants = adminStats?.roleOccupants.filter((o) => o.role === r.value) ?? [];
                const isActive = quickAssignRole === r.value;
                return (
                  <div key={r.value} className="space-y-2">
                    <button
                      onClick={() => {
                        setQuickAssignRole(isActive ? null : r.value);
                        setQuickAssignEmail("");
                      }}
                      className={`w-full rounded-xl p-4 text-center border-2 transition-all cursor-pointer ${
                        isActive
                          ? "bg-blue-50 border-blue-400 ring-2 ring-blue-200 shadow-md"
                          : "bg-gray-50 border-transparent hover:border-gray-300 hover:shadow-sm"
                      }`}
                    >
                      {occupants.length > 0 ? (
                        <div className="space-y-0.5">
                          {occupants.map((o, i) => (
                            <p key={i} className="text-sm font-bold text-emerald-600">{o.name}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-gray-400 italic">Unassigned</p>
                      )}
                      <p className="text-xs text-gray-600 font-semibold mt-1">{r.label}</p>
                    </button>
                    {!["STUDENT", "FACULTY", "HOD", "SUPER_ADMIN", "CLASS_COORDINATOR"].includes(r.value) && (
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          if(!confirm(`Delete the role ${r.label}?`)) return;
                          const res = await fetch(`/api/system/roles?value=${r.value}`, { method: 'DELETE' });
                          if(res.ok) {
                            setAdminMessage({ type: "success", text: `Role ${r.label} deleted.` });
                            reloadConfig();
                          }
                        }}
                        className="w-full py-1 text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-tighter transition-colors"
                      >
                        Remove Role
                      </button>
                    )}
                    {isActive && (
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="user@mitsgwl.ac.in"
                          className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white outline-none transition-all text-gray-900"
                          value={quickAssignEmail}
                          onChange={(e) => setQuickAssignEmail(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleQuickAssign(r.value)}
                          autoFocus
                        />
                        <button
                          onClick={() => handleQuickAssign(r.value)}
                          disabled={quickAssigning || !quickAssignEmail.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shrink-0"
                        >
                          {quickAssigning ? "..." : "Assign"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Role Inline */}
              <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50/30">
                {!showAddRoleForm ? (
                  <button 
                    onClick={() => setShowAddRoleForm(true)}
                    className="w-full h-full flex flex-col items-center justify-center space-y-2 py-4 group hover:bg-gray-100/50 transition-colors"
                  >
                    <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Add New Role</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Create Role</p>
                      <button onClick={() => setShowAddRoleForm(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="space-y-2">
                       <input 
                        id="add-role-label" 
                        autoFocus
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm" 
                        placeholder="e.g. Finance Admin" 
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={async () => {
                            const labelInput = document.getElementById('add-role-label') as HTMLInputElement;
                            const labelV = labelInput.value;
                            if(!labelV) return;
                            const value = labelV.toUpperCase().replace(/\s+/g, '_');
                            await fetch('/api/system/roles', { 
                              method: 'POST', 
                              body: JSON.stringify({label: labelV, value, isUniversal: true})
                            });
                            labelInput.value = ''; reloadConfig(); setShowAddRoleForm(false);
                            setAdminMessage({ type: "success", text: `Role ${labelV} created.` });
                          }} 
                          className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          Save Role
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* ─── Department-Based Role Distribution ─── */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-1">Department-Based Roles</h3>
            <p className="text-sm text-gray-400 mb-4">Select a department, then assign HOD, Faculty, or Class Coordinator.</p>

            <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
              <div className="flex-1 flex gap-2 w-full">
                <select
                  value={selectedDeptForRoles}
                  onChange={(e) => {
                    setSelectedDeptForRoles(e.target.value);
                    setQuickAssignRole(null);
                    setQuickAssignEmail("");
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white outline-none transition-all text-gray-900 text-sm"
                >
                  <option value="">Select a department...</option>
                  {departments.map((dept) => (
                    <option key={dept.value} value={dept.value}>{dept.label} ({dept.value})</option>
                  ))}
                </select>
                {selectedDeptForRoles && (
                  <button 
                    onClick={async () => {
                      if(!confirm(`Remove the ${selectedDeptForRoles} department? This will NOT delete sub-roles but will remove it from the list.`)) return;
                      const res = await fetch(`/api/system/departments?value=${selectedDeptForRoles}`, { method: 'DELETE' });
                      if(res.ok) {
                        setAdminMessage({ type: "success", text: `Department ${selectedDeptForRoles} removed.` });
                        setSelectedDeptForRoles(""); reloadConfig();
                      }
                    }}
                    className="px-3 py-2 bg-white border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold transition-all shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              {/* Add Department Inline */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="h-10 w-[1px] bg-gray-200 mx-2 hidden sm:block"></div>
                {!showAddDeptForm ? (
                  <button 
                    onClick={() => setShowAddDeptForm(true)}
                    className="h-10 px-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center space-x-2 shrink-0 shadow-sm"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    <span>New Dept</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                    <input 
                      id="add-dept-label" 
                      autoFocus
                      className="flex-1 sm:w-40 px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm" 
                      placeholder="Dept Name (e.g. Physics)" 
                    />
                    <div className="flex gap-1.5">
                      <button 
                        onClick={async () => {
                          const labelInput = document.getElementById('add-dept-label') as HTMLInputElement;
                          const labelV = labelInput.value;
                          if(!labelV) return;
                          const value = labelV.toUpperCase().replace(/\s+/g, '_');
                          await fetch('/api/system/departments', { 
                            method: 'POST', 
                            body: JSON.stringify({label: labelV, value})
                          });
                          labelInput.value = ''; reloadConfig(); setShowAddDeptForm(false);
                          setAdminMessage({ type: "success", text: `Department ${labelV} added.` });
                        }} 
                        className="h-9 px-3 bg-indigo-600 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-700 transition-colors shrink-0 shadow-sm"
                      >
                        Add
                      </button>
                      <button 
                        onClick={() => setShowAddDeptForm(false)}
                        className="h-9 px-2 bg-white border border-gray-200 text-gray-400 rounded-lg hover:text-gray-600 transition-colors"
                      >
                         <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedDeptForRoles && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {departmentRoles.map((r) => {
                  const isActive = quickAssignRole === `${r.value}_DEPT`;
                  return (
                    <div key={r.value} className="space-y-2">
                      <button
                        onClick={() => {
                          setQuickAssignRole(isActive ? null : `${r.value}_DEPT`);
                          setQuickAssignEmail("");
                        }}
                        className={`w-full rounded-xl p-4 text-center border-2 transition-all cursor-pointer ${
                          isActive
                            ? "bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200 shadow-md"
                            : "bg-gray-50 border-transparent hover:border-gray-300 hover:shadow-sm"
                        }`}
                      >
                        {(() => {
                          const deptOccupants = adminStats?.roleOccupants.filter(
                            (o) => o.role === r.value && o.department === selectedDeptForRoles
                          ) ?? [];
                          return deptOccupants.length > 0 ? (
                            <div className="space-y-0.5 mb-1">
                              {deptOccupants.map((o, i) => (
                                <p key={i} className="text-sm font-bold text-emerald-600">{o.name}</p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm font-medium text-gray-400 italic mb-1">Unassigned</p>
                          );
                        })()}
                        <p className="text-sm font-bold text-gray-900">{r.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{DEPT_LABEL_MAP[selectedDeptForRoles] || selectedDeptForRoles}</p>
                      </button>
                      {isActive && (
                        <div className="flex gap-2">
                          <input
                            type="email"
                            placeholder="faculty@mitsgwl.ac.in"
                            className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white outline-none transition-all text-gray-900"
                            value={quickAssignEmail}
                            onChange={(e) => setQuickAssignEmail(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleQuickAssign(r.value, selectedDeptForRoles)}
                            autoFocus
                          />
                          <button
                            onClick={() => handleQuickAssign(r.value, selectedDeptForRoles)}
                            disabled={quickAssigning || !quickAssignEmail.trim()}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shrink-0"
                          >
                            {quickAssigning ? "..." : "Assign"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Global Restore Button at the bottom of the section */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Advanced Maintenance</h4>
                <p className="text-xs text-gray-400">Restores all original MITS departments and base system roles.</p>
              </div>
              <button 
                onClick={async () => {
                  if(!confirm("Restore all defaults? This wipes custom changes.")) return;
                  setAdminMessage({ type: "success", text: "Restoring..." });
                  const res = await fetch('/api/system/reset', { method: 'POST' });
                  if(res.ok) { setAdminMessage({ type: "success", text: "Restored!" }); reloadConfig(); }
                }}
                className="px-4 py-1.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg text-[10px] font-bold hover:bg-gray-100 transition-all uppercase tracking-tight"
              >
                Restore Defaults
              </button>
            </div>
          </div>

          {/* ─── Search & Assign Roles ─── */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Search & Assign Roles</h3>
            <p className="text-sm text-gray-400 mb-5">
              Search for a user by email or name, then assign them a specific role.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  className="block w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white outline-none transition-all text-gray-900"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || searchQuery.trim().length < 2}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shrink-0"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {/* ─── Search Results ─── */}
          {searchResults.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">
                  Search Results ({searchResults.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Role</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/80">
                    {searchResults.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-sm text-gray-900">{u.name}</p>
                          {u.enrollmentNo && (
                            <p className="text-xs text-gray-400 mt-0.5">{u.enrollmentNo}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            u.role === "STUDENT"
                              ? "bg-blue-50 text-blue-700"
                              : u.role === "FACULTY"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {getRoleName(u.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{u.department || "\u2014"}</td>
                        <td className="px-6 py-4">
                          {u.role !== "STUDENT" ? (
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setNewRole(u.role);
                                setNewDepartment(u.department || "");
                                setAdminMessage(null);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-semibold transition-colors"
                            >
                              Change Role
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Cannot change</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Recent Users ─── */}
          {adminStats && adminStats.recentUsers.length > 0 && searchResults.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">Recent Users</h3>
                <span className="text-xs text-gray-400">Last {adminStats.recentUsers.length} registered</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/80">
                    {adminStats.recentUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-sm text-gray-900">{u.name}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            u.role === "STUDENT"
                              ? "bg-blue-50 text-blue-700"
                              : u.role === "FACULTY"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {getRoleName(u.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{u.department || "\u2014"}</td>
                        <td className="px-6 py-4">
                          {u.role !== "STUDENT" ? (
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setNewRole(u.role);
                                setNewDepartment(u.department || "");
                                setAdminMessage(null);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-semibold transition-colors"
                            >
                              Change Role
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Cannot change</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Role Assignment Modal ─── */}
          {selectedUser && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Assign Role</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Change the role for <span className="font-semibold text-gray-700">{selectedUser.name}</span> ({selectedUser.email})
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                      Current Role
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200">
                      {getRoleName(selectedUser.role)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                      New Role
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => {
                        setNewRole(e.target.value);
                        // Clear department when switching to a non-dept-specific role
                        if (!DEPT_SPECIFIC_ROLES.includes(e.target.value)) {
                          setNewDepartment("");
                        }
                      }}
                      className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white outline-none transition-all text-gray-900 text-sm"
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Department — required for Faculty / Class Coordinator / HOD */}
                  {DEPT_SPECIFIC_ROLES.includes(newRole) ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white outline-none transition-all text-gray-900 text-sm"
                      >
                        <option value="">Select a department...</option>
                        {departments.map((dept) => (
                          <option key={dept.value} value={dept.value}>
                            {dept.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-400 mt-1.5">This role is department-specific. The user will only see students from this department.</p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                        Department (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CSE, ECE, ME..."
                        className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white outline-none transition-all text-gray-900 text-sm"
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setNewRole("");
                      setNewDepartment("");
                    }}
                    className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignRole}
                    disabled={assigning || !newRole || (DEPT_SPECIFIC_ROLES.includes(newRole) && !newDepartment)}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {assigning ? "Assigning..." : "Assign Role"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Info Card ─── */}
          <div className="bg-blue-50 border border-blue-200/60 rounded-2xl p-6">
            <h4 className="font-semibold text-blue-900 text-sm mb-2">How Role Assignment Works</h4>
            <ul className="text-sm text-blue-700 space-y-1.5 list-disc list-inside">
              <li>New users are automatically identified as <strong>Student</strong> or <strong>Faculty</strong> from their email.</li>
              <li><strong>Universal Roles</strong> — click a role block and enter the user&apos;s email to assign Hostel Warden, Library Admin, etc.</li>
              <li><strong>Department Roles</strong> — pick a department first, then assign HOD, Faculty, or Class Coordinator.</li>
              <li><strong>Search &amp; Assign</strong> — look up any user by name or email to view or change their current role.</li>
              <li>Role changes take effect on the user&apos;s next login.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-10 w-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader title={`${roleName} Portal`} subtitle={`${deptInfo?.department} — Stage ${deptInfo?.stage} clearance`} />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{approvals.length}</p>
                <p className="text-xs text-gray-400 font-medium">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
                <p className="text-xs text-gray-400 font-medium">Approved</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{rejectedCount}</p>
                <p className="text-xs text-gray-400 font-medium">Rejected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Digital Signature Management (HOD Only) */}
        {role === "hod" && (
          <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm p-6 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Digital Signature
                </h3>
                <p className="text-sm text-gray-500 text-left">
                  Upload your signature to automatically include it in approved Bonafide Certificates.
                </p>
              </div>

              <div className="flex items-center gap-6">
                {(user as any)?.signatureUrl ? (
                  <div className="group relative">
                    <div className="h-20 w-40 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center p-2 overflow-hidden shadow-inner">
                      <img 
                        src={(user as any).signatureUrl} 
                        alt="Current Signature" 
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                      <p className="text-[10px] text-white font-bold uppercase tracking-wider">Current Signature</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-20 w-40 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center p-2">
                    <svg className="h-6 w-6 text-gray-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center line-clamp-1">No Signature</p>
                  </div>
                )}

                <div className="shrink-0">
                  <input
                    type="file"
                    id="signature-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      // Use base64 for now in dev/demo
                      setActionLoading("uploading_sig");
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        try {
                          const res = await fetch("/api/hod/signature", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ signatureUrl: reader.result }),
                          });
                          const result = await res.json();
                          if (res.ok) {
                            window.location.reload(); 
                          } else {
                            alert(result.error || "Failed to upload signature. The image might be too large.");
                          }
                        } catch (err) {
                          console.error("Signature upload failed:", err);
                        } finally {
                          setActionLoading(null);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label
                    htmlFor="signature-upload"
                    className={`inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm cursor-pointer ${
                      actionLoading === "uploading_sig" ? "opacity-50 cursor-wait" : ""
                    }`}
                  >
                    {actionLoading === "uploading_sig" ? "Uploading..." : (user as any)?.signatureUrl ? "Update Signature" : "Upload Signature"}
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex gap-3">
              <svg className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700 leading-relaxed text-left">
                <strong>Tip for best results:</strong> Use a clear image (PNG or JPG) with a white or transparent background. Avoid shadows and ensure the signature occupies most of the frame.
              </p>
            </div>
          </div>
        )}

        {/* Registration Approvals for General Office */}
        {role === "general_office" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Registration Approvals</h2>
                <p className="text-sm text-gray-500 mt-1">Review and approve new user accounts (external emails)</p>
              </div>
              <div className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-100 flex items-center">
                <span className="h-2 w-2 bg-amber-500 rounded-full mr-2 animate-pulse" />
                {registrations.length} PENDING
              </div>
            </div>

            {registrationMessage && (
              <div className={`p-4 rounded-xl text-sm font-medium border flex items-center space-x-2 ${
                registrationMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}>
                <span>{registrationMessage.text}</span>
              </div>
            )}

            {fetchingRegistrations ? (
              <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Fetching registrations...</p>
              </div>
            ) : registrations.length === 0 ? (
              <div className="bg-gray-50/50 p-12 rounded-2xl border border-dashed border-gray-200 text-center">
                <div className="h-12 w-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-3 border border-gray-100">
                  <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">No pending registrations</p>
                <p className="text-xs text-gray-400 mt-1">All new accounts have been processed.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/80 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">User Details</th>
                        <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Registration Info</th>
                        <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/80">
                      {registrations.map((u: any) => (
                        <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-900">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="text-xs text-gray-600"><span className="font-semibold text-gray-400">Enrollment:</span> {u.enrollmentNo}</p>
                              <p className="text-xs text-gray-600"><span className="font-semibold text-gray-400">Father's Name:</span> {u.fatherName || "\u2014"}</p>
                              <p className="text-xs text-gray-600"><span className="font-semibold text-gray-400">Passout Year:</span> {u.passOutYear || "\u2014"}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-tight">
                              {DEPT_LABEL_MAP[u.department || ""] || u.department || "No Dept"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRegistrationAction(u.id, "REJECT"); }}
                                disabled={!!actionLoading}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Reject Registration"
                              >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRegistrationAction(u.id, "APPROVE"); }}
                                disabled={!!actionLoading}
                                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-200 disabled:opacity-50"
                              >
                                {actionLoading === u.id ? "Processing..." : "Approve Account"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pending Approvals */}
        {approvals.length === 0 ? (
          <div className="bg-white border border-gray-200/60 rounded-2xl p-12 text-center shadow-sm">
            <div className="mx-auto h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">All Clear!</h3>
            <p className="text-gray-400 text-sm mt-1">No pending approval requests at the moment.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Pending Requests</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Application</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/80">
                  {approvals.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                      onClick={() =>
                        router.push(`/dashboard/review/${item.application.id}`)
                      }
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-sm text-gray-900">
                          {item.application.fullName}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">
                          {item.application.applicationNo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.application.course}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(item.application.createdAt).toLocaleDateString(
                          "en-IN"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/review/${item.application.id}`);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                          </svg>
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}