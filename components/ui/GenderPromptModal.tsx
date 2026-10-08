"use client";

/**
 * GenderPromptModal — profile gate that asks for the account's gender.
 *
 * Why this exists: the booking wizard matches customers to specialists by
 * gender (`app/booking/page.tsx` filters `!user?.gender || e.gender ===
 * user.gender`), so an account with no gender gets the wrong (or every)
 * specialist. Nothing else on the site can set it for a customer session.
 *
 * Product rule: appear at the START OF EVERY VISIT until a gender is stored.
 * "Not now" is a per-session dismissal only (see lib/gender-prompt.ts) — it
 * comes back next session. Saving a gender clears it for good.
 *
 * Priority: yields to the post-Google-sign-in number ask (it captures gender
 * too), and NotificationPromptModal in turn yields to this one.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";

const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
] as const;

export default function GenderPromptModal() {
  const {
    user,
    genderPromptOpen,
    whatsappPromptOpen,
    dismissGenderPrompt,
    updateUser,
  } = useAuth();
  const { showToast } = useToast();

  const [gender, setGender] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Double guard: never render for a user who already stored a gender, and
  // never stack on top of the higher-priority number prompt.
  const open = genderPromptOpen && !whatsappPromptOpen && !!user && !user.gender;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!gender) {
      setError("Please select one option.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not save. Please try again.");
        return;
      }

      const data = await res.json();
      updateUser({ gender: data.user?.gender ?? gender });
      setGender("");
      showToast("Thanks — that helps us match you to the right specialist", "success");
      dismissGenderPrompt();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLater = () => {
    setGender("");
    setError("");
    dismissGenderPrompt();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-beige-900/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gender-prompt-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md overflow-hidden rounded-card border border-beige-200 bg-white shadow-xl"
          >
            {/* Header */}
            <div className="border-b border-beige-100 px-6 py-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-beige-100">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-beige-600"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
                </svg>
              </div>
              <h2
                id="gender-prompt-title"
                className="font-serif text-xl font-semibold text-beige-700"
              >
                One quick thing
              </h2>
              <p className="mt-1 text-sm text-beige-500">
                Please tell us your gender so we can match you with the right
                specialist when you book.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5">
              <fieldset>
                <legend className="sr-only">Gender</legend>
                <div className="flex gap-3">
                  {GENDERS.map((g) => (
                    <label
                      key={g.value}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm font-medium text-beige-700 transition-colors hover:bg-beige-100 has-[:checked]:border-beige-600 has-[:checked]:bg-beige-100"
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={g.value}
                        checked={gender === g.value}
                        onChange={(e) => setGender(e.target.value)}
                        className="text-beige-600 focus:ring-beige-500"
                      />
                      {g.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving || !gender}
                className="mt-6 w-full btn-primary"
              >
                {saving ? "Saving..." : "Save"}
              </button>

              <button
                type="button"
                onClick={handleLater}
                className="mt-3 w-full rounded-xl border border-beige-200 bg-white px-4 py-2.5 text-sm font-medium text-beige-600 transition-colors hover:border-beige-300 hover:text-beige-700"
              >
                Not now
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
