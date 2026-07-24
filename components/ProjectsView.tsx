"use client";

import React, { useState } from "react";
import {
  FolderKanban,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  Tag,
  Kanban,
  MoreVertical,
  Layers,
  FolderPlus,
} from "lucide-react";
import { Project } from "@/lib/db";

interface ProjectsViewProps {
  projects: Project[];
  onOpenNewProjectModal: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: number) => void;
  onSelectProjectForKanban: (id: number) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  onOpenNewProjectModal,
  onEditProject,
  onDeleteProject,
  onSelectProjectForKanban,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");

  const categories = ["all", "برمجيات", "تسويق", "تصميم", "عام"];

  const filteredProjects = projects.filter((p) => {
    const matchesCat =
      selectedCategory === "all" || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (p.description &&
        p.description.toLowerCase().includes(searchFilter.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-blue-600" />
            إدارة المشاريع ({projects.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            تتبع المشاريع وفئاتها وإنجاز مهامها المحفوظة في SQLite.
          </p>
        </div>

        <button
          onClick={onOpenNewProjectModal}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <FolderPlus className="w-4 h-4" />
          <span>مشروع جديد</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {cat === "all" ? "جميع الفئات" : cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="بحث في المشاريع..."
            className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((proj) => (
          <div
            key={proj.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: proj.color || "#3b82f6" }}
                  />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {proj.name}
                  </h3>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEditProject(proj)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    title="تعديل المشروع"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteProject(proj.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="حذف المشروع"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-slate-600 text-xs leading-relaxed min-h-[3rem]">
                {proj.description || "لا يوجد وصف للمشروع"}
              </p>

              <div className="flex items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md">
                  <Tag className="w-3 h-3 text-slate-400" />
                  {proj.category}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {proj.completed_task_count || 0} من {proj.task_count || 0}{" "}
                  مهام مكتملة
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                  <span>التقدم الإجمالي</span>
                  <span className="font-mono text-blue-600">
                    {proj.progress}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${proj.progress}%`,
                      backgroundColor: proj.color || "#3b82f6",
                    }}
                  />
                </div>
              </div>

              <button
                onClick={() => onSelectProjectForKanban(proj.id)}
                className="w-full py-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-bold border border-slate-200 hover:border-blue-200 transition-all flex items-center justify-center gap-1.5"
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>فتح لوحة مهام المشروع</span>
              </button>
            </div>
          </div>
        ))}

        {filteredProjects.length === 0 && (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-600 font-bold text-sm">
              لا توجد مشاريع مضافة بهذه الفئة
            </p>
            <button
              onClick={onOpenNewProjectModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء مشروع جديد</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
