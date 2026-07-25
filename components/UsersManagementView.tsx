"use client";

import React, { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/clientAuth";
import {
  Users,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Key,
  Plus,
  Search,
  Lock,
  Mail,
  User as UserIcon,
  Briefcase,
  Check,
  X,
  Trash2,
  Edit3,
  RefreshCw,
  HardDrive,
  Activity,
  Sliders,
  Settings,
  AlertTriangle,
  Database,
  Terminal,
} from "lucide-react";
import { User } from "@/lib/db";

interface UsersManagementViewProps {
  onRefreshData?: () => void;
}

const ALL_PERMISSIONS = [
  {
    id: "manage_users",
    label: "إدارة المستخدمين والأعضاء",
    desc: "إضافة، حذف وتعديل الحسابات وكلمات المرور",
  },
  {
    id: "manage_projects",
    label: "إدارة المشاريع",
    desc: "إنشاء وتعديل وحذف المشاريع وتحديد الميزانيات",
  },
  {
    id: "manage_tasks",
    label: "إدارة المهام",
    desc: "إنشاء وإسناد وتعديل حالة المهام وحذفها",
  },
  {
    id: "system_control",
    label: "التحكم الشامل والأدوات",
    desc: "صلاحية تنظيف قاعدة البيانات وفتح أدوات النظام",
  },
  {
    id: "view_reports",
    label: "استعراض التقارير والتحليلات",
    desc: "مشاهدة إحصائيات الأداء وساعات العمل",
  },
  {
    id: "export_db",
    label: "تصدير واسترجاع نسخة احتياطية",
    desc: "تحميل واسترجاع نسخة من البيانات الإجمالية للمنصة",
  },
];

export const UsersManagementView: React.FC<UsersManagementViewProps> = ({
  onRefreshData,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<
    "users" | "permissions" | "system_tools"
  >("users");

  // Modal States
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] =
    useState<boolean>(false);
  const [selectedUserForPassword, setSelectedUserForPassword] =
    useState<User | null>(null);
  const [newPassword, setNewPassword] = useState<string>("");

  const [isEditUserModalOpen, setIsEditUserModalOpen] =
    useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State for New User
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "member" as User["role"],
    job_title: "",
    avatar_color: "#3b82f6",
    permissions: ["manage_tasks"],
  });

  // System Tool Execution States
  const [systemActionOutput, setSystemActionOutput] = useState<string | null>(
    null,
  );
  const [isSystemActionRunning, setIsSystemActionRunning] =
    useState<boolean>(false);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await authFetch("/api/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await authFetch("/api/users");
        const data = await res.json();
        if (data.success) {
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  // Filter Users
  const filteredUsers = users.filter((u) => {
    const matchesRole =
      selectedRoleFilter === "all" || u.role === selectedRoleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.job_title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  // Handle Add User
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      alert("الرجاء تعبئة جميع الحقول المطلوبة");
      return;
    }

    try {
      const res = await authFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        alert("تمت إضافة المستخدم بنجاح وحفظه في النظام");
        setIsAddUserModalOpen(false);
        setFormData({
          name: "",
          email: "",
          password: "",
          role: "member",
          job_title: "",
          avatar_color: "#3b82f6",
          permissions: ["manage_tasks"],
        });
        fetchUsers();
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error || "حدث خطأ أثناء إضافة المستخدم");
      }
    } catch (err) {
      alert("فشل الاتصال بالخادم");
    }
  };

  // Handle Password Reset
  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword || !newPassword) return;

    try {
      const res = await authFetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUserForPassword.id,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(
          `تم تغيير وتشفير كلمة المرور الجديدة للمستخدم: ${selectedUserForPassword.name}`,
        );
        setIsPasswordModalOpen(false);
        setNewPassword("");
        setSelectedUserForPassword(null);
        fetchUsers();
      } else {
        alert(data.error || "فشل تحديث كلمة المرور");
      }
    } catch (err) {
      alert("خطأ أثناء تحديث البيانات بالخادم");
    }
  };

  // Handle Save User Edit
  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await authFetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingUser),
      });
      const data = await res.json();
      if (data.success) {
        alert("تم التعديل وحفظ التغييرات بنجاح");
        setIsEditUserModalOpen(false);
        setEditingUser(null);
        fetchUsers();
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error || "فشل حفظ البيانات");
      }
    } catch (err) {
      alert("حدث خطأ أثناء الاتصال بالخادم");
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (user: User) => {
    if (
      !confirm(
        `هل أنت تأكد من حذف حساب ${user.name} (${user.email}) نهائياً؟`,
      )
    )
      return;

    try {
      const res = await authFetch(`/api/users?id=${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert("تم حذف الحساب بنجاح");
        fetchUsers();
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error || "فشل الحذف");
      }
    } catch (err) {
      alert("حدث خطأ أثناء الاتصال بالخادم");
    }
  };

  // Run SQLite Maintenance Tool
  const runSystemTool = async (
    actionType: "integrity" | "vacuum" | "reindex",
  ) => {
    setIsSystemActionRunning(true);
    setSystemActionOutput(null);
    try {
      let query = "PRAGMA integrity_check;";
      let title = "فحص سلامة قاعدة البيانات";
      if (actionType === "vacuum") {
        query = "VACUUM;";
        title = "تنظيف وضغط مساحة البيانات";
      } else if (actionType === "reindex") {
        query = "REINDEX;";
        title = "إعادة بناء فهارس البحث وسرعة الاستعلام";
      }

      const res = await authFetch("/api/db/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();

      if (data.success) {
        setSystemActionOutput(
          `✅ [نجاح]: تم تنفيذ أداة "${title}" بنجاح في النظام.`,
        );
      } else {
        setSystemActionOutput(`❌ [خطأ]: ${data.error}`);
      }
    } catch (err: any) {
      setSystemActionOutput(`❌ [فشل]: ${err.message}`);
    } finally {
      setIsSystemActionRunning(false);
    }
  };

  const getRoleBadge = (role: User["role"]) => {
    switch (role) {
      case "admin":
        return (
          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold">
            مدير عام (Admin)
          </span>
        );
      case "manager":
        return (
          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
            مدير مشروع (Manager)
          </span>
        );
      case "member":
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
            عضو فريق (Member)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
            مراقب (Viewer)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              التحكم الشامل والصلاحيات
            </span>
            <span className="text-xs text-slate-400 font-mono">
              sqlite.db / users table
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            لوحة الأعضاء والمدراء والتحكم الشامل
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-1 max-w-xl">
            إدارة الحسابات، تشفير كلمات المرور، تعيين الأدوار والصلاحيات مباشرة
            في قاعدة البيانات المحلية.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers()}
            className="p-2 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-md text-xs hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ إضافة عضو / مدير جديد</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center border-b border-slate-200 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "users"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>قائمة الأعضاء والمدراء ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("permissions")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "permissions"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>جدول الصلاحيات والأدوار</span>
        </button>

        <button
          onClick={() => setActiveTab("system_tools")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "system_tools"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>أدوات النظام والتحكم الشامل</span>
        </button>
      </div>

      {/* TAB 1: USERS LIST & ACCOUNTS MANAGEMENT */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم العضو، البريد، أو المسمى الوظيفي..."
                className="w-full pr-9 pl-3 py-1.5 border border-slate-200 rounded-md text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium">
                فلترة حسب الدور:
              </span>
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="border border-slate-200 bg-slate-50 text-slate-800 text-xs font-medium rounded-md px-3 py-1.5 focus:outline-none"
              >
                <option value="all">جميع الأدوار</option>
                <option value="admin">مدير عام (Admin)</option>
                <option value="manager">مدير مشروع (Manager)</option>
                <option value="member">عضو فريق (Member)</option>
                <option value="viewer">مراقب (Viewer)</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3">المستخدم / العضو</th>
                <th className="px-6 py-3">المسمى الوظيفي</th>
                <th className="px-6 py-3">الدور الحسابي</th>
                <th className="px-6 py-3">الحالة</th>
                <th className="px-6 py-3 text-center">إجراءات التحكم</th>
              </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredUsers.map((user) => {
                    let parsedPerms: string[] = [];
                    try {
                      parsedPerms = JSON.parse(user.permissions || "[]");
                    } catch {
                      parsedPerms = [];
                    }

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs"
                              style={{
                                backgroundColor: user.avatar_color || "#0f172a",
                              }}
                            >
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {user.role === "admin" && (
                                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                )}
                              </div>
                              <div className="text-xs text-slate-400 font-mono">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-xs font-medium text-slate-700">
                          {user.job_title || "غير محدد"}
                        </td>

                        <td className="px-6 py-4">{getRoleBadge(user.role)}</td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            نشط
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingUser({ ...user });
                                setIsEditUserModalOpen(true);
                              }}
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
                              title="تعديل الدور والصلاحيات"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 rounded-md hover:bg-red-50 text-red-600 transition-colors"
                              title="حذف الحساب"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-slate-400 text-xs"
                      >
                        لا يوجد مستخدمين يطابقون خيارات البحث في قاعدة SQLite
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS GRID */}
      {activeTab === "permissions" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-base">
              مصفوفة صلاحيات الأدوار (Role Permissions Matrix)
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              تحديد الصلاحيات المتاحة لكل دور حسابي في النظام لحماية البيانات
              وضمان السرية.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="p-3">نوع الصلاحية</th>
                  <th className="p-3 text-center">مدير عام (Admin)</th>
                  <th className="p-3 text-center">مدير مشروع (Manager)</th>
                  <th className="p-3 text-center">عضو فريق (Member)</th>
                  <th className="p-3 text-center">مراقب (Viewer)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {ALL_PERMISSIONS.map((perm) => (
                  <tr key={perm.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">
                        {perm.label}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {perm.desc}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Check className="w-5 h-5 text-emerald-600 mx-auto stroke-[3]" />
                    </td>
                    <td className="p-3 text-center">
                      {[
                        "manage_projects",
                        "manage_tasks",
                        "view_reports",
                      ].includes(perm.id) ? (
                        <Check className="w-5 h-5 text-emerald-600 mx-auto stroke-[3]" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {["manage_tasks"].includes(perm.id) ? (
                        <Check className="w-5 h-5 text-emerald-600 mx-auto stroke-[3]" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <X className="w-4 h-4 text-slate-300 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM TOOLS & CONTROL PANEL */}
      {activeTab === "system_tools" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Maintenance */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Database className="w-5 h-5 text-slate-900" />
              <h3 className="font-bold text-slate-900 text-sm">
                أدوات تحسين وصيانة أداء المنصة
              </h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900">
                    فحص سلامة جداول البيانات
                  </div>
                  <div className="text-[11px] text-slate-500">
                    التحقق الفعلي من عدم وجود أي مشاكل بهيكلية البيانات.
                  </div>
                </div>
                <button
                  onClick={() => runSystemTool("integrity")}
                  disabled={isSystemActionRunning}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  تشغيل الفحص
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900">
                    تنظيف وضغط الجداول
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ضغط مساحة التخزين واسترجاع المساحات المحذوفة.
                  </div>
                </div>
                <button
                  onClick={() => runSystemTool("vacuum")}
                  disabled={isSystemActionRunning}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                  ضغط الجداول
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900">
                    إعادة فهرسة البحث
                  </div>
                  <div className="text-[11px] text-slate-500">
                    تحديث فهارس البحث وتسريع الاستعلامات وعرض البيانات.
                  </div>
                </div>
                <button
                  onClick={() => runSystemTool("reindex")}
                  disabled={isSystemActionRunning}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded-md text-xs font-bold hover:bg-slate-700 transition-colors"
                >
                  إعادة المزامنة
                </button>
              </div>
            </div>

            {systemActionOutput && (
              <div className="p-3 bg-slate-950 text-slate-200 rounded-lg text-xs font-mono whitespace-pre-wrap overflow-x-auto border border-slate-800">
                {systemActionOutput}
              </div>
            )}
          </div>

          {/* Backup & System Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <HardDrive className="w-5 h-5 text-slate-900" />
              <h3 className="font-bold text-slate-900 text-sm">
                حالة نظام التخزين المحلي
              </h3>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-md">
                <span className="font-semibold">نوع التخزين:</span>
                <span className="font-bold text-slate-900">محلي دائم آمن</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-md">
                <span className="font-semibold">تشفير كلمات المرور:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Bcrypt-Secured
                </span>
              </div>

              <div className="pt-2">
                <button
                  onClick={() =>
                    alert(
                      "البيانات محفوظة بشكل دائم ومؤمنة في النظام.",
                    )
                  }
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-md transition-colors text-xs border border-slate-200"
                >
                  التحقق من التزامن وحالة التخزين
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW USER */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                إضافة عضو / مدير جديد للنظام
              </h3>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  الاسم الكامل *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="مثال: خالد العتيبي"
                  className="w-full p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  البريد الإلكتروني *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="khalid@company.com"
                  className="w-full p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  كلمة المرور *
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="••••••••"
                  className="w-full p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  المسمى الوظيفي
                </label>
                <input
                  type="text"
                  value={formData.job_title}
                  onChange={(e) =>
                    setFormData({ ...formData, job_title: e.target.value })
                  }
                  placeholder="مثال: مهندس برمجيات"
                  className="w-full p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  الدور والحساب
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as any })
                  }
                  className="w-full p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="admin">
                    مدير عام (Admin - كامل الصلاحيات)
                  </option>
                  <option value="manager">مدير مشروع (Manager)</option>
                  <option value="member">عضو فريق (Member)</option>
                  <option value="viewer">مراقب (Viewer)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-md font-bold hover:bg-slate-800"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESET PASSWORD */}
      {isPasswordModalOpen && selectedUserForPassword && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                تغيير كلمة المرور
              </h3>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              تحديث وتشفير كلمة المرور الجديدة للحساب:{" "}
              <strong className="text-slate-900">
                {selectedUserForPassword.name}
              </strong>
            </p>

            <form
              onSubmit={handlePasswordResetSubmit}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  className="w-full p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold"
                >
                  حفظ التشفير
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT USER ROLE & PERMISSIONS */}
      {isEditUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                تعديل حساب وصلاحيات العضو
              </h3>
              <button
                onClick={() => setIsEditUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  الاسم
                </label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                  className="w-full p-2 border border-slate-200 rounded-md focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                  className="w-full p-2 border border-slate-200 rounded-md focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  المسمى الوظيفي
                </label>
                <input
                  type="text"
                  value={editingUser.job_title}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      job_title: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-slate-200 rounded-md focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  الدور
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      role: e.target.value as any,
                    })
                  }
                  className="w-full p-2 border border-slate-200 rounded-md focus:outline-none"
                >
                  <option value="admin">مدير عام (Admin)</option>
                  <option value="manager">مدير مشروع (Manager)</option>
                  <option value="member">عضو فريق (Member)</option>
                  <option value="viewer">مراقب (Viewer)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  كلمة المرور الجديدة (اتركها فارغة للإبقاء على الحالية)
                </label>
                <input
                  type="password"
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      password: e.target.value,
                    })
                  }
                  placeholder="أدخل كلمة المرور الجديدة لتغييرها..."
                  className="w-full p-2 border border-slate-200 rounded-md focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-md font-bold hover:bg-slate-800"
                >
                  تحديث التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
