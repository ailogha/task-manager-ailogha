"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { authFetch } from "@/lib/clientAuth";
import { KanbanView } from "@/components/KanbanView";
import { TaskModal } from "@/components/TaskModal";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { ProjectModal } from "@/components/ProjectModal";
import { Project, Task } from "@/lib/db";
import {
  ArrowRight, Edit2, Trash2, FolderKanban,
  CheckCircle2, Clock, AlertCircle, BarChart3,
} from "lucide-react";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = Number(id);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskModalStatus, setTaskModalStatus] = useState("todo");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        authFetch("/api/projects"),
        authFetch(`/api/tasks?project_id=${projectId}`),
      ]);
      const [p, t] = await Promise.all([pRes.json(), tRes.json()]);
      if (p.success) {
        setAllProjects(p.projects ?? []);
        setProject(p.projects?.find((x: Project) => x.id === projectId) ?? null);
      }
      if (t.success) setTasks(t.tasks ?? []);
    } catch {}
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleSaveTask = async (taskData: any) => {
    const method = taskData.id ? "PUT" : "POST";
    await authFetch("/api/tasks", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskData, project_id: taskData.project_id ?? projectId }),
    });
    await load();
    setIsTaskModalOpen(false);
  };

  const handleUpdateStatus = async (taskId: number, newStatus: Task["status"]) => {
    await authFetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, status: newStatus }),
    });
    await load();
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("حذف المهمة؟")) return;
    await authFetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
    await load();
  };

  const handleSaveProject = async (projData: any) => {
    await authFetch("/api/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projData),
    });
    await load();
    setIsEditProjectOpen(false);
  };

  const handleDeleteProject = async () => {
    if (!confirm("حذف المشروع وجميع مهامه؟")) return;
    await authFetch(`/api/projects?id=${projectId}`, { method: "DELETE" });
    router.push("/projects");
  };

  const done = tasks.filter((t) => t.status === "completed").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const todo = tasks.filter((t) => t.status === "todo").length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400" dir="rtl">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin ml-2" />
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/projects" className="hover:text-slate-900 flex items-center gap-1">
          <FolderKanban className="w-3.5 h-3.5" />
          المشاريع
        </Link>
        <ArrowRight className="w-3 h-3" />
        <span className="text-slate-900 font-medium">{project.name}</span>
      </nav>

      {/* Project Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: project.color || "#3b82f6" }}>
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{project.name}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{project.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsEditProjectOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDeleteProject}
              className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {[
            { label: "إجمالي المهام", value: tasks.length, icon: BarChart3, color: "text-slate-600" },
            { label: "مكتملة", value: done, icon: CheckCircle2, color: "text-emerald-600" },
            { label: "جارية", value: inProgress, icon: Clock, color: "text-blue-600" },
            { label: "قيد الانتظار", value: todo, icon: AlertCircle, color: "text-amber-500" },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <stat.icon className={`w-4 h-4 ${stat.color} mb-2`} />
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>تقدم المشروع</span>
            <span className="font-bold text-slate-700">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: project.color || "#3b82f6" }}
            />
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanView
        tasks={tasks}
        projects={allProjects}
        selectedProjectId={projectId}
        setSelectedProjectId={() => {}}
        onOpenNewTaskModal={(status) => {
          setTaskToEdit(null);
          setTaskModalStatus(status || "todo");
          setIsTaskModalOpen(true);
        }}
        onOpenTaskDetailModal={(task) => {
          setActiveTask(task);
          setIsDetailModalOpen(true);
        }}
        onUpdateTaskStatus={handleUpdateStatus}
        onDeleteTask={handleDeleteTask}
      />

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSaveTask={handleSaveTask}
        taskToEdit={taskToEdit}
        projects={allProjects}
        initialStatus={taskModalStatus}
      />
      <TaskDetailModal
        isOpen={isDetailModalOpen}
        task={activeTask}
        onClose={() => setIsDetailModalOpen(false)}
        onEditTask={(task) => {
          setTaskToEdit(task);
          setIsDetailModalOpen(false);
          setIsTaskModalOpen(true);
        }}
        onDeleteTask={handleDeleteTask}
        onUpdateStatus={handleUpdateStatus}
        onRefreshData={load}
      />
      <ProjectModal
        isOpen={isEditProjectOpen}
        onClose={() => setIsEditProjectOpen(false)}
        onSaveProject={handleSaveProject}
        projectToEdit={project}
      />
    </div>
  );
}
