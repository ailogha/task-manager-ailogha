"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  CheckSquare,
  Clock,
  User,
  Tag,
  Calendar,
  Layers,
} from "lucide-react";
import { Project, Task } from "@/lib/db";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onSaveTask: (taskData: any) => Promise<void>;
  initialStatus?: string;
  taskToEdit?: Task | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  projects,
  onSaveTask,
  initialStatus = "todo",
  taskToEdit = null,
}) => {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<number>(projects[0]?.id || 1);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>(
    (initialStatus as any) || "todo",
  );
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState<number>(4);
  const [actualHours, setActualHours] = useState<number>(0);
  const [tags, setTags] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [subtasks, setSubtasks] = useState<
    { title: string; completed: number }[]
  >([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    React.startTransition(() => {
      if (taskToEdit) {
        setTitle(taskToEdit.title || "");
        setProjectId(taskToEdit.project_id || projects[0]?.id || 1);
        setDescription(taskToEdit.description || "");
        setStatus(taskToEdit.status || "todo");
        setPriority(taskToEdit.priority || "medium");
        setDueDate(taskToEdit.due_date || "");
        setEstimatedHours(taskToEdit.estimated_hours || 4);
        setActualHours(taskToEdit.actual_hours || 0);
        setTags(taskToEdit.tags || "");
        setAssignedTo(taskToEdit.assigned_to || "");
        setSubtasks(
          taskToEdit.subtasks?.map((s) => ({
            title: s.title,
            completed: s.completed,
          })) || [],
        );
      } else {
        setTitle("");
        setProjectId(projects[0]?.id || 1);
        setDescription("");
        setStatus((initialStatus as any) || "todo");
        setPriority("medium");
        setDueDate("");
        setEstimatedHours(4);
        setActualHours(0);
        setTags("");
        setAssignedTo("");
        setSubtasks([]);
      }
    });
  }, [taskToEdit, initialStatus, projects, isOpen]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { title: newSubtaskTitle.trim(), completed: 0 }]);
    setNewSubtaskTitle("");
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("يرجى تحديد عنوان المهمة");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveTask({
        id: taskToEdit?.id,
        project_id: Number(projectId),
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        due_date: dueDate || null,
        estimated_hours: Number(estimatedHours) || 0,
        actual_hours: Number(actualHours) || 0,
        tags: tags.trim(),
        assigned_to: assignedTo.trim(),
        subtasks,
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert("فشل حفظ المهمة");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-extrabold text-slate-900 text-base">
            {taskToEdit ? "تعديل بيانات المهمة" : "إضافة مهمة جديدة"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              عنوان المهمة *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: إعداد وثائق المشروع وإعادة مراجعة البرمجة..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
              required
            />
          </div>

          {/* Project & Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                المشروع
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                الحالة
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
              >
                <option value="todo">قيد الانتظار</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="review">قيد المراجعة</option>
                <option value="completed">مكتملة</option>
              </select>
            </div>
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                الأولوية
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
              >
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
                <option value="urgent">عاجلة جداً</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                تاريخ الاستحقاق
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
          </div>

          {/* Hours & Assigned */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                الساعات المتوقعة
              </label>
              <input
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                الساعات الفعلية
              </label>
              <input
                type="number"
                value={actualHours}
                onChange={(e) => setActualHours(Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                المُكلف بالمهمة
              </label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="اسم الموظف..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              الوصف والتفاصيل
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف إضافي للمهمة وتفاصيل التنفيذ..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              الأوسمة والتصنيفات (تفصل بينها فاصلة)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="مثال: برمجيات, تصميم, مراجعة"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>

          {/* Subtasks Builder */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <label className="block text-slate-700 font-bold">
              قائمة المهام الفرعية (Checklist)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="إضافة بند فرعي جديد..."
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shrink-0"
              >
                إضافة
              </button>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pt-1">
                {subtasks.map((st, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800"
                  >
                    <span className="font-medium">{st.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(idx)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-md transition-colors shadow-xs"
            >
              {isSubmitting
                ? "جاري الحفظ..."
                : taskToEdit
                  ? "تحديث المهمة"
                  : "حفظ المهمة في SQLite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
