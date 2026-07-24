"use client";

import React from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Kanban,
  ListTodo,
  Sparkles,
  Database,
  ChevronLeft,
  FolderPlus,
  BarChart3,
  CheckSquare,
  HardDrive,
  Users,
  Lock,
  Settings,
  Cpu,
} from "lucide-react";
import { Project } from "@/lib/db";

export type ViewMode =
  | "dashboard"
  | "projects"
  | "kanban"
  | "tasks"
  | "users"
  | "ai"
  | "sqlite"
  | "settings"
  | "ai-providers";

interface SidebarProps {
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  projects: Project[];
  selectedProjectId: number | "all";
  setSelectedProjectId: (id: number | "all") => void;
  onOpenNewProjectModal: () => void;
  currentUser?: any;
  platformName?: string;
  platformLogo?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  onOpenNewProjectModal,
  currentUser,
  platformName,
  platformLogo,
}) => {
  const navItems = [
    {
      id: "dashboard" as ViewMode,
      label: "لوحة التحكم",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "projects" as ViewMode,
      label: "المشاريع الجارية",
      icon: FolderKanban,
      badge: projects.length,
    },
    {
      id: "kanban" as ViewMode,
      label: "لوحة المهام (Kanban)",
      icon: Kanban,
      badge: null,
    },
    {
      id: "tasks" as ViewMode,
      label: "جميع المهام",
      icon: ListTodo,
      badge: null,
    },
    {
      id: "users" as ViewMode,
      label: "الفريق والصلاحيات",
      icon: Users,
      badge: "الفريق",
    },
    {
      id: "ai" as ViewMode,
      label: "المساعد الذكي (AI)",
      icon: Sparkles,
      badge: "جديد",
    },
    {
      id: "ai-providers" as ViewMode,
      label: "مزودو الذكاء الاصطناعي",
      icon: Cpu,
      badge: null,
    },
    {
      id: "sqlite" as ViewMode,
      label: "قاعدة بيانات SQLite",
      icon: Database,
      badge: "SQLite",
    },
    {
      id: "settings" as ViewMode,
      label: "الإعدادات العامة",
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-full lg:w-64 bg-white border-l border-slate-200 shrink-0 p-4 flex flex-col justify-between">
      <div className="space-y-6">
        {/* Navigation Sections */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-3 mb-2">
            القائمة الرئيسية
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const isRestricted =
                (item.id === "users" ||
                  item.id === "sqlite" ||
                  item.id === "settings" ||
                  item.id === "ai-providers") &&
                currentUser?.role !== "admin" &&
                currentUser?.role !== "manager";
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    isActive
                      ? "bg-slate-50 text-slate-900 font-bold"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${isActive ? "text-slate-900" : "text-slate-400"} ${isRestricted ? "text-slate-300" : ""}`}
                    />
                    <span className={isRestricted ? "text-slate-400" : ""}>
                      {item.label}
                    </span>
                  </div>
                  {isRestricted ? (
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  ) : item.badge !== null ? (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Projects List */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              المشاريع النشطة
            </p>
            <button
              onClick={onOpenNewProjectModal}
              className="text-slate-900 hover:text-slate-700 text-xs font-bold flex items-center gap-0.5"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>إضافة</span>
            </button>
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto pl-1">
            <button
              onClick={() => {
                setSelectedProjectId("all");
                setCurrentView("kanban");
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedProjectId === "all" && currentView === "kanban"
                  ? "bg-slate-900 text-white font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>جميع المشاريع</span>
              </div>
            </button>

            {projects.map((proj) => {
              const isSelected =
                selectedProjectId === proj.id && currentView === "kanban";
              return (
                <button
                  key={proj.id}
                  onClick={() => {
                    setSelectedProjectId(proj.id);
                    setCurrentView("kanban");
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-slate-100 text-slate-900 font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: proj.color || "#3b82f6" }}
                    />
                    <span className="truncate">{proj.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md font-mono">
                    {proj.progress}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SQLite Database Card Widget */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-blue-700 font-bold flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              SQLite v3.4
            </span>
            <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
          </div>
          <div className="text-[10px] text-blue-600 font-medium">
            مساحة التخزين: محلي بملف{" "}
            <code className="font-mono bg-blue-100/60 px-1 py-0.5 rounded text-blue-800">
              sqlite.db
            </code>
          </div>
          <button
            onClick={() => setCurrentView("sqlite")}
            className="w-full mt-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[11px] font-bold transition-colors flex items-center justify-center gap-1 shadow-xs"
          >
            <span>استعراض جداول SQLite</span>
            <ChevronLeft className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
};
