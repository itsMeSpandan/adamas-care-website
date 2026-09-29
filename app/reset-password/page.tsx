"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Mode = "request" | "set" | "done";

export default function ResetPasswordPage() {
  const [mode, setMode] = useState<Mode>("request");
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checkingToken, setCheckingToken] = useState(true);

  // Hydration-safe: read ?token= only after mount (window is client-only).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
      setMode("set");
    }
    setCheckingToken(false);
  }, []);

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(
          data.message ||
            "If an account exists with this email, a password reset link has been sent."
        );
      } else {
        setError(data.error || "Failed to send the reset link.");
      }
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "Password reset successful!");
        setMode("done");
      } else {
        setError(data.error || "Failed to reset password.");
        // Expired/used links: offer to request a fresh one.
        if (res.status === 400 && /invalid or expired/i.test(data.error || "")) {
          setToken(null);
        }
      }
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const heading =
    mode === "request" ? "Reset Password" : mode === "set" ? "Choose a New Password" : "Password Reset!";

  const subtext =
    mode === "request"
      ? "Enter your email and we'll send you a secure reset link."
      : mode === "set"
        ? "Your link is valid for 15 minutes — pick a new password below."
        : "Your password has been updated. You can now sign in.";

  return (
    <div className="section-padding bg-beige-50">
      <div className="section-container mx-auto max-w-md">
        <div className="rounded-card border border-beige-200 bg-white p-8 shadow-card">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-beige-100">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-beige-600"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="font-serif text-2xl font-semibold text-beige-700">{heading}</h1>
            <p className="mt-2 text-sm text-beige-500">{subtext}</p>
          </div>

          {/* Messages */}
          {message && mode !== "done" && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
              {mode === "set" && !token && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("request");
                    setError("");
                    setMessage("");
                  }}
                  className="mt-2 underline hover:text-red-900"
                >
                  Request a new link
                </button>
              )}
            </div>
          )}

          {/* Loading state while we read ?token= from the URL */}
          {checkingToken && <p className="text-center text-sm text-beige-500">Checking your link…</p>}

          {/* Step 1: Request a reset link */}
          {!checkingToken && mode === "request" && (
            <form onSubmit={handleRequestLink} className="space-y-4">
              <div>
                <label
                  htmlFor="reset-email"
                  className="mb-1 block text-sm font-medium text-beige-700"
                >
                  Email Address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}

          {/* Step 2: New password (arrived via emailed link) */}
          {!checkingToken && mode === "set" && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-beige-700">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 pr-12 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-beige-400 hover:text-beige-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-beige-700">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          {/* Step 3: Success */}
          {mode === "done" && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <p className="mb-6 text-sm text-beige-600">{message}</p>
              <Link href="/" className="btn-primary inline-block px-8 py-3">
                Back to Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
