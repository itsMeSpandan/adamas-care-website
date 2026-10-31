"use client";

/**
 * NotificationPromptModal — soft-ask to turn notifications on.
 *
 * Product rule: appear at the start of EVERY visit while notifications are
 * not enabled (per-session dismissal only — see lib/notification-prompt.ts),
 * so users get their booking reminders (next-day + 6 hours before) instead
 * of silently missing them.
 *
 * Soft-ask contract (same as NotificationSettings): the browser's permission
 * dialog fires ONLY when the user taps "Turn on" — never on mount.
 *
 * - permission "default"  → Enable button
 * - permission "denied"   → unblock hint (the browser prompt can never re-fire)
 * - granted / unconfigured / unsupported / iOS-not-installed → hidden
 * - yields the screen to WhatsAppPromptModal and GenderPromptModal
 *   (both higher priority)
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  shouldPromptForNotification,
  wasNotificationPromptDismissed,
  rememberNotificationPromptDismissed,
  type NotificationPromptMode,
} from "@/lib/notification-prompt";

export default function NotificationPromptModal() {
  const { whatsappPromptOpen, genderPromptOpen } = useAuth();
  const { showToast } = useToast();
  const {
    permission,
    configured,
    isIosStandaloneRequired,
    busy,
    enable,
  } = usePushNotifications();

  const [mode, setMode] = useState<NotificationPromptMode | null>(null);

  // Re-evaluate once hydration finished and the page has settled — and again
  // whenever a higher-priority prompt (Google sign-in number ask) goes away.
  useEffect(() => {
    if (permission === "unknown") return;

    const timer = setTimeout(() => {
      setMode(
        shouldPromptForNotification({
          supported: permission !== "unsupported",
          permission,
          configured,
          isIosStandaloneRequired,
          dismissedThisSession: wasNotificationPromptDismissed(),
          higherPriorityOpen: whatsappPromptOpen || genderPromptOpen,
        }),
      );
    }, 1200);

    return () => clearTimeout(timer);
  }, [permission, configured, isIosStandaloneRequired, whatsappPromptOpen, genderPromptOpen]);

  const close = () => setMode(null);

  const handleEnable = async () => {
    const ok = await enable();
    if (ok) {
      close();
      showToast("Notifications turned on — we'll remind you before your appointments", "success");
      return;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      // Browser prompt was already denied before → show the unblock hint.
      setMode("blocked");
      return;
    }
    // User dismissed the browser prompt — don't stack nags; return next visit.
    rememberNotificationPromptDismissed();
    close();
  };

  const handleLater = () => {
    rememberNotificationPromptDismissed();
    close();
  };

  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto overscroll-contain bg-beige-900/50 p-3 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notif-prompt-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="my-auto flex max-h-[calc(100svh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-card border border-beige-200 bg-white shadow-xl sm:max-h-[calc(100svh-2rem)]"
          >
            {/* Header */}
            <div className="min-h-0 grow overflow-y-auto border-b border-beige-100 px-4 py-4 text-center sm:px-6 sm:py-5">
              <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 sm:mb-3 sm:h-12 sm:w-12">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-600"
                  aria-hidden="true"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <h2
                id="notif-prompt-title"
                className="font-serif text-lg font-semibold leading-snug text-beige-700 sm:text-xl"
              >
                {mode === "enable"
                  ? "Turn on booking reminders"
                  : "Notifications are blocked"}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-beige-500 sm:text-sm">
                {mode === "enable" ? (
                  <>
                    Get your appointment reminders the day before and 6 hours
                    before — plus confirmations and cancellations, even when
                    the site isn&apos;t open. Email is always sent too.
                  </>
                ) : (
                  <>
                    Your browser is blocking notifications for this site, so
                    appointment reminders can&apos;t reach you. Open the lock or
                    settings icon next to the address bar, allow
                    notifications, then reload.
                  </>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="min-h-0 flex-shrink-0 px-4 py-4 sm:px-6 sm:py-5">
              {mode === "enable" ? (
                <>
                  <button
                    type="button"
                    onClick={handleEnable}
                    disabled={busy}
                    className="w-full btn-primary"
                  >
                    {busy ? "Turning on…" : "Turn on notifications"}
                  </button>
                  <button
                    type="button"
                    onClick={handleLater}
                    className="mt-3 w-full rounded-xl border border-beige-200 bg-white px-4 py-2.5 text-sm font-medium text-beige-600 transition-colors hover:border-beige-300 hover:text-beige-700"
                  >
                    Not now
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleLater}
                  className="w-full btn-primary"
                >
                  Got it
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
