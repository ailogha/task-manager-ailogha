"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "manager" | "member" | "viewer";
  permissions: string[];
  avatar_color: string;
  token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tm_user");
      if (saved) setUser(JSON.parse(saved));
    } catch {
      localStorage.removeItem("tm_user");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.success) {
      setUser(data.user);
      localStorage.setItem("tm_user", JSON.stringify(data.user));
      return null;
    }
    return data.error || "فشل تسجيل الدخول";
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("tm_user");
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, token: user?.token ?? null, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
