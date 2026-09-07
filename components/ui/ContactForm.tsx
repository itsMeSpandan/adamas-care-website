"use client";

import { useState, useRef } from "react";

interface FieldErrors {
  name?: string;
  email?: string;
  message?: string;
}

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email";
  return null;
}

function validateName(name: string): string | null {
  if (!name.trim()) return "Name is required";
  if (name.trim().length < 2) return "Name must be at least 2 characters";
  if (name.trim().length > 100) return "Name is too long";
  return null;
}

function validateMessage(message: string): string | null {
  if (!message.trim()) return "Message is required";
  if (message.trim().length < 10) return "Message must be at least 10 characters";
  if (message.trim().length > 2000) return "Message is too long (max 2000 characters)";
  return null;
}

// Rate limiting: max 3 submissions per 5 minutes per tab
const RATE_LIMIT_KEY = "gracesalon_contact_rate";
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW = 5 * 60 * 1000;

function checkRateLimit(): boolean {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return true;
    const timestamps: number[] = JSON.parse(raw);
    const now = Date.now();
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
    if (recent.length >= RATE_LIMIT_MAX) return false;
  } catch {
    // ignore
  }
  return true;
}

function recordSubmission() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
    recent.push(now);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
  } catch {
    // ignore
  }
}

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot field — hidden from real users, bots will fill it
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const validateField = (field: string, value: string) => {
    let error: string | null = null;
    if (field === "name") error = validateName(value);
    else if (field === "email") error = validateEmail(value);
    else if (field === "message") error = validateMessage(value);
    setErrors((prev) => {
      const next = { ...prev };
      if (error) next[field as keyof FieldErrors] = error;
      else delete next[field as keyof FieldErrors];
      return next;
    });
    return error;
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check — if filled, silently pretend success
    if (website) {
      setSubmitted(true);
      return;
    }

    // Rate limit check
    if (!checkRateLimit()) {
      setRateLimited(true);
      return;
    }

    // Validate all fields
    const nameErr = validateField("name", name);
    const emailErr = validateField("email", email);
    const messageErr = validateField("message", message);
    setTouched({ name: true, email: true, message: true });
    if (nameErr || emailErr || messageErr) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          message: message.trim(),
        }),
      });

      if (res.ok) {
        recordSubmission();
        setSubmitted(true);
      } else {
        setErrors({ message: "Failed to send message. Please try again." });
      }
    } catch {
      setErrors({ message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-card border border-beige-200 bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-beige-100">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-beige-500"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="font-serif text-xl font-semibold text-beige-700">
          Message Sent!
        </h3>
        <p className="mt-2 text-sm text-beige-600">
          Thank you for reaching out. We&apos;ll get back to you within 24
          hours.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-5 rounded-card border border-beige-200 bg-white p-6 shadow-card"
      noValidate
    >
      <div>
        <label
          htmlFor="contact-name"
          className="mb-1 block text-sm font-medium text-beige-700"
        >
          Name *
        </label>
        <input
          id="contact-name"
          type="text"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (touched.name) validateField("name", e.target.value);
          }}
          onBlur={() => handleBlur("name", name)}
          placeholder="Your name"
          className={`w-full rounded-xl border bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:bg-white focus:outline-none focus:ring-2 ${
            touched.name && errors.name
              ? "border-red-300 focus:border-red-400 focus:ring-red-100"
              : "border-beige-300 focus:border-beige-500 focus:ring-beige-200"
          }`}
        />
        {touched.name && errors.name && (
          <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="contact-email"
          className="mb-1 block text-sm font-medium text-beige-700"
        >
          Email *
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (touched.email) validateField("email", e.target.value);
          }}
          onBlur={() => handleBlur("email", email)}
          placeholder="your@email.com"
          className={`w-full rounded-xl border bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:bg-white focus:outline-none focus:ring-2 ${
            touched.email && errors.email
              ? "border-red-300 focus:border-red-400 focus:ring-red-100"
              : "border-beige-300 focus:border-beige-500 focus:ring-beige-200"
          }`}
        />
        {touched.email && errors.email && (
          <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="mb-1 block text-sm font-medium text-beige-700"
        >
          Message *
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (touched.message) validateField("message", e.target.value);
          }}
          onBlur={() => handleBlur("message", message)}
          placeholder="How can we help you?"
          className={`w-full resize-none rounded-xl border bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:bg-white focus:outline-none focus:ring-2 ${
            touched.message && errors.message
              ? "border-red-300 focus:border-red-400 focus:ring-red-100"
              : "border-beige-300 focus:border-beige-500 focus:ring-beige-200"
          }`}
        />
        {touched.message && errors.message && (
          <p className="mt-1.5 text-xs text-red-500">{errors.message}</p>
        )}
        <p className="mt-1 text-right text-[10px] text-beige-400">
          {message.length}/2000
        </p>
      </div>

      {/* Honeypot field — hidden visually, bots will fill it */}
      <div
        className="absolute left-[-9999px]"
        aria-hidden="true"
        tabIndex={-1}
      >
        <label htmlFor="contact-website">Leave this blank</label>
        <input
          id="contact-website"
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {rateLimited && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-600">
          Too many submissions. Please wait a few minutes before trying again.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full py-3"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Sending...
          </span>
        ) : (
          "Send Message"
        )}
      </button>
    </form>
  );
}
