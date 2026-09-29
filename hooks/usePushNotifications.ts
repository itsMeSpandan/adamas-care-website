"use client";

/**
 * hooks/usePushNotifications.ts — soft-ask push notification state.
 *
 * Contract:
 *   - Notification.requestPermission() runs ONLY when the user taps Enable
 *     (this hook never prompts on mount).
 *   - On grant: getToken → POST /api/devices/register (via syncPushDevice).
 *   - If permission was already granted, the subscription is refreshed on
 *     each load (also via syncPushDevice in AuthProvider).
 *   - iOS: push is only offered in standalone mode; otherwise the UI should
 *     show the install guide (exposed via `isIosStandaloneRequired`).
 *   - Disable: revoke the device server-side + delete the local token.
 */

import { useCallback, useEffect, useState } from "react";
import {
  isFirebaseClientConfigured,
  syncPushDevice,
  unregisterPushDevice,
} from "@/lib/firebase-client";

export type PushState = {
  /** Browser Notification.permission, or "unsupported" / "unknown" pre-mount. */
  permission: NotificationPermission | "unsupported" | "unknown";
  /** Device token is registered with the backend. */
  registered: boolean;
  /** An enable/disable call is in flight. */
  busy: boolean;
  /** iOS device that is NOT standalone → push unavailable until installed. */
  isIosStandaloneRequired: boolean;
  /** NEXT_PUBLIC_FIREBASE_* present. */
  configured: boolean;
  /** True when a token was registered this session/load. */
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
};

export function usePushNotifications(): PushState {
  const [permission, setPermission] = useState<PushState["permission"]>("unknown");
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isIosStandaloneRequired, setIsIosStandaloneRequired] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    setIsIosStandaloneRequired(isIos && !isStandalone);

    // Refresh on each load when permission was already granted — this also
    // re-registers after a backend token prune or new deployment.
    if (Notification.permission === "granted") {
      syncPushDevice().then((ok) => {
        if (ok) setRegistered(true);
      });
    }
  }, []);

  const enable = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return false;
    setBusy(true);
    try {
      // The ONLY place we prompt — triggered by the user's Enable tap.
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return false;
      const ok = await syncPushDevice();
      setRegistered(ok);
      return ok;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await unregisterPushDevice();
      setRegistered(false);
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    permission,
    registered,
    busy,
    isIosStandaloneRequired,
    configured: isFirebaseClientConfigured(),
    enable,
    disable,
  };
}
