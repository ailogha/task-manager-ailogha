"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Lock, Mail, Database, AlertTriangle, LogIn } from "lucide-react";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
    // Redirect to setup if no users exist
    fetch("/api/check-setup")
      .then((r) => r.json())
      .then((d) => { if (d.needsSetup) router.replace("/setup"); })
      .catch(() => {});
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      // Initialize DB first
      await fetch("/api/db/init");
      const err = await login(email, password);
      if (err) {
        setError(err);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-8 bg-slate-900 text-white text-center space-y-3 relative">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">بوابة تسجيل الدخول</h2>
            <p className="text-xs text-slate-400 mt-1">منصة إدارة المهام والمشاريع المشتركة</p>
          </div>
          <span className="absolute top-4 left-4 w-2 h-2 rounded-full bg-emerald-400" />
        </div>

        {/* Form */}
        <div className="p-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">البريد الإلكتروني *</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pr-9 pl-3 py-2 border border-slate-200 rounded-md text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">كلمة المرور *</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pr-9 pl-3 py-2 border border-slate-200 rounded-md text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-slate-900 text-white rounded-md text-sm font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
