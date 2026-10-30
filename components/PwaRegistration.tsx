"use client";

import { useEffect } from "react";

/**
 * PwaRegistration — registers the root-scope service worker (/sw.js).
 *
 * Mount point (contract): global — app/layout.tsx. Renders nothing.
 *
 * Production only: in `next dev` a cached offline fallback and a stale
 * cache-first shell would mask hot-reload updates.
 *
 * Note on scope: /sw.js and /firebase-messaging-sw.js both claim "/", so this
 * registration replaces the FCM worker's. /sw.js imports the FCM file, which
 * keeps push notifications working.
 */
export default function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("[PWA] Service worker registration failed:", err);
        });
    };

    // Wait for the window load event so the worker's install/precache cannot
    // compete with the first paint.
    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
