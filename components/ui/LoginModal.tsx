"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import PasswordToggle from "@/components/ui/PasswordToggle";
import { BRAND } from "@/lib/brand";

type AuthMode = "signin" | "signup";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address";
  return null;
}

function validatePassword(password: string, isSignup: boolean): string | null {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  if (isSignup && password.length > 128) return "Password must be under 128 characters";
  return null;
}

function validateName(name: string): string | null {
  if (!name.trim()) return "Name is required";
  if (name.trim().length < 2) return "Name must be at least 2 characters";
  return null;
}

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Focus first field when mode changes
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (mode === "signup") nameRef.current?.focus();
      else emailRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [mode, open]);

  const validateField = (field: string, value: string) => {
    let error: string | null = null;
    if (field === "name") error = validateName(value);
    else if (field === "email") error = validateEmail(value);
    else if (field === "password") error = validatePassword(value, mode === "signup");
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
    return error;
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  const handleFieldChange = (field: string) => {
    // Clear error on typing
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const emailErr = validateField("email", email);
    const passwordErr = validateField("password", password);
    setTouched({ email: true, password: true });
    if (emailErr || passwordErr) return;

    setLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        resetForm();
        onClose();
      } else {
        showToast("Invalid email or password. Please try again.", "error");
      }
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const nameErr = validateField("name", name);
    const emailErr = validateField("email", email);
    const passwordErr = validateField("password", password);
    setTouched({ name: true, email: true, password: true });
    if (nameErr || emailErr || passwordErr) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Failed to create account. Please try again.", "error");
        return;
      }

      showToast("Account created! Signing you in...", "success");
      const loginSuccess = await login(email.trim().toLowerCase(), password);

      if (loginSuccess) {
        resetForm();
        onClose();
      } else {
        showToast("Account created. Please sign in manually.", "success");
        setMode("signin");
        setPassword("");
      }
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setFieldErrors({});
    setTouched({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const switchMode = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-beige-900/40 p-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md overflow-hidden rounded-card border border-beige-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-beige-100 px-6 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-semibold text-beige-700">
                  {mode === "signin" ? "Welcome Back" : `Join ${BRAND.name}`}
                </h2>
                <button
                  onClick={handleClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-beige-400 transition-colors hover:bg-beige-100 hover:text-beige-600"
                  aria-label="Close"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="mt-4 flex gap-1">
                <button
                  onClick={() => switchMode("signin")}
                  className={`flex-1 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    mode === "signin"
                      ? "bg-white text-beige-700 shadow-sm"
                      : "text-beige-400 hover:text-beige-600"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => switchMode("signup")}
                  className={`flex-1 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    mode === "signup"
                      ? "bg-white text-beige-700 shadow-sm"
                      : "text-beige-400 hover:text-beige-600"
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="px-6 py-5" noValidate>
              <div className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <label htmlFor="auth-name" className="mb-1 block text-sm font-medium text-beige-700">
                      Full Name
                    </label>
                    <input
                      ref={nameRef}
                      id="auth-name"
                      type="text"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(e) => { setName(e.target.value); handleFieldChange("name"); }}
                      onBlur={() => handleBlur("name", name)}
                      placeholder="Enter your full name"
                      className={`w-full rounded-xl border bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:bg-white focus:outline-none focus:ring-2 ${
                        touched.name && fieldErrors.name
                          ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                          : "border-beige-300 focus:border-beige-500 focus:ring-beige-200"
                      }`}
                    />
                    {touched.name && fieldErrors.name && (
                      <p className="mt-1.5 text-xs text-red-500">{fieldErrors.name}</p>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-beige-700">
                    Email
                  </label>
                  <input
                    ref={emailRef}
                    id="auth-email"
                    type="email"
                    autoComplete={mode === "signin" ? "email" : "new-email"}
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); handleFieldChange("email"); }}
                    onBlur={() => handleBlur("email", email)}
                    placeholder="you@example.com"
                    className={`w-full rounded-xl border bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:bg-white focus:outline-none focus:ring-2 ${
                      touched.email && fieldErrors.email
                        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                        : "border-beige-300 focus:border-beige-500 focus:ring-beige-200"
                    }`}
                  />
                  {touched.email && fieldErrors.email && (
                    <p className="mt-1.5 text-xs text-red-500">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="auth-password" className="mb-1 block text-sm font-medium text-beige-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      required
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); handleFieldChange("password"); }}
                      onBlur={() => handleBlur("password", password)}
                      placeholder={mode === "signup" ? "Create a password" : "Enter your password"}
                      className={`w-full rounded-xl border bg-beige-50 px-4 py-3 pr-12 text-sm text-beige-800 placeholder:text-beige-400 focus:bg-white focus:outline-none focus:ring-2 ${
                        touched.password && fieldErrors.password
                          ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                          : "border-beige-300 focus:border-beige-500 focus:ring-beige-200"
                      }`}
                    />
                    <PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                  </div>
                  {touched.password && fieldErrors.password && (
                    <p className="mt-1.5 text-xs text-red-500">{fieldErrors.password}</p>
                  )}
                  {mode === "signup" && touched.password && !fieldErrors.password && password.length >= 6 && (
                    <p className="mt-1.5 text-xs text-emerald-500">Password looks good</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary mt-6 w-full py-3"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {mode === "signin" ? "Signing in..." : "Creating account..."}
                  </span>
                ) : (
                  mode === "signin" ? "Sign In" : "Create Account"
                )}
              </button>

              {mode === "signin" && (
                <div className="mt-4 text-center">
                  <a
                    href="/reset-password"
                    onClick={handleClose}
                    className="text-xs text-beige-500 hover:text-beige-700 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
              )}

              {mode === "signup" && (
                <p className="mt-4 text-center text-xs text-beige-400">
                  By creating an account, you agree to our Terms of Service and Privacy Policy.
                </p>
              )}
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
