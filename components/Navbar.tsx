"use client";

import React, { useState } from "react";
import {
  Database,
  Plus,
  Search,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  Sparkles,
  Server,
  LogOut,
  UserCheck,
} from "lucide-react";

interface NavbarProps {
  onOpenNewTaskModal: () => void;
  onOpenNewProjectModal: () => void;
  onRefreshData: () => void;
  onOpenSqliteModal: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isRefreshing?: boolean;
  currentUser?: any;
  onLogout?: () => void;
  platformName?: string;
  platformLogo?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewTaskModal,
  onOpenNewProjectModal,
  onRefreshData,
  onOpenSqliteModal,
  searchQuery,
  setSearchQuery,
  isRefreshing = false,
  currentUser,
  onLogout,
  platformName,
  platformLogo,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-8 h-16 flex items-center transition-all shrink-0">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full max-w-7xl mx-auto">
        {/* Right Side: Brand & Logo */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-xs overflow-hidden shrink-0">
              {platformLogo ? (
                <img
                  src={platformLogo}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Database className="w-4 h-4" />
              )}
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-base leading-tight tracking-tight flex items-center gap-2">
                {platformName || "نظام إدارة المهام"}
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                لوحة تحكم ذكية
              </p>
            </div>
          </div>
        </div>

        {/* Center: Quick Search */}
        <div className="relative w-full sm:w-64 lg:w-80">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في المهام والمشاريع..."
            className="block w-full pr-9 pl-3 py-1.5 border border-slate-200 rounded-md text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Left Side: Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {currentUser && (
            <div className="hidden md:flex items-center gap-2.5 pl-2 border-l border-slate-200 text-right">
              <div>
                <div className="text-xs font-bold text-slate-900 leading-none mb-1">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {currentUser.role === "admin"
                    ? "مدير عام"
                    : currentUser.role === "manager"
                      ? "مدير مشروع"
                      : "عضو فريق"}
                </div>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0"
                style={{
                  backgroundColor: currentUser.avatar_color || "#3b82f6",
                }}
              >
                {currentUser.name.charAt(0)}
              </div>
            </div>
          )}

          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin text-slate-900" : ""}`}
            />
          </button>

          <button
            onClick={onOpenNewProjectModal}
            className="px-3 py-1.5 text-xs font-bold rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>مشروع جديد</span>
          </button>

          <button
            onClick={onOpenNewTaskModal}
            className="bg-slate-900 text-white text-xs font-bold px-4 py-1.5 rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ مهمة جديدة</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-md text-red-600 hover:bg-red-50 border border-red-200 hover:text-red-800 transition-colors shrink-0"
              title="تسجيل الخروج الآمن"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
