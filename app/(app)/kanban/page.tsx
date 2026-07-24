"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authFetch } from "@/lib/clientAuth";
import { KanbanView } from "@/components/KanbanView";
import { TaskModal } from "@/components/TaskModal";
import { Task, Project } from "@/lib/db";

export default function KanbanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectParam = searchParams.get("project");
  const [selectedProjectId, setSelectedProjectId] = useState<number | "all">(
    projectParam ? Number(projectParam) : "all"
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskModalStatus, setTaskModalStatus] = useState("todo");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        authFetch("/api/tasks"),
        authFetch("/api/projects"),
      ]);
      const [t, p] = await Promise.all([tRes.json(), pRes.json()]);
      if (t.success) setTasks(t.tasks ?? []);
      if (p.success) setProjects(p.projects ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("app-refresh", load);
    return () => window.removeEventListener("app-refresh", load);
  }, [load]);

  const handleSaveTask = async (taskData: any) => {
    const method = taskData.id ? "PUT" : "POST";
    await authFetch("/api/tasks", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
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

  return (
    <>
      <KanbanView
        tasks={tasks}
        projects={projects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={(id) => {
          setSelectedProjectId(id);
          const param = id === "all" ? "" : `?project=${id}`;
          router.replace(`/kanban${param}`);
        }}
        onOpenNewTaskModal={(status) => {
          setTaskToEdit(null);
          setTaskModalStatus(status || "todo");
          setIsTaskModalOpen(true);
        }}
        onOpenTaskDetailModal={(task) => router.push(`/tasks/${task.id}`)}
        onUpdateTaskStatus={handleUpdateStatus}
        onDeleteTask={handleDeleteTask}
      />
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSaveTask={handleSaveTask}
        taskToEdit={taskToEdit}
        projects={projects}
        initialStatus={taskModalStatus}
      />
    </>
  );
}
