"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { UsersManagementView } from "@/components/UsersManagementView";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function UsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user || (user.role !== "admin" && user.role !== "manager")) {
        router.replace("/dashboard");
      } else {
        setAuthorized(true);
      }
    }
  }, [user, loading, router]);

  if (loading || !authorized) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        <span>جاري التحقق من الصلاحيات...</span>
      </div>
    );
  }

  return <UsersManagementView />;
}
