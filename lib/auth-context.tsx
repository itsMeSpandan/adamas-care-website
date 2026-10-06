"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { syncPushDevice, unregisterPushDevice } from "@/lib/firebase-client";
import {
  shouldPromptForWhatsApp,
  wasWhatsAppPromptDismissed,
  rememberWhatsAppPromptDismissed,
} from "@/lib/whatsapp-prompt";

export type UserRole = "guest" | "user" | "employee" | "admin";

export type Gender = "male" | "female" | "other" | null;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  gender?: Gender;
  avatarUrl: string;
  employeeId?: string;
  loyaltyPoints?: number;
  mustChangePassword?: boolean;
  whatsappNumber?: string | null;
  createdAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  isEmployee: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (idToken: string) => Promise<{ ok: boolean; error?: string }>;
  updateUser: (data: Partial<AuthUser>) => void;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
  /** True while the post-Google-sign-in contact-number prompt should be up. */
  whatsappPromptOpen: boolean;
  /** Close it and remember the dismissal for this device. */
  dismissWhatsAppPrompt: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Attempt to refresh the access token using the httpOnly refresh cookie.
 *
 * Concurrency-safe: the server rotates refresh tokens single-use and
 * revokes EVERY session on reuse, so two concurrent refreshes carrying
 * the same cookie would log the user out everywhere. Two guards:
 *   1. per-tab single-flight — concurrent callers share one request;
 *   2. cross-tab Web Lock — refreshes from different tabs are serialized
 *      (tabs share the cookie jar, so the second caller rotates the fresh
 *      token instead of the already-revoked one).
 * Resolves true on success, false otherwise — never rejects.
 */
let refreshInFlight: Promise<boolean> | null = null;

function tryRefreshToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  const run = async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  // Web Locks is available in secure contexts (https / localhost);
  // elsewhere we degrade to the per-tab single-flight guard.
  const locked =
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request("gracesalon-auth-refresh", run)
      : run();

  refreshInFlight = Promise.resolve(locked)
    .then((ok: boolean) => !!ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

/**
 * Read the current user from /api/auth/me, transparently falling back to
 * the 7-day refresh cookie when the 15-minute access cookie has expired
 * (e.g. the browser was closed and reopened hours later). Without this
 * fallback the app reports "logged out" even though a valid refresh
 * token is sitting in the cookie jar.
 */
async function loadUser(): Promise<AuthUser | null> {
  try {
    let res = await fetch("/api/auth/me", { credentials: "include" });
    let data = await res.json();
    if (data.user) return data.user as AuthUser;
    // The server tells us whether a refresh cookie was even sent —
    // anonymous visitors (canRefresh: false) skip the doomed refresh
    // attempt entirely. Missing hint (older response shape) → try it.
    if (data.canRefresh === false) return null;
    if (!(await tryRefreshToken())) return null;
    res = await fetch("/api/auth/me", { credentials: "include" });
    data = await res.json();
    return (data.user as AuthUser) ?? null;
  } catch {
    return null;
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
  const [whatsappPromptOpen, setWhatsappPromptOpen] = useState(false);

  // Check session on mount — with a silent refresh fallback so login
  // survives browser restarts (access cookie lives only 15 minutes).
  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      const user = await loadUser();
      if (!cancelled && user) setUser(user);
      if (!cancelled) setLoading(false);
    }
    checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep long-lived tabs authenticated: rotate the token pair every
  // 10 minutes (access cookie lasts 15) so API calls never hit a stale
  // cookie. Only drop the user when the SERVER confirms there is no
  // session — a transient network blip must never log anyone out.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      tryRefreshToken().then((ok) => {
        if (ok) return;
        fetch("/api/auth/me", { credentials: "include" })
          .then((r) => r.json())
          .then((d) => {
            if (d && d.user === null) setUser(null);
          })
          .catch(() => {
            /* transient network error — keep the session */
          });
      });
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Push: refresh this device's registration on every authenticated page load
  // (no-op without Notification permission or Firebase env config).
  useEffect(() => {
    if (user) {
      syncPushDevice().catch(() => {
        /* best-effort */
      });
    }
  }, [user]);

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

  // Google sign-in: exchange a verified Firebase ID token for our own
  // session cookies — same cookie auth as email/password, no second
  // session model to maintain.
  const loginWithGoogle = useCallback(
    async (idToken: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: idToken }),
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok || !data.user) {
          return {
            ok: false,
            error: data.error || "Google sign-in failed. Please try again.",
          };
        }
        setUser(data.user);
        // First-time Google sign-in: ask for a contact number — but only
        // when the account does not already have one, and never again after
        // a dismissal on this device.
        setWhatsappPromptOpen(
          shouldPromptForWhatsApp(
            data.user,
            wasWhatsAppPromptDismissed(data.user.id),
          ),
        );
        return { ok: true };
      } catch {
        return { ok: false, error: "Something went wrong. Please try again." };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      // Revoke the push device FIRST, while the session cookie is still valid.
      await unregisterPushDevice();
    } catch {
      /* best-effort — logout must never be blocked by push cleanup */
    }
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      setWhatsappPromptOpen(false);
    }
  }, []);

  const dismissWhatsAppPrompt = useCallback(() => {
    setWhatsappPromptOpen(false);
    if (user) rememberWhatsAppPromptDismissed(user.id);
  }, [user]);

  const updateUser = useCallback((data: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  }, []);

  // Stage 3.2: Refresh session state from the server — reading
  // /api/auth/me with a silent token-refresh fallback first, so a stale
  // 15-minute access cookie never logs the user out of the UI.
  const refreshSession = useCallback(async (): Promise<boolean> => {
    const fresh = await loadUser();
    if (fresh) {
      setUser(fresh);
      return true;
    }
    setUser(null);
    return false;
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
        loginWithGoogle,
        updateUser,
        logout,
        refreshSession,
        whatsappPromptOpen,
        dismissWhatsAppPrompt,
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
