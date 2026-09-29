"use client";

/**
 * hooks/useInstallPrompt.ts — PWA install prompt plumbing.
 *
 * - Captures Chromium's `beforeinstallprompt` event (deferred prompt).
 * - Detects standalone/display-mode (already installed).
 * - Detects iOS Safari (no beforeinstallprompt there — the UI must show the
 *   manual Share → Add to Home Screen guide instead of a button).
 *
 * Hydration-safe: all browser state is read in useEffect, initial render is
 * neutral.
 */

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [ready, setReady] = useState(false); // hydration guard

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(!!standalone);

    // iOS Safari (not CriOS/FxiOS, which are WebKit wrappers — install
    // still works via Share, so keep them in the guide flow too).
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    setReady(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (!deferredPrompt) return "unavailable";
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") setDeferredPrompt(null);
      return choice.outcome;
    } catch {
      return "unavailable";
    }
  }, [deferredPrompt]);

  return {
    /** Chromium deferred prompt is available (button can be shown). */
    canPrompt: !!deferredPrompt,
    /** Already installed / running standalone. */
    isStandalone,
    /** iOS device → show the manual 3-step guide. */
    isIos,
    /** Browser detection finished (hydration guard). */
    ready,
    promptInstall,
  };
}
