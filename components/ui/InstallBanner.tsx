"use client";

/**
 * InstallBanner — PWA install CTA.
 *
 * Mount point (contract): global — app/layout.tsx, where a fixed wrapper
 * floats it at the BOTTOM CENTRE of the viewport.
 *
 * - Chromium: "Install app" button (beforeinstallprompt deferred prompt).
 * - iOS Safari: 3-step guide (Share → Add to Home Screen → Add). iOS exposes
 *   no programmatic install, so there is nothing to click there.
 * - Only shown on browsers that actually support installing a web app: the
 *   Chromium branch needs the deferred prompt, the iOS branch needs a WebKit
 *   mobile UA. Anything else renders nothing.
 * - The prompt retires itself after AUTO_HIDE_MS (2 minutes) so it never sits
 *   on screen for the whole visit; the ✕ clears it immediately.
 * - Closing with the ✕ lasts for the CURRENT session only (sessionStorage, not
 *   localStorage): closing the tab forgets it and the prompt returns next
 *   visit, per the product rule "prompt every time until they have allowed to
 *   install". Accepting the install ends prompting permanently. The 2-minute
 *   timeout is a softer exit — it hides the banner for the rest of this page's
 *   life without recording a dismissal.
 */

import { useCallback, useEffect, useState } from "react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { BRAND } from "@/lib/brand";

/** How long the floating prompt stays on screen before retiring itself. */
export const AUTO_HIDE_MS = 2 * 60 * 1000;

const DISMISS_KEY = "gracesalon:install-banner-dismissed-this-session";

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false; // sessionStorage blocked → allow banner
  }
}

function writeDismissed(): void {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
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
  const [timedOut, setTimedOut] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  // Docked bottom-centre by app/layout.tsx — stay hidden while the cookie bar
  // owns the bottom of the screen (it re-checks live via the custom event).
  const [cookiePending, setCookiePending] = useState(true);

  useEffect(() => {
    setDismissed(readDismissed());
    try {
      setCookiePending(!window.localStorage.getItem("gracesalon_cookie_consent"));
    } catch {
      setCookiePending(false);
    }
    const onCookieDecided = () => setCookiePending(false);
    window.addEventListener("gracesalon:cookie-decided", onCookieDecided);
    return () => window.removeEventListener("gracesalon:cookie-decided", onCookieDecided);
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

  // Show only when there is actually something to offer, and only on a browser
  // that can install a web app.
  const visible =
    ready &&
    !dismissed &&
    !timedOut &&
    !installed &&
    !isStandalone &&
    !cookiePending &&
    (isIos || canPrompt);

  // Retire the prompt after AUTO_HIDE_MS. Restarts if it is re-shown (e.g. the
  // deferred prompt arrives late), cleared whenever it hides or unmounts.
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setTimedOut(true), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  // iOS Safari: no programmatic prompt — show the manual guide.
  if (isIos) {
    return (
      <div
        role="dialog"
        aria-label={`Install ${BRAND.name}`}
        className="rounded-card border border-beige-200 bg-white p-4 shadow-card sm:p-5"
      >
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
            aria-label="Close install prompt"
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
  return (
    <div
      role="dialog"
      aria-label={`Install ${BRAND.name}`}
      className="flex items-center justify-between gap-3 rounded-card border border-beige-200 bg-white p-4 shadow-card sm:gap-4 sm:p-5"
    >
      <div className="min-w-0">
        <h3 className="font-serif text-base font-semibold text-beige-700 sm:text-lg">
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
          className="btn-primary px-3 py-2 text-sm sm:px-4"
        >
          {installing ? "Installing…" : "Install app"}
        </button>
        <button
          onClick={dismiss}
          aria-label="Close install prompt"
          className="flex h-8 w-8 items-center justify-center rounded-full text-beige-400 transition-colors hover:bg-beige-100 hover:text-beige-600"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
