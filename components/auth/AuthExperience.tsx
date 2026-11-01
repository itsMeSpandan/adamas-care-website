"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import {
  signInWithGoogle,
  signInWithMicrosoft,
} from "@/lib/firebase-client";
import CountryCodeSelect from "@/components/ui/CountryCodeSelect";
import { composePhoneNumber, DEFAULT_COUNTRY } from "@/lib/countries";
import "./AuthExperience.css";

export type AuthMode = "signin" | "signup";

export interface AuthExperienceProps {
  initialMode?: AuthMode;
  mode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
  onSuccess?: () => void;
  onClose?: () => void;
  isModal?: boolean;
  className?: string;
  containerWidth?: number | string;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Validation Helpers
   ───────────────────────────────────────────────────────────────────────────── */

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Please enter a valid email address";
  }
  return null;
}

function validatePassword(password: string, isSignup: boolean): string | null {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (isSignup && password.length > 128) return "Password must be under 128 characters";
  return null;
}

function validateName(name: string): string | null {
  if (!name.trim()) return "Full name is required";
  if (name.trim().length < 2) return "Name must be at least 2 characters";
  return null;
}

function validatePhoneNumber(number: string): string | null {
  if (!number.trim()) return null; // optional
  const clean = number.replace(/[^0-9+]/g, "");
  if (!clean.match(/^\+?[0-9]{10,15}$/)) {
    return "Please enter a valid 10-15 digit phone number";
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Inline SVGs (with explicit width/height to prevent layout distortion)
   ───────────────────────────────────────────────────────────────────────────── */

function GoogleIcon({ className = "w-[18px] h-[18px] shrink-0" }: { className?: string }) {
  return (
    <svg
      width={18}
      height={18}
      style={{ width: 18, height: 18, minWidth: 18, minHeight: 18 }}
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function MicrosoftIcon({ className = "w-[18px] h-[18px] shrink-0" }: { className?: string }) {
  return (
    <svg
      width={18}
      height={18}
      style={{ width: 18, height: 18, minWidth: 18, minHeight: 18 }}
      className={className}
      viewBox="0 0 21 21"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

function FemaleSymbol({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="8.5" r="5" />
      <line x1="12" y1="13.5" x2="12" y2="21" />
      <line x1="8.5" y1="17.5" x2="15.5" y2="17.5" />
    </svg>
  );
}

function MaleSymbol({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9.5" cy="14.5" r="5" />
      <line x1="13" y1="11" x2="19.5" y2="4.5" />
      <polyline points="14.5 4.5 19.5 4.5 19.5 9.5" />
    </svg>
  );
}

function OtherSymbol({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.2" />
      <line x1="12" y1="16.2" x2="12" y2="21.5" />
      <line x1="9.5" y1="19" x2="14.5" y2="19" />
      <line x1="15" y1="9" x2="19.5" y2="4.5" />
      <polyline points="15.5 4.5 19.5 4.5 19.5 8.5" />
      <line x1="9" y1="9" x2="4.5" y2="4.5" />
      <polyline points="8.5 4.5 4.5 4.5 4.5 8.5" />
      <line x1="5.2" y1="8.2" x2="8.2" y2="5.2" />
    </svg>
  );
}

function EyeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function WarningIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main AuthExperience Component
   ───────────────────────────────────────────────────────────────────────────── */

export default function AuthExperience({
  initialMode = "signin",
  mode: controlledMode,
  onModeChange,
  onSuccess,
  onClose,
  isModal = false,
  className = "",
  containerWidth,
}: AuthExperienceProps) {
  const { login, loginWithGoogle, loginWithMicrosoft } = useAuth();
  const { showToast } = useToast();

  const [internalMode, setInternalMode] = useState<AuthMode>(initialMode);
  const activeMode = controlledMode ?? internalMode;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"" | "female" | "male" | "other">("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [phoneDial, setPhoneDial] = useState(`+${DEFAULT_COUNTRY.dial}`);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const signInEmailRef = useRef<HTMLInputElement>(null);
  const signUpNameRef = useRef<HTMLInputElement>(null);
  const tabSignInRef = useRef<HTMLButtonElement>(null);
  const tabSignUpRef = useRef<HTMLButtonElement>(null);

  const formIdPrefix = useId();

  // Mode switching
  const switchMode = (newMode: AuthMode) => {
    setFormError(null);
    setFieldErrors({});
    setTouched({});
    if (onModeChange) onModeChange(newMode);
    else setInternalMode(newMode);
  };

  // Focus management on mode switch
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeMode === "signin") {
        signInEmailRef.current?.focus();
      } else {
        signUpNameRef.current?.focus();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [activeMode]);

  // Validation
  const validateField = (field: string, value: string) => {
    let error: string | null = null;
    if (field === "name") error = validateName(value);
    else if (field === "email") error = validateEmail(value);
    else if (field === "password") error = validatePassword(value, activeMode === "signup");
    else if (field === "whatsappNumber") error = validatePhoneNumber(value);

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
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Sign In submit
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const emailErr = validateField("email", email);
    const passwordErr = validateField("password", password);
    setTouched((prev) => ({ ...prev, email: true, password: true }));
    if (emailErr || passwordErr) return;

    setLoading(true);
    try {
      const success = await login(email.trim().toLowerCase(), password);
      if (success) {
        showToast("Signed in successfully", "success");
        onSuccess?.();
        onClose?.();
      } else {
        setFormError("Invalid email or password. Please try again.");
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Sign Up submit
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const composedPhone = whatsappNumber.trim()
      ? composePhoneNumber(phoneDial, whatsappNumber)
      : "";

    const nameErr = validateField("name", name);
    const emailErr = validateField("email", email);
    const passwordErr = validateField("password", password);
    const phoneErr = validateField("whatsappNumber", composedPhone);

    const newTouched = {
      ...touched,
      name: true,
      email: true,
      password: true,
      whatsappNumber: true,
      gender: true,
    };
    setTouched(newTouched);

    if (!gender) {
      setFieldErrors((prev) => ({ ...prev, gender: "Please select your gender" }));
      return;
    }

    if (nameErr || emailErr || passwordErr || phoneErr) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          gender: gender || null,
          whatsappNumber: composedPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      // Automatically sign in upon registration
      const loginSuccess = await login(email.trim().toLowerCase(), password);
      if (loginSuccess) {
        setSignupSuccess(true);
      } else {
        showToast("Account created. Please sign in.", "success");
        switchMode("signin");
        setPassword("");
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth
  const handleGoogleSignIn = async () => {
    setFormError(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result === null) return; // popup closed
      if ("error" in result) {
        setFormError(result.error);
        return;
      }
      const { ok, error } = await loginWithGoogle(result.idToken);
      if (ok) {
        showToast("Signed in with Google", "success");
        onSuccess?.();
        onClose?.();
      } else {
        setFormError(error || "Google sign-in failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Microsoft OAuth
  const handleMicrosoftSignIn = async () => {
    setFormError(null);
    setMicrosoftLoading(true);
    try {
      const result = await signInWithMicrosoft();
      if (result === null) return; // popup closed
      if ("error" in result) {
        setFormError(result.error);
        return;
      }
      const { ok, error } = await loginWithMicrosoft(result.idToken);
      if (ok) {
        showToast("Signed in with Microsoft", "success");
        onSuccess?.();
        onClose?.();
      } else {
        setFormError(error || "Microsoft sign-in failed. Please try again.");
      }
    } finally {
      setMicrosoftLoading(false);
    }
  };

  // Keyboard navigation for tablist
  const handleTabKeyDown = (e: React.KeyboardEvent, currentTab: AuthMode) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const nextTab = currentTab === "signin" ? "signup" : "signin";
      switchMode(nextTab);
      if (nextTab === "signin") tabSignInRef.current?.focus();
      else tabSignUpRef.current?.focus();
    }
  };

  return (
    <div
      className={`auth-experience-root w-full min-h-[100dvh] h-full flex flex-col justify-center ${className}`}
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Main Screen-Wide Card Container */}
      <div
        className="auth-card-container relative overflow-hidden w-full min-h-[100dvh] h-full flex flex-col justify-center"
        style={{
          width: containerWidth ? (typeof containerWidth === "number" ? `${containerWidth}px` : containerWidth) : "100%",
          maxWidth: containerWidth ? (typeof containerWidth === "number" ? `${containerWidth}px` : containerWidth) : "100%",
        }}
      >
        {/* Floating Modal Close Button */}
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#2B2420] shadow-md backdrop-blur-xs transition-all hover:bg-white hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* ─── DESKTOP/TABLET MORPHING SLIDING OVERLAY PANEL (>= 768px) ─── */}
        <motion.div
          className="auth-sliding-panel hidden md:flex flex-col items-center justify-center p-8 lg:p-14 overflow-hidden z-20"
          initial={false}
          animate={{
            x: activeMode === "signin" ? "calc(100% + 14px)" : "0%",
          }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 26,
            mass: 0.85,
          }}
          aria-hidden="true"
        >
          {/* Decorative rotating/morphing circles */}
          <motion.div
            animate={{
              rotate: activeMode === "signin" ? 0 : 180,
              scale: activeMode === "signin" ? 1 : 1.08,
            }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="auth-decorative-circle absolute -top-[100px] -right-[100px] h-[360px] w-[360px] rounded-full border border-[#F4EFE8]/[0.14] pointer-events-none"
          />
          <motion.div
            animate={{
              rotate: activeMode === "signin" ? 0 : -180,
              scale: activeMode === "signin" ? 1 : 1.08,
            }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="auth-decorative-circle absolute -bottom-[80px] -left-[80px] h-[300px] w-[300px] rounded-full border border-[#F4EFE8]/[0.14] pointer-events-none"
          />

          {/* Panel Content (Centered with Morph Transition) */}
          <div className="relative z-10 flex h-full w-full flex-col items-center justify-center text-center">
            {/* ADAMAS CARE Logo */}
            <div className="mb-10">
              <span className="auth-logo-wordmark block font-serif text-[28px] lg:text-[32px] tracking-[0.16em] text-[#F4EFE8]">
                ADAMAS
              </span>
              <div className="mt-1 flex items-center justify-center gap-2.5">
                <span className="h-px w-[30px] bg-[#DCCFC1]/50" />
                <span className="text-[10px] tracking-[0.5em] text-[#DCCFC1] uppercase font-sans">
                  CARE
                </span>
                <span className="h-px w-[30px] bg-[#DCCFC1]/50" />
              </div>
            </div>

            {/* Sliding text content morphing with AnimatePresence */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeMode}
                initial={{ opacity: 0, y: 16, filter: "blur(6px)", scale: 0.96 }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
                exit={{ opacity: 0, y: -16, filter: "blur(6px)", scale: 0.96 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-[340px]"
              >
                <h2 className="auth-panel-title font-medium text-[#F4EFE8] mb-3">
                  {activeMode === "signin" ? "New here?" : "Welcome back"}
                </h2>
                <p className="text-[14px] lg:text-[15px] leading-relaxed text-[#DCCFC1] mb-8">
                  {activeMode === "signin"
                    ? "Create an account to get started with Adamas Care."
                    : "Already have an account? Sign in to pick up where you left off."}
                </p>

                <button
                  type="button"
                  onClick={() => switchMode(activeMode === "signin" ? "signup" : "signin")}
                  className="inline-flex min-h-[44px] min-w-[140px] items-center justify-center rounded-[12px] border border-[#F4EFE8] bg-transparent px-8 py-3 text-xs tracking-[0.14em] uppercase text-[#F4EFE8] font-medium transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4EFE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2A211C]"
                >
                  {activeMode === "signin" ? "SIGN UP" : "SIGN IN"}
                </button>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ─── MOBILE HEADER & TAB CONTROL (< 768px) ─── */}
        <div className="md:hidden pt-8 px-5 pb-2 text-center w-full">
          {/* Mobile Logo */}
          <div className="inline-block mb-5">
            <span className="auth-logo-wordmark font-serif text-[26px] tracking-[0.16em] text-[#2B2420]">
              ADAMAS
            </span>
            <div className="mt-0.5 flex items-center justify-center gap-2">
              <span className="h-px w-6 bg-[#DDD3C7]" />
              <span className="text-[10px] tracking-[0.5em] text-[#6B5C50] uppercase font-sans">
                CARE
              </span>
              <span className="h-px w-6 bg-[#DDD3C7]" />
            </div>
          </div>

          {/* Segmented ARIA Tablist with Morphing Underline */}
          <div
            role="tablist"
            aria-label="Authentication modes"
            className="flex border-b border-[#DDD3C7] mt-2 relative"
          >
            <button
              ref={tabSignInRef}
              role="tab"
              id="tab-signin"
              aria-controls="panel-signin"
              aria-selected={activeMode === "signin"}
              tabIndex={activeMode === "signin" ? 0 : -1}
              onClick={() => switchMode("signin")}
              onKeyDown={(e) => handleTabKeyDown(e, "signin")}
              className={`flex-1 h-11 text-sm font-medium transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] ${
                activeMode === "signin" ? "text-[#2B2420]" : "text-[#6B5C50] hover:text-[#2B2420]"
              }`}
            >
              Sign In
              {activeMode === "signin" && (
                <motion.div
                  layoutId="auth-tab-pill"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#A8483A]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
            <button
              ref={tabSignUpRef}
              role="tab"
              id="tab-signup"
              aria-controls="panel-signup"
              aria-selected={activeMode === "signup"}
              tabIndex={activeMode === "signup" ? 0 : -1}
              onClick={() => switchMode("signup")}
              onKeyDown={(e) => handleTabKeyDown(e, "signup")}
              className={`flex-1 h-11 text-sm font-medium transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] ${
                activeMode === "signup" ? "text-[#2B2420]" : "text-[#6B5C50] hover:text-[#2B2420]"
              }`}
            >
              Sign Up
              {activeMode === "signup" && (
                <motion.div
                  layoutId="auth-tab-pill"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#A8483A]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          </div>
        </div>

        {/* ─── FULL-SCREEN TWO-COLUMN GRID (Occupies Whole Screen Length and Width) ─── */}
        <div className="auth-form-grid grid grid-cols-1 md:grid-cols-2 w-full min-h-[100dvh] h-full relative z-10">
          {/* ═════════════════════════════════════════════════════════════════════
              SIGN IN FORM HALF (Left 50% on Desktop, Controlled on Mobile)
             ═════════════════════════════════════════════════════════════════════ */}
          <div
            id="panel-signin"
            role="tabpanel"
            aria-labelledby="tab-signin"
            className={`auth-form-half w-full px-5 py-8 sm:px-8 md:px-12 lg:px-16 flex flex-col justify-center items-center h-full ${
              activeMode === "signin"
                ? "auth-form-active flex"
                : "auth-form-hidden hidden md:flex"
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {activeMode === "signin" && (
                <motion.div
                  key="signin-content"
                  initial={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                  transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-[420px] mx-auto my-auto"
                >
                  <h1 className="auth-title font-medium text-center mb-2">Sign In</h1>
                  <p className="text-center text-sm text-[#6B5C50] mb-6">
                    Welcome back. Choose how you&apos;d like to continue.
                  </p>

                  {/* Form-level Error Message */}
                  {formError && activeMode === "signin" && (
                    <div
                      role="alert"
                      aria-live="polite"
                      className="mb-5 flex items-start gap-2.5 rounded-[12px] border border-[#A8483A]/30 bg-[#A8483A]/10 p-3.5 text-xs text-[#A8483A]"
                    >
                      <WarningIcon className="h-4 w-4 shrink-0 mt-0.5 text-[#A8483A]" />
                      <span className="leading-relaxed">{formError}</span>
                    </div>
                  )}

                  {/* Google and Microsoft Buttons (Identical 18px icons, perfectly aligned) */}
                  <div className="auth-social-grid grid grid-cols-2 gap-3 mb-6">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading || googleLoading || microsoftLoading}
                      aria-label="Continue with Google"
                      className="flex h-12 min-h-[44px] items-center justify-center gap-2.5 rounded-[12px] border border-[#DDD3C7] bg-white px-3 text-sm font-medium text-[#2B2420] transition-colors hover:bg-[#F1EADF]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] focus-visible:ring-offset-2 disabled:opacity-60"
                    >
                      {googleLoading ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#2B2420] border-t-transparent" />
                          Google…
                        </span>
                      ) : (
                        <>
                          <GoogleIcon />
                          <span>Google</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleMicrosoftSignIn}
                      disabled={loading || googleLoading || microsoftLoading}
                      aria-label="Continue with Microsoft"
                      className="flex h-12 min-h-[44px] items-center justify-center gap-2.5 rounded-[12px] border border-[#DDD3C7] bg-white px-3 text-sm font-medium text-[#2B2420] transition-colors hover:bg-[#F1EADF]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] focus-visible:ring-offset-2 disabled:opacity-60"
                    >
                      {microsoftLoading ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#2B2420] border-t-transparent" />
                          Microsoft…
                        </span>
                      ) : (
                        <>
                          <MicrosoftIcon />
                          <span>Microsoft</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* "or with email" Divider */}
                  <div className="flex items-center my-6">
                    <div className="flex-1 h-px bg-[#DDD3C7]" />
                    <span className="px-3 text-xs tracking-wider text-[#6B5C50]">
                      or with email
                    </span>
                    <div className="flex-1 h-px bg-[#DDD3C7]" />
                  </div>

                  {/* Email & Password Form */}
                  <form onSubmit={handleSignIn} noValidate className="space-y-4">
                    <div>
                      <label
                        htmlFor={`${formIdPrefix}-signin-email`}
                        className="block text-[0.8125rem] font-medium text-[#2B2420] mb-1.5"
                      >
                        Email <span className="text-[#A8483A]" aria-hidden="true">*</span>
                      </label>
                      <input
                        ref={signInEmailRef}
                        id={`${formIdPrefix}-signin-email`}
                        type="email"
                        autoComplete="email"
                        enterKeyHint="next"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          handleFieldChange("email");
                        }}
                        onBlur={() => handleBlur("email", email)}
                        placeholder="Email"
                        aria-invalid={Boolean(touched.email && fieldErrors.email)}
                        aria-describedby={
                          touched.email && fieldErrors.email ? `${formIdPrefix}-signin-email-err` : undefined
                        }
                        className={`w-full h-12 px-4 rounded-[12px] bg-[#F1EADF] border text-base text-[#2B2420] placeholder:text-[#6B5C50] transition-colors scroll-mt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] ${
                          touched.email && fieldErrors.email
                            ? "border-[#A8483A]"
                            : "border-[#DDD3C7] focus:border-[#2B2420]"
                        }`}
                      />
                      {touched.email && fieldErrors.email && (
                        <div
                          id={`${formIdPrefix}-signin-email-err`}
                          role="alert"
                          aria-live="polite"
                          className="flex items-center gap-1.5 mt-1 text-xs text-[#A8483A]"
                        >
                          <WarningIcon />
                          <span>{fieldErrors.email}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor={`${formIdPrefix}-signin-password`}
                        className="block text-[0.8125rem] font-medium text-[#2B2420] mb-1.5"
                      >
                        Password <span className="text-[#A8483A]" aria-hidden="true">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id={`${formIdPrefix}-signin-password`}
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          enterKeyHint="done"
                          required
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            handleFieldChange("password");
                          }}
                          onBlur={() => handleBlur("password", password)}
                          placeholder="Password"
                          aria-invalid={Boolean(touched.password && fieldErrors.password)}
                          aria-describedby={
                            touched.password && fieldErrors.password
                              ? `${formIdPrefix}-signin-pass-err`
                              : undefined
                          }
                          className={`w-full h-12 pl-4 pr-12 rounded-[12px] bg-[#F1EADF] border text-base text-[#2B2420] placeholder:text-[#6B5C50] transition-colors scroll-mt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] ${
                            touched.password && fieldErrors.password
                              ? "border-[#A8483A]"
                              : "border-[#DDD3C7] focus:border-[#2B2420]"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-1 top-1 h-10 w-10 flex items-center justify-center text-[#6B5C50] hover:text-[#2B2420] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] rounded-lg"
                        >
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                      {touched.password && fieldErrors.password && (
                        <div
                          id={`${formIdPrefix}-signin-pass-err`}
                          role="alert"
                          aria-live="polite"
                          className="flex items-center gap-1.5 mt-1 text-xs text-[#A8483A]"
                        >
                          <WarningIcon />
                          <span>{fieldErrors.password}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right pt-0.5">
                      <Link
                        href="/reset-password"
                        onClick={() => onClose?.()}
                        className="text-xs text-[#6B5C50] hover:text-[#2B2420] underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] rounded px-1 py-0.5"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 min-h-[44px] rounded-[12px] bg-[#A8483A] hover:bg-[#923E31] text-white font-medium text-xs tracking-[0.14em] uppercase transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed mt-4"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Signing in…
                        </span>
                      ) : (
                        "SIGN IN"
                      )}
                    </button>
                  </form>

                  {/* Mobile bottom switcher text */}
                  <div className="md:hidden mt-6 text-center text-sm text-[#6B5C50]">
                    New here?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="font-medium text-[#A8483A] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] rounded px-1"
                    >
                      Sign up
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════
              SIGN UP FORM HALF (Right 50% on Desktop, Controlled on Mobile)
             ═════════════════════════════════════════════════════════════════════ */}
          <div
            id="panel-signup"
            role="tabpanel"
            aria-labelledby="tab-signup"
            className={`auth-form-half w-full px-5 py-8 sm:px-8 md:px-12 lg:px-16 flex flex-col justify-center items-center h-full ${
              activeMode === "signup"
                ? "auth-form-active flex"
                : "auth-form-hidden hidden md:flex"
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {activeMode === "signup" && (
                <motion.div
                  key="signup-content"
                  initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: 20, filter: "blur(4px)" }}
                  transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-[420px] mx-auto my-auto"
                >
                  {signupSuccess ? (
                    /* Verification CTA after successful signup */
                    <div className="text-center py-6">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F0EA]">
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#4A6B52"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <h2 className="auth-title font-medium text-xl mb-2">Account Created!</h2>
                      <p className="text-sm text-[#6B5C50] mb-2 leading-relaxed">
                        We&apos;ve sent a verification code to{" "}
                        <span className="font-semibold text-[#2B2420]">{email}</span>.
                      </p>
                      <p className="text-xs text-[#6B5C50] mb-6">
                        Please verify your email to unlock all features.
                      </p>
                      <div className="space-y-3">
                        <Link
                          href="/verify-email"
                          onClick={() => onClose?.()}
                          className="flex h-12 items-center justify-center rounded-[12px] bg-[#A8483A] text-white text-xs tracking-wider uppercase font-medium hover:bg-[#923E31] transition-colors"
                        >
                          Verify Email →
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            onSuccess?.();
                            onClose?.();
                          }}
                          className="w-full text-xs text-[#6B5C50] hover:text-[#2B2420] py-2"
                        >
                          Continue to site
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 className="auth-title font-medium text-center mb-6">
                        Join Adamas Care
                      </h1>

                      {/* Form-level Error Message */}
                      {formError && activeMode === "signup" && (
                        <div
                          role="alert"
                          aria-live="polite"
                          className="mb-5 flex items-start gap-2.5 rounded-[12px] border border-[#A8483A]/30 bg-[#A8483A]/10 p-3.5 text-xs text-[#A8483A]"
                        >
                          <WarningIcon className="h-4 w-4 shrink-0 mt-0.5 text-[#A8483A]" />
                          <span className="leading-relaxed">{formError}</span>
                        </div>
                      )}

                      <form onSubmit={handleSignUp} noValidate className="space-y-4">
                        {/* Full Name */}
                        <div>
                          <label
                            htmlFor={`${formIdPrefix}-signup-name`}
                            className="block text-[0.8125rem] font-medium text-[#2B2420] mb-1.5"
                          >
                            Full Name <span className="text-[#A8483A]" aria-hidden="true">*</span>
                          </label>
                          <input
                            ref={signUpNameRef}
                            id={`${formIdPrefix}-signup-name`}
                            type="text"
                            autoComplete="name"
                            enterKeyHint="next"
                            required
                            value={name}
                            onChange={(e) => {
                              setName(e.target.value);
                              handleFieldChange("name");
                            }}
                            onBlur={() => handleBlur("name", name)}
                            placeholder="Enter your full name"
                            aria-invalid={Boolean(touched.name && fieldErrors.name)}
                            aria-describedby={
                              touched.name && fieldErrors.name ? `${formIdPrefix}-signup-name-err` : undefined
                            }
                            className={`w-full h-12 px-4 rounded-[12px] bg-[#F1EADF] border text-base text-[#2B2420] placeholder:text-[#6B5C50] transition-colors scroll-mt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] ${
                              touched.name && fieldErrors.name
                                ? "border-[#A8483A]"
                                : "border-[#DDD3C7] focus:border-[#2B2420]"
                            }`}
                          />
                          {touched.name && fieldErrors.name && (
                            <div
                              id={`${formIdPrefix}-signup-name-err`}
                              role="alert"
                              aria-live="polite"
                              className="flex items-center gap-1.5 mt-1 text-xs text-[#A8483A]"
                            >
                              <WarningIcon />
                              <span>{fieldErrors.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Gender (Female / Male / Other equal cards in a row) */}
                        <fieldset
                          role="radiogroup"
                          aria-label="Gender"
                          className="border-0 p-0 m-0"
                        >
                          <legend className="block text-[0.8125rem] font-medium text-[#2B2420] mb-1.5">
                            Gender <span className="text-[#A8483A]" aria-hidden="true">*</span>
                          </legend>
                          <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {/* Female */}
                            <label
                              className={`relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-[12px] cursor-pointer min-h-[64px] sm:min-h-[70px] transition-all border ${
                                gender === "female"
                                  ? "border-[1.5px] border-[#2B2420] bg-[#F1EADF] text-[#2B2420] shadow-xs"
                                  : "border-[#DDD3C7] bg-white text-[#6B5C50] hover:border-[#6B5C50]"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`${formIdPrefix}-gender`}
                                value="female"
                                checked={gender === "female"}
                                onChange={() => {
                                  setGender("female");
                                  handleFieldChange("gender");
                                }}
                                className="sr-only"
                              />
                              <FemaleSymbol className="auth-gender-icon w-7 h-7 max-[360px]:w-[22px] max-[360px]:h-[22px] mb-1 text-inherit" />
                              <span className="text-xs sm:text-[13px] font-medium text-inherit">
                                Female
                              </span>
                            </label>

                            {/* Male */}
                            <label
                              className={`relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-[12px] cursor-pointer min-h-[64px] sm:min-h-[70px] transition-all border ${
                                gender === "male"
                                  ? "border-[1.5px] border-[#2B2420] bg-[#F1EADF] text-[#2B2420] shadow-xs"
                                  : "border-[#DDD3C7] bg-white text-[#6B5C50] hover:border-[#6B5C50]"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`${formIdPrefix}-gender`}
                                value="male"
                                checked={gender === "male"}
                                onChange={() => {
                                  setGender("male");
                                  handleFieldChange("gender");
                                }}
                                className="sr-only"
                              />
                              <MaleSymbol className="auth-gender-icon w-7 h-7 max-[360px]:w-[22px] max-[360px]:h-[22px] mb-1 text-inherit" />
                              <span className="text-xs sm:text-[13px] font-medium text-inherit">
                                Male
                              </span>
                            </label>

                            {/* Other */}
                            <label
                              className={`relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-[12px] cursor-pointer min-h-[64px] sm:min-h-[70px] transition-all border ${
                                gender === "other"
                                  ? "border-[1.5px] border-[#2B2420] bg-[#F1EADF] text-[#2B2420] shadow-xs"
                                  : "border-[#DDD3C7] bg-white text-[#6B5C50] hover:border-[#6B5C50]"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`${formIdPrefix}-gender`}
                                value="other"
                                checked={gender === "other"}
                                onChange={() => {
                                  setGender("other");
                                  handleFieldChange("gender");
                                }}
                                className="sr-only"
                              />
                              <OtherSymbol className="auth-gender-icon w-7 h-7 max-[360px]:w-[22px] max-[360px]:h-[22px] mb-1 text-inherit" />
                              <span className="text-xs sm:text-[13px] font-medium text-inherit">
                                Other
                              </span>
                            </label>
                          </div>
                          {touched.gender && fieldErrors.gender && (
                            <div
                              role="alert"
                              aria-live="polite"
                              className="flex items-center gap-1.5 mt-1 text-xs text-[#A8483A]"
                            >
                              <WarningIcon />
                              <span>{fieldErrors.gender}</span>
                            </div>
                          )}
                        </fieldset>

                        {/* Phone Number (Optional) */}
                        <div>
                          <label
                            htmlFor={`${formIdPrefix}-signup-phone`}
                            className="block text-[0.8125rem] font-medium text-[#2B2420] mb-1.5"
                          >
                            Phone Number{" "}
                            <span className="text-[#6B5C50] font-normal">(optional)</span>
                          </label>
                          <div className="flex gap-2">
                            <CountryCodeSelect
                              value={phoneDial}
                              onChange={(dial) => setPhoneDial(dial)}
                              className="w-[96px] shrink-0"
                              buttonClassName="flex h-12 w-full items-center justify-center gap-1.5 rounded-[12px] border border-[#DDD3C7] bg-[#F1EADF] px-2 py-3 text-sm text-[#2B2420] transition-colors hover:border-[#2B2420] focus:border-[#2B2420] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420]"
                            />
                            <input
                              id={`${formIdPrefix}-signup-phone`}
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel"
                              enterKeyHint="next"
                              value={whatsappNumber}
                              onChange={(e) => {
                                setWhatsappNumber(e.target.value);
                                handleFieldChange("whatsappNumber");
                              }}
                              onBlur={() => handleBlur("whatsappNumber", whatsappNumber)}
                              placeholder="98765 43210"
                              aria-invalid={Boolean(touched.whatsappNumber && fieldErrors.whatsappNumber)}
                              aria-describedby={`${formIdPrefix}-signup-phone-helper`}
                              className={`flex-1 min-w-0 h-12 px-4 rounded-[12px] bg-[#F1EADF] border text-base text-[#2B2420] placeholder:text-[#6B5C50] transition-colors scroll-mt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] ${
                                touched.whatsappNumber && fieldErrors.whatsappNumber
                                  ? "border-[#A8483A]"
                                  : "border-[#DDD3C7] focus:border-[#2B2420]"
                              }`}
                            />
                          </div>
                          <p
                            id={`${formIdPrefix}-signup-phone-helper`}
                            className="text-xs text-[#6B5C50] mt-1"
                          >
                            Optional — used for booking updates
                          </p>
                          {touched.whatsappNumber && fieldErrors.whatsappNumber && (
                            <div
                              role="alert"
                              aria-live="polite"
                              className="flex items-center gap-1.5 mt-1 text-xs text-[#A8483A]"
                            >
                              <WarningIcon />
                              <span>{fieldErrors.whatsappNumber}</span>
                            </div>
                          )}
                        </div>

                        {/* Email */}
                        <div>
                          <label
                            htmlFor={`${formIdPrefix}-signup-email`}
                            className="block text-[0.8125rem] font-medium text-[#2B2420] mb-1.5"
                          >
                            Email <span className="text-[#A8483A]" aria-hidden="true">*</span>
                          </label>
                          <input
                            id={`${formIdPrefix}-signup-email`}
                            type="email"
                            autoComplete="email"
                            enterKeyHint="next"
                            required
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              handleFieldChange("email");
                            }}
                            onBlur={() => handleBlur("email", email)}
                            placeholder="you@example.com"
                            aria-invalid={Boolean(touched.email && fieldErrors.email)}
                            aria-describedby={
                              touched.email && fieldErrors.email ? `${formIdPrefix}-signup-email-err` : undefined
                            }
                            className={`w-full h-12 px-4 rounded-[12px] bg-[#F1EADF] border text-base text-[#2B2420] placeholder:text-[#6B5C50] transition-colors scroll-mt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] ${
                              touched.email && fieldErrors.email
                                ? "border-[#A8483A]"
                                : "border-[#DDD3C7] focus:border-[#2B2420]"
                            }`}
                          />
                          {touched.email && fieldErrors.email && (
                            <div
                              id={`${formIdPrefix}-signup-email-err`}
                              role="alert"
                              aria-live="polite"
                              className="flex items-center gap-1.5 mt-1 text-xs text-[#A8483A]"
                            >
                              <WarningIcon />
                              <span>{fieldErrors.email}</span>
                            </div>
                          )}
                        </div>

                        {/* Password */}
                        <div>
                          <label
                            htmlFor={`${formIdPrefix}-signup-password`}
                            className="block text-[0.8125rem] font-medium text-[#2B2420] mb-1.5"
                          >
                            Password <span className="text-[#A8483A]" aria-hidden="true">*</span>
                          </label>
                          <div className="relative">
                            <input
                              id={`${formIdPrefix}-signup-password`}
                              type={showPassword ? "text" : "password"}
                              autoComplete="new-password"
                              enterKeyHint="done"
                              required
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                handleFieldChange("password");
                              }}
                              onBlur={() => handleBlur("password", password)}
                              placeholder="Create a password (min 8 chars)"
                              aria-invalid={Boolean(touched.password && fieldErrors.password)}
                              aria-describedby={
                                touched.password && fieldErrors.password
                                  ? `${formIdPrefix}-signup-pass-err`
                                  : undefined
                              }
                              className={`w-full h-12 pl-4 pr-12 rounded-[12px] bg-[#F1EADF] border text-base text-[#2B2420] placeholder:text-[#6B5C50] transition-colors scroll-mt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] ${
                                touched.password && fieldErrors.password
                                  ? "border-[#A8483A]"
                                  : "border-[#DDD3C7] focus:border-[#2B2420]"
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((s) => !s)}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              className="absolute right-1 top-1 h-10 w-10 flex items-center justify-center text-[#6B5C50] hover:text-[#2B2420] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] rounded-lg"
                            >
                              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                          </div>
                          {touched.password && fieldErrors.password && (
                            <div
                              id={`${formIdPrefix}-signup-pass-err`}
                              role="alert"
                              aria-live="polite"
                              className="flex items-center gap-1.5 mt-1 text-xs text-[#A8483A]"
                            >
                              <WarningIcon />
                              <span>{fieldErrors.password}</span>
                            </div>
                          )}
                        </div>

                        {/* Primary Submit Button */}
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full h-12 min-h-[44px] rounded-[12px] bg-[#A8483A] hover:bg-[#923E31] text-white font-medium text-xs tracking-[0.14em] uppercase transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed mt-3"
                        >
                          {loading ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Creating account…
                            </span>
                          ) : (
                            "CREATE ACCOUNT"
                          )}
                        </button>

                        {/* "or" Divider */}
                        <div className="flex items-center my-4">
                          <div className="flex-1 h-px bg-[#DDD3C7]" />
                          <span className="px-3 text-xs tracking-wider text-[#6B5C50]">
                            or
                          </span>
                          <div className="flex-1 h-px bg-[#DDD3C7]" />
                        </div>

                        {/* Google and Microsoft Buttons (Identical 18px icons, perfectly aligned) */}
                        <div className="auth-social-grid grid grid-cols-2 gap-3 mb-4">
                          <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={loading || googleLoading || microsoftLoading}
                            aria-label="Continue with Google"
                            className="flex h-12 min-h-[44px] items-center justify-center gap-2.5 rounded-[12px] border border-[#DDD3C7] bg-white px-3 text-sm font-medium text-[#2B2420] transition-colors hover:bg-[#F1EADF]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] focus-visible:ring-offset-2 disabled:opacity-60"
                          >
                            {googleLoading ? (
                              <span className="flex items-center gap-1.5 text-xs">
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#2B2420] border-t-transparent" />
                                Google…
                              </span>
                            ) : (
                              <>
                                <GoogleIcon />
                                <span>Google</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleMicrosoftSignIn}
                            disabled={loading || googleLoading || microsoftLoading}
                            aria-label="Continue with Microsoft"
                            className="flex h-12 min-h-[44px] items-center justify-center gap-2.5 rounded-[12px] border border-[#DDD3C7] bg-white px-3 text-sm font-medium text-[#2B2420] transition-colors hover:bg-[#F1EADF]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] focus-visible:ring-offset-2 disabled:opacity-60"
                          >
                            {microsoftLoading ? (
                              <span className="flex items-center gap-1.5 text-xs">
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#2B2420] border-t-transparent" />
                                Microsoft…
                              </span>
                            ) : (
                              <>
                                <MicrosoftIcon />
                                <span>Microsoft</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Footer Terms & Privacy Policy */}
                        <p className="text-center text-xs text-[#6B5C50] leading-relaxed pt-1">
                          By creating an account, you agree to our{" "}
                          <Link
                            href="/terms"
                            onClick={() => onClose?.()}
                            className="underline hover:text-[#2B2420]"
                          >
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link
                            href="/privacy"
                            onClick={() => onClose?.()}
                            className="underline hover:text-[#2B2420]"
                          >
                            Privacy Policy
                          </Link>
                          .
                        </p>
                      </form>

                      {/* Mobile bottom switcher text */}
                      <div className="md:hidden mt-6 text-center text-sm text-[#6B5C50]">
                        Have an account?{" "}
                        <button
                          type="button"
                          onClick={() => switchMode("signin")}
                          className="font-medium text-[#A8483A] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] rounded px-1"
                        >
                          Sign in
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
