"use client";

/**
 * InstallBanner — PWA install CTA.
 *
 * Mount points (contract): ONLY after a successful booking or on the
 * My Bookings page — never on first load.
 *
 * - Chromium: "Install <brand>" button (beforeinstallprompt deferred prompt).
 * - iOS Safari: 3-step guide (Share → Add to Home Screen → Add).
 * - Dismissal remembered for 14 days in localStorage (try/catch,
 *   hydration-safe: hidden until browser state is read).
 */

import { useCallback, useEffect, useState } from "react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { BRAND } from "@/lib/brand";

const DISMISS_KEY = "gracesalon:install-banner-dismissed-at";
const DISMISS_DAYS = 14;

function readDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false; // localStorage blocked → allow banner
  }
}

function writeDismissed(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* private mode — dismissal just won't persist */
  }
}

const IOS_STEPS = [
  { n: 1, label: "Share", hint: "Tap the Share button in the Safari toolbar" },
  { n: 2, label: "Add to Home Screen", hint: "Scroll the share sheet and tap it" },
  { n: 3, label: "Add", hint: "Confirm — the app appears on your home screen" },
];

export default function InstallBanner() {
  const { canPrompt, isStandalone, isIos, ready, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true); // hidden until checked
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const dismiss = useCallback(() => {
    writeDismissed();
    setDismissed(true);
  }, []);

  const handleInstall = useCallback(async () => {
    setInstalling(true);
    try {
      const outcome = await promptInstall();
      if (outcome === "accepted") setInstalled(true);
      else if (outcome === "dismissed") dismiss();
    } finally {
      setInstalling(false);
    }
  }, [promptInstall, dismiss]);

  // Nothing to show: hydration pending, already installed, or dismissed.
  if (!ready || dismissed || isStandalone || installed) return null;

  // iOS Safari: no programmatic prompt — show the manual guide.
  if (isIos) {
    return (
      <div className="rounded-card border border-beige-200 bg-white p-5 shadow-card">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-semibold text-beige-700">
              Install {BRAND.name}
            </h3>
            <p className="text-xs text-beige-500">
              Add the app to your home screen for one-tap booking.
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-beige-400 transition-colors hover:bg-beige-100 hover:text-beige-600"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <ol className="space-y-2">
          {IOS_STEPS.map((step) => (
            <li key={step.n} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-beige-100 text-xs font-semibold text-beige-700">
                {step.n}
              </span>
              <span className="text-sm text-beige-700">
                <strong>{step.label}</strong>
                <span className="block text-xs text-beige-500">{step.hint}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  // Chromium (or any browser exposing beforeinstallprompt).
  if (!canPrompt) return null;

  return (
    <div className="rounded-card border border-beige-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg font-semibold text-beige-700">
            Install {BRAND.name}
          </h3>
          <p className="text-xs text-beige-500">
            Book faster with the app on your device.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleInstall}
            disabled={installing}
            className="btn-primary px-4 py-2 text-sm"
          >
            {installing ? "Installing…" : "Install"}
          </button>
          <button
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="flex h-8 w-8 items-center justify-center rounded-full text-beige-400 transition-colors hover:bg-beige-100 hover:text-beige-600"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
