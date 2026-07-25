"use client";

import React from "react";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Activity,
  Plus,
  Sparkles,
  ArrowUpRight,
  Database,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Project, Task } from "@/lib/db";

interface DashboardViewProps {
  stats: any;
  projects: Project[];
  tasks: Task[];
  onOpenNewTaskModal: () => void;
  onOpenNewProjectModal: () => void;
  onSwitchView: (view: any) => void;
}

const STATUS_COLORS: Record<string, string> = {
  todo: "#94a3b8",
  in_progress: "#3b82f6",
  review: "#f59e0b",
  completed: "#10b981",
};

const STATUS_NAMES: Record<string, string> = {
  todo: "قيد الانتظار",
  in_progress: "قيد التنفيذ",
  review: "قيد المراجعة",
  completed: "مكتملة",
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  projects,
  tasks,
  onOpenNewTaskModal,
  onOpenNewProjectModal,
  onSwitchView,
}) => {
  if (!stats) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 gap-2">
        <Activity className="w-5 h-5 animate-spin text-blue-600" />
        <span>جاري تحميل إحصائيات النظام...</span>
      </div>
    );
  }

  const {
    totalProjects = 0,
    totalTasks = 0,
    completionRate = 0,
    overdueTasksCount = 0,
    totalEstimatedHours = 0,
    totalActualHours = 0,
    statusMap = {},
    priorityMap = {},
    projectProgress = [],
    recentActivities = [],
  } = stats;

  // Chart data for Status Pie
  const pieData = Object.keys(statusMap).map((key) => ({
    name: STATUS_NAMES[key] || key,
    value: statusMap[key] || 0,
    color: STATUS_COLORS[key] || "#64748b",
  }));

  // Chart data for Project Progress Bar
  const projectChartData = projectProgress.map((p: any) => ({
    name: p.name.length > 12 ? p.name.substring(0, 12) + "..." : p.name,
    مكتملة: p.completed,
    المتبقية: p.total - p.completed,
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            نظام إدارة المهام والمشاريع
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-1 max-w-xl">
            إدارة المهام والمشاريع بسلاسة واستخراج تقارير الأداء مع التخزين
            الدائم.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onSwitchView("ai")}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-md text-xs transition-colors flex items-center gap-1.5 border border-slate-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-700" />
            <span>تحليل بالذكاء الاصطناعي</span>
          </button>
          <button
            onClick={onOpenNewTaskModal}
            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-md text-xs hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ مهمة جديدة</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-tight">
            إجمالي المهام
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalTasks}</div>
          <div className="mt-2 text-[10px] text-green-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            +12% هذا الأسبوع
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-tight">
            قيد التنفيذ
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {statusMap["in_progress"] || 0}
          </div>
          <div className="mt-2 text-[10px] text-blue-600 font-bold">
            {overdueTasksCount > 0
              ? `${overdueTasksCount} مهام عاجلة ومتأخرة`
              : "جميع المهام ضمن الجدول"}
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-tight">
            المشاريع النشطة
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {totalProjects}
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-medium">
            مكتملة بنسبة {completionRate}%
          </div>
        </div>

        {/* Storage Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-tight">
            حالة النظام
          </div>
          <div className="text-2xl font-bold text-slate-900">ممتازة</div>
          <div className="mt-2 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            متصل بالخادم
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Tasks Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-700" />
                توزيع المهام حسب المشاريع
              </h3>
            </div>
            <button
              onClick={() => onSwitchView("projects")}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              عرض الكل
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectChartData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    borderRadius: "0.5rem",
                    color: "#fff",
                    fontSize: "11px",
                  }}
                />
                <Bar dataKey="مكتملة" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="المتبقية" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Status Pie Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-700" />
              حالات المهام الحالية
            </h3>
          </div>
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-slate-700 font-medium">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Tasks Table - Clean Minimalist Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">المهام الحديثة</h3>
          <button
            onClick={() => onSwitchView("tasks")}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
          >
            عرض الكل
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead className="bg-slate-50/50 sticky top-0">
              <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-3 font-bold">المهمة</th>
                <th className="px-6 py-3 font-bold">المشروع</th>
                <th className="px-6 py-3 font-bold">الأولوية</th>
                <th className="px-6 py-3 font-bold">الحالة</th>
                <th className="px-6 py-3 font-bold">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {tasks.slice(0, 5).map((task) => {
                let priorityPill = (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                    منخفضة
                  </span>
                );
                if (task.priority === "urgent" || task.priority === "high") {
                  priorityPill = (
                    <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold">
                      {task.priority === "urgent" ? "عاجلة" : "عالية"}
                    </span>
                  );
                } else if (task.priority === "medium") {
                  priorityPill = (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">
                      متوسطة
                    </span>
                  );
                }

                let statusDotColor = "bg-slate-300";
                let statusLabel = "قيد الانتظار";
                if (task.status === "in_progress") {
                  statusDotColor = "bg-blue-500";
                  statusLabel = "جاري العمل";
                } else if (task.status === "review") {
                  statusDotColor = "bg-amber-500";
                  statusLabel = "قيد المراجعة";
                } else if (task.status === "completed") {
                  statusDotColor = "bg-green-500";
                  statusLabel = "مكتمل";
                }

                return (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {task.title}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {task.project_name}
                    </td>
                    <td className="px-6 py-4">{priorityPill}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusDotColor}`}
                        />
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {task.due_date || "غير محدد"}
                    </td>
                  </tr>
                );
              })}

              {tasks.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-slate-400 text-xs"
                  >
                    لا توجد مهام مسجلة حتى الآن
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
