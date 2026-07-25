"use client";

import React, { useState, useEffect } from "react";
import { authFetch } from "@/lib/clientAuth";
import {
  Cpu,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Check,
  X,
  Server,
  Zap,
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Key,
  Activity,
  Settings2,
} from "lucide-react";

interface AiProviderModel {
  id: number;
  provider_id: number;
  model_id: string;
  display_name: string;
  is_available: number;
}

interface AiProvider {
  id: number;
  name: string;
  base_url: string;
  api_key_masked: string;
  api_key_set: boolean;
  is_active: number;
  created_at: string;
  models: AiProviderModel[];
}

const AI_FEATURES = [
  {
    key: "task_generator",
    label: "توليد المهام والخطط",
    description: "إنشاء قوائم مهام تلقائية من وصف المشروع",
  },
  {
    key: "project_analyzer",
    label: "تحليل المشاريع والمخاطر",
    description: "تحليل أداء المشروع وتقديم توصيات ذكية",
  },
  {
    key: "content_writer",
    label: "كتابة المحتوى والأوصاف",
    description: "توليد أوصاف المهام والمشاريع والمحتوى",
  },
];

export const AiProvidersView: React.FC = () => {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [assignments, setAssignments] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Add provider modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addKey, setAddKey] = useState("");
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  // Edit provider modal
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editKey, setEditKey] = useState("");
  const [editing, setEditing] = useState(false);

  const [savingAssignment, setSavingAssignment] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = async () => {
    try {
      const res = await authFetch("/api/ai-providers");
      const data = await res.json();
      if (data.success) {
        setProviders(data.providers || []);
        setAssignments(data.assignments || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addUrl.trim() || !addKey.trim()) {
      setAddMsg("جميع الحقول مطلوبة");
      return;
    }
    setAdding(true);
    setAddMsg("");
    try {
      const res = await authFetch("/api/ai-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName,
          base_url: addUrl,
          api_key: addKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(
          `تم إضافة المزود "${addName}" مع ${data.models_count} نموذج متاح`,
        );
        setIsAddOpen(false);
        setAddName("");
        setAddUrl("");
        setAddKey("");
        fetchData();
      } else {
        setAddMsg(data.error || "فشل الإضافة");
      }
    } catch (err) {
      setAddMsg("خطأ في الاتصال");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteProvider = async (id: number, name: string) => {
    if (!confirm(`هل تريد حذف المزود "${name}" وجميع نماذجه؟`)) return;
    try {
      await authFetch(`/api/ai-providers?id=${id}`, { method: "DELETE" });
      showSuccess(`تم حذف المزود "${name}"`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditProvider = (p: AiProvider) => {
    setEditingProvider(p);
    setEditName(p.name);
    setEditUrl(p.base_url);
    setEditKey("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider) return;
    setEditing(true);
    try {
      const body: any = {
        id: editingProvider.id,
        name: editName,
        base_url: editUrl,
      };
      if (editKey.trim()) body.api_key = editKey;

      const res = await authFetch("/api/ai-providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("تم تحديث المزود وإعادة جلب النماذج");
        setEditingProvider(null);
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEditing(false);
    }
  };

  const handleAssignment = async (featureKey: string, providerId: number, modelId: string) => {
    if (!providerId || !modelId) return;
    setSavingAssignment(featureKey);
    try {
      await authFetch("/api/ai-providers/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature_key: featureKey,
          provider_id: providerId,
          model_id: modelId,
        }),
      });
      showSuccess("تم حفظ إسناد النموذج بنجاح");
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingAssignment(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span>جاري تحميل مزودي الذكاء الاصطناعي...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-l from-indigo-600 via-purple-600 to-blue-700 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Cpu className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">مزودو خدمات التحليل والذكاء الاصطناعي</h2>
              <p className="text-xs text-purple-100 mt-1">
                أضف مزود الخدمات السحابية للذكاء الاصطناعي — يتم تحديث النماذج تلقائياً وإسنادها لكل ميزة
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-white text-indigo-900 font-bold rounded-xl text-xs hover:bg-purple-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ إضافة مزود جديد</span>
          </button>
        </div>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-700 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Feature Model Assignments */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Settings2 className="w-5 h-5 text-slate-700" />
          <h3 className="font-bold text-slate-900 text-sm">
            إسناد النماذج لكل ميزة
          </h3>
        </div>

        {AI_FEATURES.map((feature) => {
          const current = assignments[feature.key] || {};
          return (
            <div
              key={feature.key}
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">
                    {feature.label}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {feature.description}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Provider select */}
                <select
                  value={current.provider_id || ""}
                  onChange={(e) =>
                    handleAssignment(
                      feature.key,
                      Number(e.target.value),
                      "",
                    )
                  }
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 min-w-[120px]"
                >
                  <option value="">اختر المزود</option>
                  {providers
                    .filter((p) => p.is_active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>

                {/* Model select (shows models from selected provider) */}
                {(() => {
                  const selectedProvider = providers.find(
                    (p) => p.id === current.provider_id,
                  );
                  return (
                    <select
                      value={current.model_id || ""}
                      onChange={(e) =>
                        handleAssignment(
                          feature.key,
                          current.provider_id,
                          e.target.value,
                        )
                      }
                      disabled={!selectedProvider}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 outline-none focus:border-indigo-500 min-w-[160px] disabled:opacity-50"
                    >
                      <option value="">اختر النموذج</option>
                      {selectedProvider?.models.map((m) => (
                        <option key={m.id} value={m.model_id}>
                          {m.model_id}
                        </option>
                      ))}
                    </select>
                  );
                })()}

                {savingAssignment === feature.key && (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                )}

                {current.model_id && savingAssignment !== feature.key && (
                  <Check className="w-4 h-4 text-emerald-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Providers List */}
      <div className="space-y-4">
        {providers.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-3">
            <Server className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-500 font-bold text-sm">
              لا توجد مزودات ذكاء اصطناعي مضافة بعد
            </p>
            <p className="text-slate-400 text-xs">
              أضف أي مزود متوافق مع OpenAI API — مثل api.openai.com/v1 أو
              api.ailogha.com/v1
            </p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أول مزود</span>
            </button>
          </div>
        ) : (
          providers.map((provider) => (
            <div
              key={provider.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Provider Header */}
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      provider.is_active
                        ? "bg-emerald-100"
                        : "bg-slate-100"
                    }`}
                  >
                    <Activity
                      className={`w-5 h-5 ${
                        provider.is_active
                          ? "text-emerald-600"
                          : "text-slate-400"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {provider.name}
                      </h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          provider.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {provider.is_active ? "نشط" : "معطل"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                      <Link2 className="w-3 h-3" />
                      <code className="font-mono">{provider.base_url}</code>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                      <Key className="w-3 h-3" />
                      <code className="font-mono">
                        {provider.api_key_masked}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleEditProvider(provider)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                    title="تعديل"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteProvider(provider.id, provider.name)
                    }
                    className="p-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Models Grid */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-600">
                    النماذج المتاحة ({provider.models.length})
                  </span>
                </div>
                {provider.models.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {provider.models.map((m) => (
                      <span
                        key={m.id}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] font-mono rounded-lg border border-slate-200 flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {m.model_id}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    لم يتم جلب أي نماذج. عدّل المزود وأعد الحفظ لإعادة المحاولة.
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Provider Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600" />
                إضافة مزود ذكاء اصطناعي
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProvider} className="p-6 space-y-4 text-xs">
              {addMsg && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-600 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {addMsg}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  اسم المزود *
                </label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="مثال: OpenAI / AILogha / مزودي الخاص"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  رابط الوصول للخدمة (URL) *
                </label>
                <input
                  type="text"
                  value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)}
                  placeholder="https://api.domain.com/v1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  رابط الموصل البرمجي الأساسي للخدمة
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  المفتاح السري المخصص للوصول *
                </label>
                <input
                  type="password"
                  value={addKey}
                  onChange={(e) => setAddKey(e.target.value)}
                  placeholder="أدخل الرمز السري للمزود..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  يتم حفظ الرمز مشفّراً وبأمان تام
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md disabled:opacity-50 flex items-center gap-2"
                >
                  {adding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ وجلب النماذج...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>حفظ وجلب النماذج</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Provider Modal */}
      {editingProvider && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                تعديل المزود: {editingProvider.name}
              </h3>
              <button
                onClick={() => setEditingProvider(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  اسم المزود
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  رابط الوصول
                </label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  مفتاح API جديد (اتركه فارغاً للإبقاء على الحالي)
                </label>
                <input
                  type="password"
                  value={editKey}
                  onChange={(e) => setEditKey(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  تغيير الرابط أو المفتاح يعيد جلب النماذج تلقائياً
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingProvider(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md disabled:opacity-50 flex items-center gap-2"
                >
                  {editing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  حفظ وإعادة جلب النماذج
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
