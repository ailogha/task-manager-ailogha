"use client";

import React, { useState } from "react";
import { authFetch } from "@/lib/clientAuth";
import {
  X,
  CheckSquare,
  Clock,
  User,
  Calendar,
  Tag,
  Trash2,
  Edit2,
  Plus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Task, Subtask } from "@/lib/db";

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (taskId: number, status: Task["status"]) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
  onRefreshData: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onUpdateStatus,
  onEditTask,
  onDeleteTask,
  onRefreshData,
}) => {
  const [newSubtask, setNewSubtask] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);

  if (!isOpen || !task) return null;

  // Toggle subtask completed state in SQLite
  const handleToggleSubtask = async (
    subtaskId: number,
    currentCompleted: number,
  ) => {
    try {
      await authFetch("/api/subtasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: subtaskId,
          completed: currentCompleted === 1 ? 0 : 1,
        }),
      });
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  // Add new subtask to SQLite
  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    setAddingSubtask(true);
    try {
      await authFetch("/api/subtasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: task.id,
          title: newSubtask.trim(),
        }),
      });
      setNewSubtask("");
      onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingSubtask(false);
    }
  };

  // Delete subtask from SQLite
  const handleDeleteSubtask = async (subtaskId: number) => {
    try {
      await authFetch(`/api/subtasks?id=${subtaskId}`, { method: "DELETE" });
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const completedSubtasks =
    task.subtasks?.filter((s) => s.completed === 1).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const subtaskProgress =
    totalSubtasks > 0
      ? Math.round((completedSubtasks / totalSubtasks) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: `${task.project_color || "#3b82f6"}15`,
                color: task.project_color || "#3b82f6",
              }}
            >
              {task.project_name}
            </span>
            <h3 className="font-extrabold text-slate-900 text-base leading-snug">
              {task.title}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onClose();
                onEditTask(task);
              }}
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-200 transition-colors"
              title="تعديل"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onClose();
                onDeleteTask(task.id);
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-200 transition-colors"
              title="حذف"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-slate-400 block text-[10px] font-bold">
                الحالة
              </span>
              <select
                value={task.status}
                onChange={(e) => onUpdateStatus(task.id, e.target.value as any)}
                className="mt-0.5 bg-white border border-slate-200 rounded px-1.5 py-0.5 font-bold text-slate-800 outline-none"
              >
                <option value="todo">قيد الانتظار</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="review">قيد المراجعة</option>
                <option value="completed">مكتملة</option>
              </select>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] font-bold">
                الأولوية
              </span>
              <span className="font-bold text-slate-800 uppercase mt-1 block">
                {task.priority}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] font-bold">
                المُكلف
              </span>
              <span className="font-medium text-slate-800 mt-1 block">
                {task.assigned_to || "غير محدد"}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] font-bold">
                تاريخ الاستحقاق
              </span>
              <span className="font-medium text-slate-800 mt-1 block">
                {task.due_date || "بدون تاريخ"}
              </span>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900">الوصف التفصيلي:</h4>
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                {task.description}
              </p>
            </div>
          )}

          {/* Hours logged */}
          <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-blue-900 font-medium">
            <span className="flex items-center gap-1.5 font-bold">
              <Clock className="w-4 h-4 text-blue-600" />
              ساعات العمل
            </span>
            <span className="font-mono font-bold">
              مبذول: {task.actual_hours} ساعة / متوقع: {task.estimated_hours}{" "}
              ساعة
            </span>
          </div>

          {/* Subtasks Checklist */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                المهام الفرعية ({completedSubtasks}/{totalSubtasks})
              </h4>
              <span className="font-mono text-xs font-bold text-blue-600">
                {subtaskProgress}%
              </span>
            </div>

            {totalSubtasks > 0 && (
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${subtaskProgress}%` }}
                />
              </div>
            )}

            {/* List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {task.subtasks?.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-colors"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={st.completed === 1}
                      onChange={() => handleToggleSubtask(st.id, st.completed)}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                    />
                    <span
                      className={
                        st.completed === 1 ? "line-through text-slate-400" : ""
                      }
                    >
                      {st.title}
                    </span>
                  </label>

                  <button
                    onClick={() => handleDeleteSubtask(st.id)}
                    className="p-1 text-slate-300 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Subtask input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="إضافة بند جديد للمهمة..."
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
              <button
                onClick={handleAddSubtask}
                disabled={addingSubtask}
                className="px-3 py-1.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shrink-0"
              >
                إضافة
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
