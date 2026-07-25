"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [setupChecked, setSetupChecked] = useState(false);

  useEffect(() => {
    fetch("/api/check-setup")
      .then((r) => r.json())
      .then((d) => {
        if (d.needsSetup) router.replace("/setup");
        else setSetupChecked(true);
      })
      .catch(() => setSetupChecked(true));
  }, [router]);

  useEffect(() => {
    if (setupChecked && !loading && !user) router.replace("/login");
  }, [user, loading, router, setupChecked]);

  if (!setupChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950" dir="rtl">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return <AppShell>{children}</AppShell>;
}

