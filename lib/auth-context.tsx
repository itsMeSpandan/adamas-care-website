"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export type UserRole = "guest" | "user" | "employee" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  employeeId?: string;
}

const AUTH_STORAGE_KEY = "adamascare_auth_user";

function loadUserFromStorage(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as AuthUser;
    if (parsed && parsed.id && parsed.email) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveUserToStorage(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  isEmployee: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  updateUser: (data: Partial<AuthUser>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = loadUserFromStorage();
    if (stored) setUser(stored);

    // Sync logout across tabs via storage events
    function handleStorageEvent(e: StorageEvent) {
      if (e.key !== AUTH_STORAGE_KEY) return;
      if (e.newValue) {
        // Another tab logged in or updated — sync the user
        try {
          const parsed = JSON.parse(e.newValue) as AuthUser;
          if (parsed && parsed.id && parsed.email) setUser(parsed);
        } catch {
          // ignore malformed data
        }
      } else {
        // Another tab logged out — clear local state
        setUser(null);
      }
    }
    window.addEventListener("storage", handleStorageEvent);
    return () => window.removeEventListener("storage", handleStorageEvent);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      setUser(data.user);
      saveUserToStorage(data.user);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    saveUserToStorage(null);
  }, []);

  const updateUser = useCallback((data: Partial<AuthUser>) => {
    setUser((prev) => {
      const updated = prev ? { ...prev, ...data } : null;
      saveUserToStorage(updated);
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === "admin",
        isEmployee: user?.role === "employee",
        isAuthenticated: !!user,
        login,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
