"use client";

import React, { useState, useEffect } from "react";
import { authFetch } from "@/lib/clientAuth";
import {
  Sparkles,
  Bot,
  Plus,
  CheckCircle2,
  ListPlus,
  Loader2,
  FileText,
  AlertCircle,
  Database,
  ArrowLeft,
} from "lucide-react";
import { Project } from "@/lib/db";

interface AiAssistantViewProps {
  projects: Project[];
  onRefreshData: () => void;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  projects,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<"generator" | "analyzer">(
    "generator",
  );

  // Generator state
  const [selectedProjectId, setSelectedProjectId] = useState<number | "new">(
    projects[0]?.id || "new",
  );
  const [projectNameInput, setProjectNameInput] = useState<string>("");
  const [projectDescInput, setProjectDescInput] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedTasks, setGeneratedTasks] = useState<any[]>([]);
  const [insertedSuccess, setInsertedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (projects.length > 0 && selectedProjectId === "new") {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects]);

  useEffect(() => {
    if (projects.length > 0) {
      setAnalyzingProjectId(projects[0].id);
    }
  }, [projects, projects.length]);

  // Analyzer state
  const [analyzingProjectId, setAnalyzingProjectId] = useState<number>(
    projects[0]?.id || 1,
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<string>("");

  // Handle task generation
  const handleGeneratePlan = async () => {
    let name = projectNameInput;
    let desc = projectDescInput;

    if (selectedProjectId !== "new") {
      const targetProj = projects.find(
        (p) => p.id === Number(selectedProjectId),
      );
      if (targetProj) {
        name = targetProj.name;
        desc = targetProj.description;
      }
    }

    if (!name.trim()) {
      alert("يرجى تحديد اسم المشروع أو إدخال عنوان");
      return;
    }

    setIsGenerating(true);
    setInsertedSuccess(false);
    try {
      const res = await authFetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_subtasks",
          projectName: name,
          projectDescription: desc,
        }),
      });

      const data = await res.json();
      if (data.tasks) {
        setGeneratedTasks(data.tasks);
      } else if (data.aiResponse) {
        setGeneratedTasks(data.aiResponse);
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء توليد المهام بالذكاء الاصطناعي");
    } finally {
      setIsGenerating(false);
    }
  };

  // Insert generated tasks into SQLite DB
  const handleInsertTasksToDb = async () => {
    if (generatedTasks.length === 0) return;

    let targetProjId = selectedProjectId;

    // If new project creation needed first
    if (selectedProjectId === "new") {
      try {
        const pRes = await authFetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: projectNameInput || "مشروع جديد من الذكاء الاصطناعي",
            description:
              projectDescInput || "مُولد تلقائياً بواسطة الذكاء الاصطناعي",
            color: "#8b5cf6",
            category: "عام",
          }),
        });
        const pData = await pRes.json();
        if (pData.project) {
          targetProjId = pData.project.id;
        }
      } catch (err) {
        console.error(err);
      }
    }

    // Insert tasks one by one
    try {
      for (const t of generatedTasks) {
        await authFetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: targetProjId,
            title: t.title,
            description: t.description || "",
            status: "todo",
            priority: t.priority || "medium",
            estimated_hours: t.estimated_hours || 4,
          }),
        });
      }

      setInsertedSuccess(true);
      onRefreshData();
    } catch (err) {
      console.error(err);
      alert("فشل حفظ المهام في قاعدة بيانات SQLite");
    }
  };

  // Handle project analysis
  const handleAnalyzeProject = async () => {
    const proj = projects.find((p) => p.id === Number(analyzingProjectId));
    if (!proj) return;

    setIsAnalyzing(true);
    try {
      const tasksRes = await authFetch(`/api/tasks?project_id=${proj.id}`);
      const tasksData = await tasksRes.json();

      const res = await authFetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze_project",
          projectName: proj.name,
          taskList: tasksData.tasks || [],
        }),
      });

      const data = await res.json();
      setAnalysisResult(data.summary || data.note || "تم التحليل بنجاح.");
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء إجراء التحليل الذكي");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              المساعد الذكي لإدارة المهام والتخطيط (Gemini AI)
            </h2>
            <p className="text-xs text-purple-100 mt-1">
              توليد تلقائي للمهام والجدولة وإعداد التوصيات الذكية لتقليل المخاطر
              وزيادة الإنتاجية.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-6 border-t border-white/10 pt-4">
          <button
            onClick={() => setActiveTab("generator")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "generator"
                ? "bg-white text-purple-900 shadow-sm"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <ListPlus className="w-4 h-4" />
            <span>توليد خطة مهام لمشروع</span>
          </button>

          <button
            onClick={() => setActiveTab("analyzer")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "analyzer"
                ? "bg-white text-purple-900 shadow-sm"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>تحليل وتقييم المشروع الحقيقي</span>
          </button>
        </div>
      </div>

      {activeTab === "generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              إعدادات توليد الخطة
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  اختر المشروع المقترن
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) =>
                    setSelectedProjectId(
                      e.target.value === "new" ? "new" : Number(e.target.value),
                    )
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="new">+ إنشاء مشروع جديد مع المهام</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProjectId === "new" && (
                <>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      اسم المشروع الجديد
                    </label>
                    <input
                      type="text"
                      value={projectNameInput}
                      onChange={(e) => setProjectNameInput(e.target.value)}
                      placeholder="مثال: إطلاق المتجر الإلكتروني..."
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      وصف أو أهداف المشروع
                    </label>
                    <textarea
                      value={projectDescInput}
                      onChange={(e) => setProjectDescInput(e.target.value)}
                      placeholder="توضيح مختصر للأهداف والمخرجات..."
                      rows={3}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none"
                    />
                  </div>
                </>
              )}

              <button
                onClick={handleGeneratePlan}
                disabled={isGenerating}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحليل وتوليد المهام...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>توليد المهام بالذكاء الاصطناعي</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result Preview */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                المهام المولّدة المقترحة
              </h3>
              {generatedTasks.length > 0 && (
                <button
                  onClick={handleInsertTasksToDb}
                  disabled={insertedSuccess}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>
                    {insertedSuccess
                      ? "تم حفظها بقاعدة SQLite بنجاح!"
                      : "حفظ جميع المهام في SQLite"}
                  </span>
                </button>
              )}
            </div>

            {generatedTasks.length > 0 ? (
              <div className="space-y-3">
                {generatedTasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {idx + 1}. {task.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-medium">
                          {task.estimated_hours || 4} ساعات
                        </span>
                        <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold uppercase">
                          {task.priority || "medium"}
                        </span>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-slate-600 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl">
                اضغط على زر &quot;توليد المهام&quot; لمعالجة المشروع واستخراج
                قائمة المهام المنظمة تلقائياً.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "analyzer" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 max-w-3xl">
          <h3 className="font-bold text-slate-900 text-sm">
            مستشار تحليل المشاريع والمخاطر
          </h3>

          <div className="flex items-center gap-3">
            <select
              value={analyzingProjectId}
              onChange={(e) => setAnalyzingProjectId(Number(e.target.value))}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none flex-1"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleAnalyzeProject}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تحليل البيانات...</span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4" />
                  <span>بدء التحليل التشخيصي</span>
                </>
              )}
            </button>
          </div>

          {analysisResult && (
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs leading-relaxed space-y-2 font-mono whitespace-pre-wrap">
              <p className="text-amber-300 font-bold font-sans">
                📌 التقرير التشخيصي من الذكاء الاصطناعي:
              </p>
              {analysisResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
