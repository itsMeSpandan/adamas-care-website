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
  loyaltyPoints?: number;
  createdAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  isEmployee: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  updateUser: (data: Partial<AuthUser>) => void;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Attempt to refresh the access token using the httpOnly refresh cookie.
 * Returns true if refresh succeeded, false otherwise.
 */
async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Wrapper around fetch that automatically retries with token refresh on 401.
 * Use this for any authenticated API call that might fail due to expired access token.
 */
export async function authFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  let res = await fetch(url, { ...options, credentials: "include" });

  // If 401, try to refresh the token and retry once
  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      res = await fetch(url, { ...options, credentials: "include" });
    }
  }

  return res;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check session on mount via /api/auth/me (reads httpOnly cookie)
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        }
      } catch {
        // No session or error — user stays null
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      if (!res.ok) return false;

      const data = await res.json();
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((data: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  }, []);

  // Stage 3.2: Refresh session by re-fetching /api/auth/me
  // Called after a successful token refresh to update the UI state
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        return true;
      }
      // No valid session after refresh — clear user
      setUser(null);
      return false;
    } catch {
      setUser(null);
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === "admin",
        isEmployee: user?.role === "employee",
        isAuthenticated: !!user,
        isLoading: loading,
        login,
        updateUser,
        logout,
        refreshSession,
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
