"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"send" | "verify">("send");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "OTP sent! Check your WhatsApp.");
        setStep("verify");
      } else {
        setError(data.error || "Failed to send OTP");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!otp || otp.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Account verified! Redirecting...");
        setTimeout(() => router.push("/"), 1500);
      } else {
        setError(data.error || "Verification failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Verify Your Account
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          {step === "send"
            ? "We'll send a 6-digit verification code to your WhatsApp number."
            : "Enter the 6-digit code we sent to your WhatsApp."}
        </p>

        {message && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {step === "send" ? (
          <button
            onClick={handleSendOtp}
            disabled={loading}
            className="w-full py-3 bg-[var(--accent-primary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? "Sending..." : "Send Verification Code"}
          </button>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full text-center text-2xl tracking-[0.5em] py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              maxLength={6}
            />
            <button
              onClick={handleVerify}
              disabled={loading || otp.length !== 6}
              className="w-full py-3 bg-[var(--accent-primary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition"
            >
              {loading ? "Verifying..." : "Verify Account"}
            </button>
            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
            >
              Resend code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
