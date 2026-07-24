"use client";

import React, { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/clientAuth";
import { AiAssistantView } from "@/components/AiAssistantView";

export default function AiPage() {
  const [projects, setProjects] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await authFetch("/api/projects");
      const d = await res.json();
      if (d.success) setProjects(d.projects ?? []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  return <AiAssistantView projects={projects} onRefreshData={load} />;
}
