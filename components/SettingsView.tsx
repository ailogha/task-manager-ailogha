"use client";

import React, { useState, useEffect, useRef } from "react";
import { authFetch } from "@/lib/clientAuth";
import {
  Settings,
  Image as ImageIcon,
  Save,
  Upload,
  Trash2,
  Palette,
  Building2,
  Mail,
  Globe,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Type,
  FileText,
} from "lucide-react";

interface PlatformSettings {
  platform_name: string;
  platform_description: string;
  platform_logo: string;
  platform_icon: string;
  primary_color: string;
  company_name: string;
  contact_email: string;
  default_language: string;
  default_role: string;
}

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const COLOR_PRESETS = [
    "#0f172a",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#ef4444",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
  ];

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await authFetch("/api/settings");
        const data = await res.json();
        if (data.success) {
          setSettings(data.settings);
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("فشل تحميل الإعدادات");
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await authFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("تم حفظ الإعدادات بنجاح! سيتم تحديث الواجهة فوراً.");
        setTimeout(() => setSuccessMsg(""), 4000);
        // Trigger a refresh so other components pick up changes
        window.dispatchEvent(new Event("settings-updated"));
      } else {
        setErrorMsg(data.error || "فشل حفظ الإعدادات");
      }
    } catch (err) {
      setErrorMsg("خطأ في الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (
    file: File,
    type: "logo" | "icon",
  ) => {
    const setter = type === "logo" ? setUploadingLogo : setUploadingIcon;
    setter(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const token = JSON.parse(
        localStorage.getItem("taskManagerUser") || "{}",
      ).token;

      const res = await fetch("/api/settings/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();

      if (data.success && settings) {
        const key = type === "logo" ? "platform_logo" : "platform_icon";
        setSettings({ ...settings, [key]: data.url });
        setSuccessMsg(`تم رفع ${type === "logo" ? "الشعار" : "الأيقونة"} بنجاح`);
        setTimeout(() => setSuccessMsg(""), 3000);
        window.dispatchEvent(new Event("settings-updated"));
      } else {
        setErrorMsg(data.error || "فشل رفع الملف");
      }
    } catch (err) {
      setErrorMsg("خطأ أثناء رفع الملف");
    } finally {
      setter(false);
    }
  };

  const handleRemoveImage = (type: "logo" | "icon") => {
    if (!settings) return;
    const key = type === "logo" ? "platform_logo" : "platform_icon";
    setSettings({ ...settings, [key]: "" });
    // Also save to DB
    authFetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: "" }),
    });
    window.dispatchEvent(new Event("settings-updated"));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span>جاري تحميل إعدادات المنصة...</span>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-lg mx-auto mt-12">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="text-slate-600 text-sm">تعذّر تحميل الإعدادات</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              صلاحية المدير العام
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-700" />
            الإعدادات العامة للمنصة
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-1 max-w-xl">
            خصّص اسم المنصة، الوصف، الشعار، الأيقونة، والألوان. تنطبق التغييرات
            فوراً على كامل الواجهة.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-slate-900 text-white font-bold rounded-md text-xs hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50 shrink-0"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري الحفظ...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>حفظ التغييرات</span>
            </>
          )}
        </button>
      </div>

      {/* Success / Error Messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-700 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-700 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Logo & Icon Upload Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <ImageIcon className="w-5 h-5 text-slate-700" />
          <h3 className="font-bold text-slate-900 text-sm">
            الشعار والأيقونة
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo Upload */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              شعار المنصة (Logo)
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                {settings.platform_logo ? (
                  <img
                    src={settings.platform_logo}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f, "logo");
                  }}
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-md border border-slate-200 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {uploadingLogo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  رفع شعار
                </button>
                {settings.platform_logo && (
                  <button
                    onClick={() => handleRemoveImage("logo")}
                    className="px-3 py-1.5 text-red-600 hover:bg-red-50 text-xs font-bold rounded-md border border-red-200 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
                  </button>
                )}
                <p className="text-[10px] text-slate-400">
                  PNG / JPEG / SVG / WebP — أقصى حجم 2 ميجابايت
                </p>
              </div>
            </div>
          </div>

          {/* Icon Upload (favicon) */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              أيقونة المنصة (Favicon)
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                {settings.platform_icon ? (
                  <img
                    src={settings.platform_icon}
                    alt="Icon"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Type className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={iconInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f, "icon");
                  }}
                />
                <button
                  onClick={() => iconInputRef.current?.click()}
                  disabled={uploadingIcon}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-md border border-slate-200 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {uploadingIcon ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  رفع أيقونة
                </button>
                {settings.platform_icon && (
                  <button
                    onClick={() => handleRemoveImage("icon")}
                    className="px-3 py-1.5 text-red-600 hover:bg-red-50 text-xs font-bold rounded-md border border-red-200 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
                  </button>
                )}
                <p className="text-[10px] text-slate-400">
                  يُفضّل صورة مربعة 32×32 أو 64×64 بكسل
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Identity */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Building2 className="w-5 h-5 text-slate-700" />
          <h3 className="font-bold text-slate-900 text-sm">
            هوية المنصة والشركة
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Platform Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم المنصة *
            </label>
            <div className="relative">
              <Type className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={settings.platform_name}
                onChange={(e) =>
                  setSettings({ ...settings, platform_name: e.target.value })
                }
                placeholder="مثال: نظام إدارة المهام"
                className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-semibold"
              />
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم الشركة / المؤسسة
            </label>
            <div className="relative">
              <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) =>
                  setSettings({ ...settings, company_name: e.target.value })
                }
                placeholder="مثال: شركتي التقنية"
                className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            وصف المنصة
          </label>
          <div className="relative">
            <FileText className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
            <textarea
              value={settings.platform_description}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  platform_description: e.target.value,
                })
              }
              placeholder="وصف مختصر يظهر في الصفحة الرئيسية وأسفل الأبواب..."
              rows={3}
              className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
            />
          </div>
        </div>

        {/* Contact Email */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            البريد الإلكتروني للتواصل
          </label>
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={settings.contact_email}
              onChange={(e) =>
                setSettings({ ...settings, contact_email: e.target.value })
              }
              placeholder="info@company.com"
              className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Appearance & Defaults */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Palette className="w-5 h-5 text-slate-700" />
          <h3 className="font-bold text-slate-900 text-sm">
            المظهر والإعدادات الافتراضية
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Primary Color */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اللون الأساسي
            </label>
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    setSettings({ ...settings, primary_color: c })
                  }
                  className={`w-7 h-7 rounded-full transition-transform ${
                    settings.primary_color === c
                      ? "scale-125 ring-2 ring-offset-2 ring-slate-400"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Default Language */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اللغة الافتراضية
            </label>
            <div className="relative">
              <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={settings.default_language}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    default_language: e.target.value,
                  })
                }
                className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>

          {/* Default Role */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الدور الافتراضي للأعضاء الجدد
            </label>
            <select
              value={settings.default_role}
              onChange={(e) =>
                setSettings({ ...settings, default_role: e.target.value })
              }
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="member">عضو فريق</option>
              <option value="viewer">مراقب</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
