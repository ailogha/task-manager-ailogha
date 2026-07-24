"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authFetch } from "@/lib/clientAuth";
import { ProjectsView } from "@/components/ProjectsView";
import { ProjectModal } from "@/components/ProjectModal";
import { Project } from "@/lib/db";

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authFetch("/api/projects");
      const data = await res.json();
      if (data.success) setProjects(data.projects ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    if (searchParams.get("new") === "1") setIsModalOpen(true);
    window.addEventListener("app-refresh", load);
    return () => window.removeEventListener("app-refresh", load);
  }, [load, searchParams]);

  const handleSave = async (projData: any) => {
    const method = projData.id ? "PUT" : "POST";
    const res = await authFetch("/api/projects", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projData),
    });
    const data = await res.json();
    if (data.success) { await load(); setIsModalOpen(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف المشروع وجميع مهامه؟")) return;
    await authFetch(`/api/projects?id=${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <>
      <ProjectsView
        projects={projects}
        onOpenNewProjectModal={() => { setProjectToEdit(null); setIsModalOpen(true); }}
        onEditProject={(p) => { setProjectToEdit(p); setIsModalOpen(true); }}
        onDeleteProject={handleDelete}
        onSelectProjectForKanban={(id) => router.push(`/kanban?project=${id}`)}
      />
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveProject={handleSave}
        projectToEdit={projectToEdit}
      />
    </>
  );
}
