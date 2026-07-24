"use client";

import React, { useState } from "react";
import {
  Kanban,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
  User,
  ArrowRight,
  ArrowLeft,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import { Task, Project } from "@/lib/db";

interface KanbanViewProps {
  tasks: Task[];
  projects: Project[];
  selectedProjectId: number | "all";
  setSelectedProjectId: (id: number | "all") => void;
  onOpenNewTaskModal: (status?: string) => void;
  onOpenTaskDetailModal: (task: Task) => void;
  onUpdateTaskStatus: (taskId: number, newStatus: Task["status"]) => void;
  onDeleteTask: (taskId: number) => void;
}

const PRIORITY_BADGES: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  urgent: {
    label: "عاجلة جداً",
    bg: "bg-red-50 border-red-100",
    text: "text-red-600",
  },
  high: {
    label: "عالية",
    bg: "bg-amber-50 border-amber-100",
    text: "text-amber-700",
  },
  medium: {
    label: "متوسطة",
    bg: "bg-blue-50 border-blue-100",
    text: "text-blue-600",
  },
  low: {
    label: "منخفضة",
    bg: "bg-slate-100 border-slate-200",
    text: "text-slate-600",
  },
};

const COLUMNS = [
  {
    id: "todo",
    title: "قيد الانتظار",
    color: "border-slate-200 bg-slate-50/50",
    badgeBg: "bg-slate-200 text-slate-800",
  },
  {
    id: "in_progress",
    title: "قيد التنفيذ",
    color: "border-blue-200 bg-blue-50/30",
    badgeBg: "bg-blue-600 text-white",
  },
  {
    id: "review",
    title: "قيد المراجعة",
    color: "border-amber-200 bg-amber-50/30",
    badgeBg: "bg-amber-500 text-white",
  },
  {
    id: "completed",
    title: "مكتملة",
    color: "border-emerald-200 bg-emerald-50/30",
    badgeBg: "bg-emerald-600 text-white",
  },
];

export const KanbanView: React.FC<KanbanViewProps> = ({
  tasks,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  onOpenNewTaskModal,
  onOpenTaskDetailModal,
  onUpdateTaskStatus,
  onDeleteTask,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredTasks = tasks.filter((t) => {
    const matchProject =
      selectedProjectId === "all" || t.project_id === selectedProjectId;
    const matchPriority =
      priorityFilter === "all" || t.priority === priorityFilter;
    const matchSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description &&
        t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchProject && matchPriority && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Kanban className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-900 text-base">
              لوحة المهام التفاعلية
            </h2>
          </div>

          {/* Project Dropdown */}
          <select
            value={selectedProjectId}
            onChange={(e) =>
              setSelectedProjectId(
                e.target.value === "all" ? "all" : Number(e.target.value),
              )
            }
            className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="all">جميع المشاريع ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="all">كل الأولويات</option>
            <option value="urgent">عاجلة جداً</option>
            <option value="high">عالية</option>
            <option value="medium">متوسطة</option>
            <option value="low">منخفضة</option>
          </select>

          {/* Search */}
          <div className="relative w-full sm:w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="تصفية..."
              className="w-full pl-3 pr-8 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-xl outline-none"
            />
          </div>

          <button
            onClick={() => onOpenNewTaskModal()}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-md text-xs transition-colors flex items-center gap-1 shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ مهمة جديدة</span>
          </button>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className={`rounded-2xl border p-3 ${col.color} kanban-col flex flex-col justify-between space-y-3 transition-colors`}
            >
              {/* Column Header */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {col.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${col.badgeBg}`}
                    >
                      {colTasks.length}
                    </span>
                  </div>

                  <button
                    onClick={() => onOpenNewTaskModal(col.id)}
                    className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white transition-colors"
                    title={`إضافة مهمة جديدة إلى ${col.title}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Task Cards Stack */}
                <div className="space-y-3">
                  {colTasks.map((task) => {
                    const priorityObj =
                      PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
                    const subtaskCount = task.subtasks?.length || 0;
                    const completedSubtasks =
                      task.subtasks?.filter((s) => s.completed === 1).length ||
                      0;

                    return (
                      <div
                        key={task.id}
                        className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md hover:border-blue-400 transition-all space-y-3 group cursor-pointer"
                        onClick={() => onOpenTaskDetailModal(task)}
                      >
                        {/* Project Tag & Priority */}
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md truncate max-w-[120px]"
                            style={{
                              backgroundColor: `${task.project_color || "#3b82f6"}15`,
                              color: task.project_color || "#3b82f6",
                            }}
                          >
                            {task.project_name}
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${priorityObj.bg} ${priorityObj.text}`}
                          >
                            {priorityObj.label}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs leading-snug group-hover:text-blue-600 transition-colors">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-slate-500 text-[11px] line-clamp-2 mt-1">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Subtasks Progress */}
                        {subtaskCount > 0 && (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                            <span>
                              المهام الفرعية: {completedSubtasks}/{subtaskCount}
                            </span>
                          </div>
                        )}

                        {/* Card Footer */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100">
                          {task.due_date ? (
                            <span className="flex items-center gap-1 font-medium text-slate-600">
                              <Clock className="w-3 h-3 text-amber-500" />
                              {task.due_date}
                            </span>
                          ) : (
                            <span className="text-slate-400">بدون تاريخ</span>
                          )}

                          {task.assigned_to && (
                            <span className="flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              <User className="w-3 h-3 text-slate-500" />
                              {task.assigned_to}
                            </span>
                          )}
                        </div>

                        {/* Column Shift Buttons */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-between pt-1 opacity-90 group-hover:opacity-100 transition-opacity"
                        >
                          <div className="flex items-center gap-1">
                            {col.id !== "todo" && (
                              <button
                                onClick={() => {
                                  const prevStatus =
                                    col.id === "completed"
                                      ? "review"
                                      : col.id === "review"
                                        ? "in_progress"
                                        : "todo";
                                  onUpdateTaskStatus(
                                    task.id,
                                    prevStatus as any,
                                  );
                                }}
                                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded text-[10px] font-bold flex items-center gap-0.5"
                                title="إعادة للمرحلة السابقة"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}

                            {col.id !== "completed" && (
                              <button
                                onClick={() => {
                                  const nextStatus =
                                    col.id === "todo"
                                      ? "in_progress"
                                      : col.id === "in_progress"
                                        ? "review"
                                        : "completed";
                                  onUpdateTaskStatus(
                                    task.id,
                                    nextStatus as any,
                                  );
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded text-[10px] font-bold flex items-center gap-0.5"
                                title="تحريك للمرحلة التالية"
                              >
                                <span>التالي</span>
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="py-8 text-center border border-dashed border-slate-300/80 rounded-xl text-slate-400 text-xs">
                      لا توجد مهام هنا
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
