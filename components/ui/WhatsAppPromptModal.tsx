"use client";

/**
 * WhatsAppPromptModal — one-time ask for a contact number after Google sign-in.
 *
 * Why this exists: Google sign-in has no phone field, the profile page has no
 * phone input, and the booking page shows the number readOnly — so without
 * this prompt a Google-created account can never gain a contact number.
 *
 * It must NOT appear when the account already stores one; that guard lives in
 * shouldPromptForWhatsApp() (lib/whatsapp-prompt.ts) and is enforced twice —
 * once when the flag is raised in auth-context, and again here on render.
 *
 * Copy says "contact number", not "WhatsApp messages": the WhatsApp send API
 * was removed in Phase 1, so promising messages would be a lie. The number is
 * used to auto-fill bookings.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import {
  shouldPromptForWhatsApp,
  validateWhatsAppNumber,
} from "@/lib/whatsapp-prompt";
import {
  absorbPhoneInput,
  composePhoneNumber,
  DEFAULT_COUNTRY,
} from "@/lib/countries";
import CountryCodeSelect from "@/components/ui/CountryCodeSelect";

export default function WhatsAppPromptModal() {
  const { user, whatsappPromptOpen, dismissWhatsAppPrompt, updateUser } = useAuth();
  const { showToast } = useToast();

  // National digits live here; the country dial code lives in `dial`. They are
  // composed into the E.164-ish `+<dial><number>` the API validates.
  const [number, setNumber] = useState("");
  const [dial, setDial] = useState(`+${DEFAULT_COUNTRY.dial}`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fullNumber = composePhoneNumber(dial, number);

  // Double guard: even if the flag is somehow raised for a user who already
  // has a number, never render the prompt.
  const open = whatsappPromptOpen && shouldPromptForWhatsApp(user, false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateWhatsAppNumber(fullNumber);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappNumber: fullNumber }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not save your number. Please try again.");
        return;
      }

      const data = await res.json();
      updateUser({
        whatsappNumber: data.user?.whatsappNumber ?? fullNumber,
      });
      setNumber("");
      showToast("Contact number saved", "success");
      dismissWhatsAppPrompt();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    setNumber("");
    setError("");
    dismissWhatsAppPrompt();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-beige-900/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wa-prompt-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md overflow-hidden rounded-card border border-beige-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-beige-100 px-6 py-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-600"
                  aria-hidden="true"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <h2
                id="wa-prompt-title"
                className="font-serif text-xl font-semibold text-beige-700"
              >
                Add your contact number
              </h2>
              <p className="mt-1 text-sm text-beige-500">
                We&apos;ll use it to pre-fill your number when you book, so you
                never have to type it again.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="wa-prompt-number"
                    className="mb-1 block text-sm font-medium text-beige-700"
                  >
                    Phone number
                  </label>
                  <div className="flex gap-2">
                    <CountryCodeSelect
                      value={dial}
                      onChange={setDial}
                      ariaLabel="Country dial code"
                      className="w-[118px] shrink-0"
                    />
                    <input
                      id="wa-prompt-number"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={number}
                      onChange={(e) => {
                        const next = absorbPhoneInput(e.target.value, dial);
                        setDial(next.dial);
                        setNumber(next.national);
                      }}
                      placeholder="98765 43210"
                      autoFocus
                      className="min-w-0 flex-1 rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-beige-400">
                    Optional — but it makes booking faster.
                  </p>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={saving || !number.trim()}
                className="mt-6 w-full btn-primary"
              >
                {saving ? "Saving..." : "Save number"}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="mt-3 w-full rounded-xl border border-beige-200 bg-white px-4 py-2.5 text-sm font-medium text-beige-600 transition-colors hover:border-beige-300 hover:text-beige-700"
              >
                Maybe later
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
