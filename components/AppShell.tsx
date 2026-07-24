"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/clientAuth";
import {
  LayoutDashboard, FolderKanban, Kanban, ListTodo,
  Sparkles, Database, Settings, Cpu, Users, Lock,
  HardDrive, FolderPlus, ChevronLeft, LogOut, RefreshCw,
  Plus, Search, UserCheck,
} from "lucide-react";

interface Project { id: number; name: string; color?: string; progress?: number; }

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [platformName, setPlatformName] = useState("نظام المهام");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const res = await authFetch("/api/projects");
      const data = await res.json();
      if (data.success) setProjects(data.projects ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    loadProjects();
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.success) setPlatformName(d.settings.platform_name ?? "نظام المهام"); })
      .catch(() => {});
  }, [loadProjects]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProjects();
    setIsRefreshing(false);
    // Let child pages react via window event
    window.dispatchEvent(new Event("app-refresh"));
  };

  const navItems = [
    { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/projects", label: "المشاريع", icon: FolderKanban, badge: projects.length },
    { href: "/kanban", label: "Kanban", icon: Kanban },
    { href: "/tasks", label: "جميع المهام", icon: ListTodo },
    { href: "/users", label: "الفريق", icon: Users, adminOnly: true },
    { href: "/ai", label: "المساعد الذكي", icon: Sparkles, badge: "AI" },
    { href: "/ai-providers", label: "مزودو AI", icon: Cpu, adminOnly: true },
    { href: "/sqlite", label: "قاعدة البيانات", icon: Database, adminOnly: true },
    { href: "/settings", label: "الإعدادات", icon: Settings, adminOnly: true },
  ];

  const isAdmin = user?.role === "admin" || user?.role === "manager";

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 flex items-center px-4 lg:px-6 shrink-0">
        <div className="flex items-center justify-between w-full gap-4">
          {/* Brand */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-slate-900 hidden sm:block truncate max-w-[160px]">
              {platformName}
            </span>
          </Link>

          {/* Search */}
          <div className="relative flex-1 max-w-sm hidden md:block">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في المشاريع والمهام..."
              className="w-full pr-9 pl-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/tasks?new=1")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:block">مهمة جديدة</span>
            </button>
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-lg hover:bg-slate-100 transition-colors ${isRefreshing ? "animate-spin" : ""}`}
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
            {user && (
              <div className="flex items-center gap-2 border-r border-slate-200 pr-2 mr-1">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: user.avatar_color || "#0f172a" }}
                >
                  {user.name?.[0] ?? "U"}
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-l border-slate-200 shrink-0 flex flex-col p-4 overflow-y-auto hidden lg:flex">
          <div className="space-y-6 flex-1">
            {/* Main Nav */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-3 mb-2">
                القائمة الرئيسية
              </p>
              <nav className="space-y-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  const restricted = item.adminOnly && !isAdmin;
                  return (
                    <Link
                      key={item.href}
                      href={restricted ? "#" : item.href}
                      onClick={restricted ? (e) => e.preventDefault() : undefined}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-slate-900 text-white"
                          : restricted
                          ? "text-slate-300 cursor-not-allowed"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {restricted ? (
                        <Lock className="w-3 h-3" />
                      ) : item.badge !== undefined && item.badge !== null ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Projects quick list */}
            <div>
              <div className="flex items-center justify-between px-3 mb-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">المشاريع</p>
                <Link href="/projects?new=1" className="text-slate-500 hover:text-slate-900">
                  <FolderPlus className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {projects.map((proj) => (
                  <Link
                    key={proj.id}
                    href={`/projects/${proj.id}`}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      pathname === `/projects/${proj.id}`
                        ? "bg-slate-100 text-slate-900 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: proj.color || "#3b82f6" }} />
                      <span className="truncate">{proj.name}</span>
                    </div>
                    {proj.progress !== undefined && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                        {proj.progress}%
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* User card */}
          {user && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 px-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: user.avatar_color || "#0f172a" }}
                >
                  {user.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
