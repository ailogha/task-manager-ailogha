"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/clientAuth";
import { DashboardView } from "@/components/DashboardView";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      await authFetch("/api/db/init");
      const [pRes, tRes, sRes] = await Promise.all([
        authFetch("/api/projects"),
        authFetch("/api/tasks"),
        authFetch("/api/stats"),
      ]);
      const [p, t, s] = await Promise.all([pRes.json(), tRes.json(), sRes.json()]);
      if (p.success) setProjects(p.projects ?? []);
      if (t.success) setTasks(t.tasks ?? []);
      if (s.success) setStats(s.stats ?? null);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("app-refresh", load);
    return () => window.removeEventListener("app-refresh", load);
  }, [load]);

  return (
    <DashboardView
      stats={stats}
      projects={projects}
      tasks={tasks}
      onOpenNewTaskModal={() => router.push("/tasks?new=1")}
      onOpenNewProjectModal={() => router.push("/projects?new=1")}
      onSwitchView={(view: string) => {
        const map: Record<string, string> = {
          projects: "/projects",
          kanban: "/kanban",
          tasks: "/tasks",
          users: "/users",
          ai: "/ai",
          settings: "/settings",
        };
        router.push(map[view] ?? "/dashboard");
      }}
    />
  );
}
