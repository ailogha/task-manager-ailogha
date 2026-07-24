"use client";

import React, { useState } from "react";
import {
  ListTodo,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Tag,
  User,
  Calendar,
  Layers,
  ChevronDown,
  CheckSquare,
} from "lucide-react";
import { Task, Project } from "@/lib/db";

interface TasksListViewProps {
  tasks: Task[];
  projects: Project[];
  onOpenNewTaskModal: () => void;
  onOpenTaskDetailModal: (task: Task) => void;
  onUpdateTaskStatus: (taskId: number, newStatus: Task["status"]) => void;
  onDeleteTask: (taskId: number) => void;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> =
  {
    todo: { label: "قيد الانتظار", bg: "bg-slate-100", text: "text-slate-700" },
    in_progress: {
      label: "قيد التنفيذ",
      bg: "bg-blue-100",
      text: "text-blue-800",
    },
    review: {
      label: "قيد المراجعة",
      bg: "bg-amber-100",
      text: "text-amber-800",
    },
    completed: {
      label: "مكتملة",
      bg: "bg-emerald-100",
      text: "text-emerald-800",
    },
  };

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  urgent: { label: "عاجلة جداً", color: "text-rose-600 font-extrabold" },
  high: { label: "عالية", color: "text-amber-600 font-bold" },
  medium: { label: "متوسطة", color: "text-blue-600" },
  low: { label: "منخفضة", color: "text-slate-500" },
};

export const TasksListView: React.FC<TasksListViewProps> = ({
  tasks,
  projects,
  onOpenNewTaskModal,
  onOpenTaskDetailModal,
  onUpdateTaskStatus,
  onDeleteTask,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredTasks = tasks.filter((t) => {
    const matchProj =
      selectedProjectId === "all" || t.project_id === Number(selectedProjectId);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchPriority =
      priorityFilter === "all" || t.priority === priorityFilter;
    const matchSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description &&
        t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.tags && t.tags.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchProj && matchStatus && matchPriority && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <ListTodo className="w-5 h-5 text-blue-600" />
            <span>قائمة المهام التفصيلية ({filteredTasks.length})</span>
          </div>

          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="all">جميع المشاريع</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="all">جميع الحالات</option>
            <option value="todo">قيد الانتظار</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="review">قيد المراجعة</option>
            <option value="completed">مكتملة</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="all">جميع الأولويات</option>
            <option value="urgent">عاجلة جداً</option>
            <option value="high">عالية</option>
            <option value="medium">متوسطة</option>
            <option value="low">منخفضة</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالمسمّى أو الوسم..."
              className="w-full pl-3 pr-8 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={onOpenNewTaskModal}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-md text-xs transition-colors flex items-center gap-1 shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ مهمة جديدة</span>
          </button>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5 pr-5">المهمة والمشروع</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5">الأولوية</th>
                <th className="p-3.5">المُكلف بها</th>
                <th className="p-3.5">تاريخ الاستحقاق</th>
                <th className="p-3.5">الساعات (فعلي / متوقع)</th>
                <th className="p-3.5 pl-5 text-center">الإجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((task) => {
                const statusObj = STATUS_MAP[task.status] || STATUS_MAP.todo;
                const priorityObj =
                  PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
                const subtaskCount = task.subtasks?.length || 0;
                const completedSubtasks =
                  task.subtasks?.filter((s) => s.completed === 1).length || 0;

                return (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => onOpenTaskDetailModal(task)}
                  >
                    {/* Task Title & Project */}
                    <td className="p-3.5 pr-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: task.project_color || "#3b82f6",
                            }}
                          />
                          <span className="font-bold text-slate-900 text-xs group-hover:text-blue-600 transition-colors">
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{task.project_name}</span>
                          {subtaskCount > 0 && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-600 flex items-center gap-1">
                              <CheckSquare className="w-3 h-3 text-blue-600" />
                              {completedSubtasks}/{subtaskCount}
                            </span>
                          )}
                          {task.tags && (
                            <span className="text-[10px] text-slate-400">
                              ({task.tags})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status Dropdown */}
                    <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={task.status}
                        onChange={(e) =>
                          onUpdateTaskStatus(
                            task.id,
                            e.target.value as Task["status"],
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 outline-none cursor-pointer ${statusObj.bg} ${statusObj.text}`}
                      >
                        <option value="todo">قيد الانتظار</option>
                        <option value="in_progress">قيد التنفيذ</option>
                        <option value="review">قيد المراجعة</option>
                        <option value="completed">مكتملة</option>
                      </select>
                    </td>

                    {/* Priority */}
                    <td className="p-3.5">
                      <span
                        className={`text-xs font-bold ${priorityObj.color}`}
                      >
                        {priorityObj.label}
                      </span>
                    </td>

                    {/* Assigned To */}
                    <td className="p-3.5 text-slate-700 font-medium">
                      {task.assigned_to ? (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {task.assigned_to}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">غير محدد</span>
                      )}
                    </td>

                    {/* Due Date */}
                    <td className="p-3.5 text-slate-600">
                      {task.due_date ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {task.due_date}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Hours */}
                    <td className="p-3.5 text-slate-700 font-mono font-medium">
                      {task.actual_hours} / {task.estimated_hours} ساعة
                    </td>

                    {/* Actions */}
                    <td
                      className="p-3.5 pl-5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="حذف المهمة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredTasks.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-slate-400 text-xs"
                  >
                    لا توجد مهام تطابق الفلتر المحدد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
