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
  initialMode?: AuthMode;
}

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address";
  return null;
}

function validatePassword(password: string, isSignup: boolean): string | null {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (isSignup && password.length > 128) return "Password must be under 128 characters";
  return null;
}

function validateName(name: string): string | null {
  if (!name.trim()) return "Name is required";
  if (name.trim().length < 2) return "Name must be at least 2 characters";
  return null;
}

function validateWhatsappNumber(number: string): string | null {
  if (!number.trim()) return "WhatsApp number is required";
  const clean = number.replace(/[^0-9+]/g, "");
  if (!clean.match(/^\+?[0-9]{10,15}$/)) return "Please enter a valid WhatsApp number";
  return null;
}

export default function LoginModal({ open, onClose, initialMode = "signin" }: LoginModalProps) {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female" | "other">("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setSignupSuccess(false);
    }
  }, [initialMode, open]);

  // Focus first field when mode changes
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (mode === "signup" && !signupSuccess) nameRef.current?.focus();
      else emailRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [mode, open, signupSuccess]);

  const validateField = (field: string, value: string) => {
    let error: string | null = null;
    if (field === "name") error = validateName(value);
    else if (field === "email") error = validateEmail(value);
    else if (field === "password") error = validatePassword(value, mode === "signup");
    else if (field === "whatsappNumber") error = validateWhatsappNumber(value);
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
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

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
        setFormError("Invalid email or password. Please try again.");
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate all fields
    const nameErr = validateField("name", name);
    const emailErr = validateField("email", email);
    const passwordErr = validateField("password", password);
    const whatsappErr = validateField("whatsappNumber", whatsappNumber);
    setTouched({ name: true, email: true, password: true, whatsappNumber: true });
    if (nameErr || emailErr || passwordErr || whatsappErr) return;

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
          whatsappNumber: whatsappNumber.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      // Sign in the user
      const loginSuccess = await login(email.trim().toLowerCase(), password);

      if (loginSuccess) {
        setSignupSuccess(true);
      } else {
        showToast("Account created. Please sign in.", "success");
        setMode("signin");
        setPassword("");
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setGender("");
    setWhatsappNumber("");
    setShowPassword(false);
    setFieldErrors({});
    setTouched({});
    setFormError(null);
    setSignupSuccess(false);
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
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-beige-900/40 p-4 backdrop-blur-sm"
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
                  {signupSuccess ? "Verify Your Number" : mode === "signin" ? "Welcome Back" : `Join ${BRAND.name}`}
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

              {/* Tabs — hidden after successful signup */}
              {!signupSuccess && (
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
              )}
            </div>

            {/* ─── Signup success: show OTP verification CTA ─── */}
            {signupSuccess ? (
              <div className="px-6 py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="mb-2 font-serif text-lg font-semibold text-beige-700">
                  Account Created!
                </h3>
                <p className="mb-2 text-sm text-beige-600">
                  We&apos;ve sent a 6-digit verification code to your WhatsApp number
                  <span className="font-medium text-beige-700"> {whatsappNumber}</span>.
                </p>
                <p className="mb-6 text-xs text-beige-400">
                  Please enter the code to verify your account before booking.
                </p>

                <div className="flex flex-col gap-3">
                  <a
                    href="/verify-email"
                    onClick={(e) => {
                      e.preventDefault();
                      handleClose();
                      window.location.href = "/verify-email";
                    }}
                    className="btn-primary w-full py-3 text-center"
                  >
                    Verify WhatsApp Number →
                  </a>
                  <button
                    onClick={handleClose}
                    className="w-full text-center text-sm text-beige-400 hover:text-beige-600 hover:underline"
                  >
                    Do this later
                  </button>
                </div>
              </div>
            ) : (
              /* Form */
              <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="px-6 py-5" noValidate>
                {/* Inline form-level error */}
                <AnimatePresence>
                  {formError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 overflow-hidden"
                    >
                      <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
                        </svg>
                        <p className="text-sm text-red-600">{formError}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-4">
                  {mode === "signup" && (
                    <div>
                      <label htmlFor="auth-name" className="mb-1 block text-sm font-medium text-beige-700">
                        Full Name *
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

                  {mode === "signup" && (
                    <>
                      <div>
                        <label htmlFor="auth-gender" className="mb-1 block text-sm font-medium text-beige-700">
                          Gender *
                        </label>
                        <select
                          id="auth-gender"
                          required
                          value={gender}
                          onChange={(e) => setGender(e.target.value as "" | "male" | "female" | "other")}
                          className="w-full rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="auth-whatsapp" className="mb-1 block text-sm font-medium text-beige-700">
                          WhatsApp Number *
                        </label>
                        <input
                          id="auth-whatsapp"
                          type="tel"
                          autoComplete="tel"
                          required
                          value={whatsappNumber}
                          onChange={(e) => { setWhatsappNumber(e.target.value); handleFieldChange("whatsappNumber"); }}
                          onBlur={() => handleBlur("whatsappNumber", whatsappNumber)}
                          placeholder="e.g. +91 98765 43210"
                          className={`w-full rounded-xl border bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:bg-white focus:outline-none focus:ring-2 ${
                            touched.whatsappNumber && fieldErrors.whatsappNumber
                              ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                              : "border-beige-300 focus:border-beige-500 focus:ring-beige-200"
                          }`}
                        />
                        {touched.whatsappNumber && fieldErrors.whatsappNumber && (
                          <p className="mt-1.5 text-xs text-red-500">{fieldErrors.whatsappNumber}</p>
                        )}
                        <p className="mt-1 text-xs text-beige-400">
                          We&apos;ll send a verification code to this number
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-beige-700">
                      Email *
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
                      Password *
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
                        placeholder={mode === "signup" ? "Create a password (min 8 chars)" : "Enter your password"}
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
                    {mode === "signup" && touched.password && !fieldErrors.password && password.length >= 8 && (
                      <p className="mt-1.5 text-xs text-emerald-500">Password looks good</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || (mode === "signup" && (!gender || !whatsappNumber))}
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
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        window.location.href = "/reset-password";
                      }}
                      className="text-xs text-beige-500 hover:text-beige-700 hover:underline"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}

                {mode === "signup" && (
                  <p className="mt-4 text-center text-xs text-beige-400">
                    By creating an account, you agree to our Terms of Service and Privacy Policy.
                  </p>
                )}
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
