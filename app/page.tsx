"use client";

import React, { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/clientAuth";
import { Navbar } from "@/components/Navbar";
import { Sidebar, ViewMode } from "@/components/Sidebar";
import { DashboardView } from "@/components/DashboardView";
import { ProjectsView } from "@/components/ProjectsView";
import { KanbanView } from "@/components/KanbanView";
import { TasksListView } from "@/components/TasksListView";
import { UsersManagementView } from "@/components/UsersManagementView";
import { AiAssistantView } from "@/components/AiAssistantView";
import { SqliteManagerView } from "@/components/SqliteManagerView";
import { SettingsView } from "@/components/SettingsView";
import { AiProvidersView } from "@/components/AiProvidersView";

import { TaskModal } from "@/components/TaskModal";
import { ProjectModal } from "@/components/ProjectModal";
import { TaskDetailModal } from "@/components/TaskDetailModal";

import { Project, Task } from "@/lib/db";
import {
  Lock,
  Mail,
  Database,
  AlertTriangle,
  LogIn,
  ShieldAlert,
  Key,
} from "lucide-react";

export default function HomePage() {
  // Navigation State
  const [currentView, setCurrentView] = useState<ViewMode>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<number | "all">(
    "all",
  );
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>("");

  // Auth & Security States
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("taskManagerUser");
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem("taskManagerUser");
      }
    }
  }, []);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [authSubmitting, setAuthSubmitting] = useState<boolean>(false);

  // Handle Secure login validation against SQLite API
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        localStorage.setItem("taskManagerUser", JSON.stringify(data.user));
        setEmailInput("");
        setPasswordInput("");
        // Immediately fetch data on login success
        await loadData();
      } else {
        setAuthError(data.error || "عذراً، فشلت عملية التحقق من الحساب");
      }
    } catch (err) {
      setAuthError("عذراً، تعذر الاتصال بملف قاعدة بيانات SQLite المحلي");
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Safe Logout
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("taskManagerUser");
    setCurrentView("dashboard");
  };

  // Data States
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [platformSettings, setPlatformSettings] = useState<any>(null);

  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [taskModalInitialStatus, setTaskModalInitialStatus] =
    useState<string>("todo");
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [activeTaskDetail, setActiveTaskDetail] = useState<Task | null>(null);

  // Fetch All Data from SQLite API
  const loadData = useCallback(async () => {
    if (
      typeof window !== "undefined" &&
      !localStorage.getItem("taskManagerUser")
    ) {
      setIsLoading(false);
      return;
    }
    setIsRefreshing(true);
    try {
      // 1. Ensure DB initialized
      await authFetch("/api/db/init");

      // 2. Fetch projects
      const projRes = await authFetch("/api/projects");
      const projData = await projRes.json();

      // 3. Fetch tasks
      const tasksRes = await authFetch("/api/tasks");
      const tasksData = await tasksRes.json();

      // 4. Fetch stats
      const statsRes = await authFetch("/api/stats");
      const statsData = await statsRes.json();

      // 5. Fetch platform settings
      const settingsRes = await fetch("/api/settings");
      const settingsData = await settingsRes.json();

      if (projData.success) setProjects(projData.projects || []);
      if (tasksData.success) setTasks(tasksData.tasks || []);
      if (statsData.success) setStats(statsData.stats || null);
      if (settingsData.success) setPlatformSettings(settingsData.settings);
    } catch (err) {
      console.error("Failed to load SQLite data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Listen for settings-updated event to refresh
  useEffect(() => {
    const handleSettingsUpdate = async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (data.success) setPlatformSettings(data.settings);
      } catch (err) {
        console.error(err);
      }
    };
    window.addEventListener("settings-updated", handleSettingsUpdate);
    return () =>
      window.removeEventListener("settings-updated", handleSettingsUpdate);
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (mounted) {
        await loadData();
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [loadData]);

  // Project CRUD Actions
  const handleSaveProject = async (projData: any) => {
    const isEdit = Boolean(projData.id);
    const method = isEdit ? "PUT" : "POST";

    const res = await authFetch("/api/projects", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projData),
    });

    const data = await res.json();
    if (data.success) {
      await loadData();
    } else {
      throw new Error(data.error || "فشل حفظ المشروع");
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm("هل أنت تأكد من حذف هذا المشروع وجميع مهامه من SQLite؟"))
      return;

    try {
      const res = await authFetch(`/api/projects?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        if (selectedProjectId === id) setSelectedProjectId("all");
        await loadData();
      }
    } catch (err) {
      alert("فشل حذف المشروع");
    }
  };

  // Task CRUD Actions
  const handleSaveTask = async (taskData: any) => {
    const isEdit = Boolean(taskData.id);
    const method = isEdit ? "PUT" : "POST";

    const res = await authFetch("/api/tasks", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    });

    const data = await res.json();
    if (data.success) {
      await loadData();
    } else {
      throw new Error(data.error || "فشل حفظ المهمة");
    }
  };

  const handleUpdateTaskStatus = async (
    taskId: number,
    newStatus: Task["status"],
  ) => {
    try {
      const res = await authFetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("هل أنت تأكد من حذف هذه المهمة من SQLite؟")) return;

    try {
      const res = await authFetch(`/api/tasks?id=${taskId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
      }
    } catch (err) {
      alert("فشل حذف المهمة");
    }
  };

  // Open modals helper
  const openNewTaskModal = (status = "todo") => {
    setTaskToEdit(null);
    setTaskModalInitialStatus(status);
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const openNewProjectModal = () => {
    setProjectToEdit(null);
    setIsProjectModalOpen(true);
  };

  const openEditProjectModal = (proj: Project) => {
    setProjectToEdit(proj);
    setIsProjectModalOpen(true);
  };

  const openTaskDetailModal = (task: Task) => {
    setActiveTaskDetail(task);
    setIsDetailModalOpen(true);
  };

  if (authLoading) {
    return (
      <div
        className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-20 text-slate-500 space-y-3 font-sans"
        dir="rtl"
      >
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-sm">
          جاري التحقق من جلسة الدخول الآمنة...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div
        className="min-h-screen bg-slate-50/60 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans"
        dir="rtl"
      >
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden transition-all duration-300">
          {/* Brand Header */}
          <div className="p-6 sm:p-8 bg-slate-900 text-white text-center space-y-3 relative">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto shadow-inner">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">
                بوابة تسجيل الدخول الآمنة
              </h2>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                منصة إدارة المهام والمشاريع المتقدمة بدعم كامل لقواعد بيانات
                SQLite المحلية
              </p>
            </div>
            <div className="absolute top-4 left-4 flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </div>
          </div>

          {/* Form Area */}
          <div className="p-6 sm:p-8 space-y-6">
            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700 font-medium font-sans">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5 font-sans">
                <label className="block text-xs font-bold text-slate-700">
                  البريد الإلكتروني للعمل *
                </label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@company.com"
                    className="block w-full pr-9 pl-3 py-2 border border-slate-200 rounded-md text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="block text-xs font-bold text-slate-700">
                  كلمة المرور المشفرة *
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pr-9 pl-3 py-2 border border-slate-200 rounded-md text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-2 bg-slate-900 text-white rounded-md text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:bg-slate-400 font-sans"
              >
                {authSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول للنظام الآمن</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick-Fill Helpers with Real DB Accounts */}
            <div className="pt-4 border-t border-slate-100 space-y-3 font-sans">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                <Key className="w-3.5 h-3.5" />
                <span>
                  الحسابات التجريبية النشطة في SQLite (انقر للتعبئة التلقائية):
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmailInput("admin@company.com");
                    setPasswordInput("admin123");
                  }}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-right transition-all group flex items-center justify-between cursor-pointer"
                >
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      أحمد محمود (المدير العام)
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      admin@company.com
                    </div>
                  </div>
                  <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-bold">
                    مدير عام
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmailInput("sara@company.com");
                    setPasswordInput("sara123");
                  }}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-right transition-all group flex items-center justify-between cursor-pointer"
                >
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      سارة خالد (مديرة المشروع)
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      sara@company.com
                    </div>
                  </div>
                  <span className="text-[9px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-bold">
                    مدير مشروع
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmailInput("mohammed@company.com");
                    setPasswordInput("mohammed123");
                  }}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-right transition-all group flex items-center justify-between cursor-pointer"
                >
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      محمد علي (مطور واجهات)
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      mohammed@company.com
                    </div>
                  </div>
                  <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 font-bold">
                    عضو فريق
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      {/* Top Navigation */}
      <Navbar
        onOpenNewTaskModal={() => openNewTaskModal("todo")}
        onOpenNewProjectModal={openNewProjectModal}
        onRefreshData={loadData}
        onOpenSqliteModal={() => setCurrentView("sqlite")}
        searchQuery={globalSearchQuery}
        setSearchQuery={setGlobalSearchQuery}
        isRefreshing={isRefreshing}
        currentUser={currentUser}
        onLogout={handleLogout}
        platformName={platformSettings?.platform_name}
        platformLogo={platformSettings?.platform_logo}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          projects={projects}
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
          onOpenNewProjectModal={openNewProjectModal}
          currentUser={currentUser}
          platformName={platformSettings?.platform_name}
          platformLogo={platformSettings?.platform_logo}
        />

        {/* View Content Area */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-500 space-y-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="font-bold text-sm">
                جاري جلب البيانات من قاعدة SQLite...
              </p>
            </div>
          ) : (
            <>
              {currentView === "dashboard" && (
                <DashboardView
                  stats={stats}
                  projects={projects}
                  tasks={tasks}
                  onOpenNewTaskModal={() => openNewTaskModal("todo")}
                  onOpenNewProjectModal={openNewProjectModal}
                  onSwitchView={(v) => setCurrentView(v)}
                />
              )}

              {currentView === "projects" && (
                <ProjectsView
                  projects={projects}
                  onOpenNewProjectModal={openNewProjectModal}
                  onEditProject={openEditProjectModal}
                  onDeleteProject={handleDeleteProject}
                  onSelectProjectForKanban={(id) => {
                    setSelectedProjectId(id);
                    setCurrentView("kanban");
                  }}
                />
              )}

              {currentView === "kanban" && (
                <KanbanView
                  tasks={tasks}
                  projects={projects}
                  selectedProjectId={selectedProjectId}
                  setSelectedProjectId={setSelectedProjectId}
                  onOpenNewTaskModal={openNewTaskModal}
                  onOpenTaskDetailModal={openTaskDetailModal}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onDeleteTask={handleDeleteTask}
                />
              )}

              {currentView === "tasks" && (
                <TasksListView
                  tasks={tasks}
                  projects={projects}
                  onOpenNewTaskModal={() => openNewTaskModal("todo")}
                  onOpenTaskDetailModal={openTaskDetailModal}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onDeleteTask={handleDeleteTask}
                />
              )}

              {currentView === "users" &&
                (currentUser?.role === "admin" ||
                currentUser?.role === "manager" ? (
                  <UsersManagementView onRefreshData={loadData} />
                ) : (
                  <div
                    className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-lg mx-auto space-y-6 shadow-sm mt-12 font-sans"
                    dir="rtl"
                  >
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto shadow-inner text-red-600">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-bold text-base text-slate-900">
                        منطقة محظورة الصلاحيات
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        عذراً، لوحة التحكم بالأعضاء وتعديل الصلاحيات مخصصة حصراً
                        للمدراء والمسؤولين ذوي الصلاحيات الكافية. حسابك الحالي
                        مسجل بصفة:{" "}
                        <strong className="text-slate-800">
                          {currentUser?.role === "member"
                            ? "عضو فريق"
                            : "مراقب"}
                        </strong>
                        .
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentView("dashboard")}
                      className="px-6 py-2 bg-slate-900 text-white rounded-md text-xs font-bold hover:bg-slate-800 transition-colors shadow-md cursor-pointer mx-auto block"
                    >
                      العودة للوحة التحكم الرئيسية
                    </button>
                  </div>
                ))}

              {currentView === "ai" && (
                <AiAssistantView projects={projects} onRefreshData={loadData} />
              )}

              {currentView === "sqlite" &&
                (currentUser?.role === "admin" ||
                currentUser?.role === "manager" ? (
                  <SqliteManagerView onRefreshData={loadData} />
                ) : (
                  <div
                    className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-lg mx-auto space-y-6 shadow-sm mt-12 font-sans"
                    dir="rtl"
                  >
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto shadow-inner text-red-600">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-bold text-base text-slate-900">
                        الوصول المباشر لقاعدة البيانات محظور
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        استعراض وإدارة جداول SQLite مباشرة هي صلاحية مخصصة
                        للمطورين والمدراء لحماية سلامة البيانات الحقيقية من
                        التلف أو التعديل غير المصرّح به.
                      </p>
                    </div>
                      <button
                        onClick={() => setCurrentView("dashboard")}
                        className="px-6 py-2 bg-slate-900 text-white rounded-md text-xs font-bold hover:bg-slate-800 transition-colors shadow-md cursor-pointer mx-auto block"
                      >
                        العودة للوحة التحكم الرئيسية
                      </button>
                  </div>
                ))}

              {currentView === "settings" &&
                (currentUser?.role === "admin" ? (
                  <SettingsView />
                ) : (
                  <div
                    className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-lg mx-auto space-y-6 shadow-sm mt-12 font-sans"
                    dir="rtl"
                  >
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto shadow-inner text-red-600">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-bold text-base text-slate-900">
                        الإعدادات مخصصة للمدير العام فقط
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        تخصيص هوية المنصة (الشعار، الاسم، الألوان) يتطلب صلاحية
                        المدير العام لحماية إعدادات النظام.
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentView("dashboard")}
                      className="px-6 py-2 bg-slate-900 text-white rounded-md text-xs font-bold hover:bg-slate-800 transition-colors shadow-md cursor-pointer mx-auto block"
                    >
                      العودة للوحة التحكم الرئيسية
                    </button>
                  </div>
                ))}

              {currentView === "ai-providers" &&
                (currentUser?.role === "admin" ? (
                  <AiProvidersView />
                ) : (
                  <div
                    className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-lg mx-auto space-y-6 shadow-sm mt-12 font-sans"
                    dir="rtl"
                  >
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto shadow-inner text-red-600">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-bold text-base text-slate-900">
                        إدارة المزودين مخصصة للمدير العام
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        إضافة وتكوين مزودي الذكاء الاصطناعي يتطلب صلاحية المدير
                        العام.
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentView("dashboard")}
                      className="px-6 py-2 bg-slate-900 text-white rounded-md text-xs font-bold hover:bg-slate-800 transition-colors shadow-md cursor-pointer mx-auto block"
                    >
                      العودة للوحة التحكم الرئيسية
                    </button>
                  </div>
                ))}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        projects={projects}
        onSaveTask={handleSaveTask}
        initialStatus={taskModalInitialStatus}
        taskToEdit={taskToEdit}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSaveProject={handleSaveProject}
        projectToEdit={projectToEdit}
      />

      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        task={activeTaskDetail}
        onUpdateStatus={handleUpdateTaskStatus}
        onEditTask={openEditTaskModal}
        onDeleteTask={handleDeleteTask}
        onRefreshData={loadData}
      />
    </div>
  );
}
