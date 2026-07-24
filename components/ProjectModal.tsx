"use client";

import React, { useState, useEffect } from "react";
import { X, FolderPlus } from "lucide-react";
import { Project } from "@/lib/db";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProject: (projectData: any) => Promise<void>;
  projectToEdit?: Project | null;
}

const COLOR_OPTIONS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#8b5cf6", // Violet
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#ef4444", // Red
];

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSaveProject,
  projectToEdit = null,
}) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("عام");
  const [color, setColor] = useState("#3b82f6");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    React.startTransition(() => {
      if (projectToEdit) {
        setName(projectToEdit.name || "");
        setCategory(projectToEdit.category || "عام");
        setColor(projectToEdit.color || "#3b82f6");
        setDescription(projectToEdit.description || "");
      } else {
        setName("");
        setCategory("عام");
        setColor("#3b82f6");
        setDescription("");
      }
    });
  }, [projectToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("اسم المشروع مطلوب");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveProject({
        id: projectToEdit?.id,
        name: name.trim(),
        category,
        color,
        description: description.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert("فشل حفظ المشروع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-extrabold text-slate-900 text-base">
            {projectToEdit ? "تعديل المشروع" : "إنشاء مشروع جديد"}
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
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              اسم المشروع *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: تطبيق الجوال أو الحملة التسويقية..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                الفئة
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
              >
                <option value="برمجيات">برمجيات</option>
                <option value="تسويق">تسويق</option>
                <option value="تصميم">تصميم</option>
                <option value="عام">عام</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                اللون المميز
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      color === c
                        ? "scale-125 ring-2 ring-offset-2 ring-slate-400"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              وصف المشروع
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف إضافي للمشروع ونطاق العمل..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none"
            />
          </div>

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
                : projectToEdit
                  ? "تحديث"
                  : "إنشاء المشروع"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
