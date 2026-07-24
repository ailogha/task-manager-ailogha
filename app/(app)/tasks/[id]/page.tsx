"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { authFetch } from "@/lib/clientAuth";
import { TaskModal } from "@/components/TaskModal";
import { Task, Project } from "@/lib/db";
import {
  ArrowRight, ListTodo, Edit2, Trash2, CheckCircle2,
  Clock, AlertCircle, User, Calendar, Tag, CheckSquare, Plus,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  todo: { label: "قيد الانتظار", bg: "bg-slate-100", text: "text-slate-700" },
  in_progress: { label: "قيد التنفيذ", bg: "bg-blue-100", text: "text-blue-700" },
  review: { label: "مراجعة", bg: "bg-amber-100", text: "text-amber-700" },
  completed: { label: "مكتملة", bg: "bg-emerald-100", text: "text-emerald-700" },
};

const PRIORITY_MAP: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: "منخفضة", bg: "bg-slate-100", text: "text-slate-600" },
  medium: { label: "متوسطة", bg: "bg-amber-100", text: "text-amber-700" },
  high: { label: "عالية", bg: "bg-orange-100", text: "text-orange-700" },
  urgent: { label: "عاجلة", bg: "bg-red-100", text: "text-red-700" },
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const taskId = Number(id);

  const [task, setTask] = useState<Task | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);

  const load = useCallback(async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        authFetch(`/api/tasks?id=${taskId}`),
        authFetch("/api/projects"),
      ]);
      const [t, p] = await Promise.all([tRes.json(), pRes.json()]);
      if (t.success) setTask(t.task ?? t.tasks?.[0] ?? null);
      if (p.success) setProjects(p.projects ?? []);
    } catch {}
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const handleUpdateStatus = async (newStatus: Task["status"]) => {
    await authFetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, status: newStatus }),
    });
    await load();
  };

  const handleSaveTask = async (taskData: any) => {
    await authFetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    });
    await load();
    setIsEditOpen(false);
  };

  const handleDelete = async () => {
    if (!confirm("حذف المهمة؟")) return;
    await authFetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
    router.push("/tasks");
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    setAddingSubtask(true);
    await authFetch("/api/subtasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, title: newSubtask.trim() }),
    });
    setNewSubtask("");
    setAddingSubtask(false);
    await load();
  };

  const handleToggleSubtask = async (subtaskId: number, current: number) => {
    await authFetch("/api/subtasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: subtaskId, completed: current === 1 ? 0 : 1 }),
    });
    await load();
  };

  if (!task) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400" dir="rtl">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin ml-2" />
        جاري التحميل...
      </div>
    );
  }

  const status = STATUS_MAP[task.status] ?? STATUS_MAP.todo;
  const priority = PRIORITY_MAP[task.priority] ?? PRIORITY_MAP.medium;
  const subtasks = task.subtasks ?? [];
  const doneSubtasks = subtasks.filter((s) => s.completed).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto" dir="rtl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/tasks" className="hover:text-slate-900 flex items-center gap-1">
          <ListTodo className="w-3.5 h-3.5" />
          المهام
        </Link>
        <ArrowRight className="w-3 h-3" />
        <span className="text-slate-900 font-medium truncate max-w-[200px]">{task.title}</span>
      </nav>

      {/* Task Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${priority.bg} ${priority.text}`}>
                  {priority.label}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">{task.title}</h1>
              {task.description && (
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{task.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsEditOpen(true)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6 border-b border-slate-100">
          {task.assigned_to && (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <User className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[10px] text-slate-400">المسؤول</p>
                <p className="font-medium">{task.assigned_to}</p>
              </div>
            </div>
          )}
          {task.due_date && (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[10px] text-slate-400">تاريخ التسليم</p>
                <p className="font-medium">{new Date(task.due_date).toLocaleDateString("ar-MA")}</p>
              </div>
            </div>
          )}
          {task.tags && (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Tag className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[10px] text-slate-400">الوسوم</p>
                <p className="font-medium">{task.tags}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Clock className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-[10px] text-slate-400">الساعات</p>
              <p className="font-medium">{task.actual_hours}/{task.estimated_hours}h</p>
            </div>
          </div>
        </div>

        {/* Status switcher */}
        <div className="p-6 border-b border-slate-100">
          <p className="text-xs font-bold text-slate-500 mb-3">تغيير الحالة</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_MAP).map(([key, val]) => (
              <button
                key={key}
                onClick={() => handleUpdateStatus(key as Task["status"])}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                  task.status === key
                    ? `${val.bg} ${val.text} border-transparent`
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                {val.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subtasks */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-slate-400" />
              المهام الفرعية
              {subtasks.length > 0 && (
                <span className="text-xs text-slate-400 font-normal">{doneSubtasks}/{subtasks.length}</span>
              )}
            </p>
          </div>

          {subtasks.length > 0 && (
            <div className="space-y-2 mb-4">
              {subtasks.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handleToggleSubtask(sub.id, sub.completed)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 text-right transition-colors"
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    sub.completed ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                  }`}>
                    {sub.completed ? <CheckCircle2 className="w-3 h-3 text-white" /> : null}
                  </div>
                  <span className={`text-sm ${sub.completed ? "line-through text-slate-400" : "text-slate-700"}`}>
                    {sub.title}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Add subtask */}
          <div className="flex items-center gap-2">
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
              placeholder="أضف مهمة فرعية..."
              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-300 bg-slate-50"
            />
            <button
              onClick={handleAddSubtask}
              disabled={addingSubtask || !newSubtask.trim()}
              className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <TaskModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSaveTask={handleSaveTask}
        taskToEdit={task}
        projects={projects}
        initialStatus={task.status}
      />
    </div>
  );
}
