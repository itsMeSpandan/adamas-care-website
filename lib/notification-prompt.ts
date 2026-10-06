/**
 * lib/notification-prompt.ts — decides whether to nudge the user to turn
 * notifications on, and remembers a "Not now" for the rest of the session.
 *
 * Product rule: prompt at the start of EVERY visit until notifications are
 * actually granted (blocked browsers get an unblock hint instead). Dismissal
 * must NOT persist across visits — sessionStorage only, so the prompt returns
 * next session if the user still hasn't allowed.
 *
 * Kept pure + storage-isolated so it is unit-testable (the repo's vitest runs
 * plain TS in a node environment — no DOM).
 */

export type NotificationPromptMode = "enable" | "blocked";

export interface NotificationPromptState {
  /** Notification API exists in this browser. */
  supported: boolean;
  /** Browser permission state (only "default" | "denied" matter). */
  permission: NotificationPermission | "unknown" | "unsupported";
  /** Push backend configured (NEXT_PUBLIC_FIREBASE_* present). */
  configured: boolean;
  /** iOS Safari without the installed app — prompt would be pointless. */
  isIosStandaloneRequired: boolean;
  /** "Not now" was tapped this session. */
  dismissedThisSession: boolean;
  /** The post-Google-sign-in number prompt owns the screen right now. */
  higherPriorityOpen: boolean;
}

const STORAGE_KEY = "gracesalon:notif-prompt-closed";

/**
 * Safe sessionStorage access: unavailable during SSR, in private mode, or
 * when storage is blocked. Returns null instead of throwing.
 */
function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Has the user said "Not now" earlier in THIS browser session? */
export function wasNotificationPromptDismissed(): boolean {
  const store = getStorage();
  if (!store) return false;
  try {
    return store.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Remember a dismissal until the session ends (tab close / browser exit). */
export function rememberNotificationPromptDismissed(): void {
  const store = getStorage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, "1");
  } catch {
    /* private mode — a lost dismissal only means we ask again */
  }
}

/**
 * The single source of truth for "should the prompt be on screen?".
 *
 * Returns:
 *   - "enable"  → permission is default: show the soft-ask with an Enable button
 *   - "blocked" → permission denied: show the unblock hint (the browser will
 *                 never show its own prompt again for this site)
 *   - null      → stay hidden (granted, unconfigured, unsupported, iOS-not-
 *                 installed, dismissed this session, or a higher-priority
 *                 modal owns the screen)
 */
export function shouldPromptForNotification(
  state: NotificationPromptState,
): NotificationPromptMode | null {
  if (!state.supported) return null;
  if (!state.configured) return null;
  if (state.isIosStandaloneRequired) return null;
  if (state.dismissedThisSession) return null;
  if (state.higherPriorityOpen) return null;
  if (state.permission === "granted") return null;
  if (state.permission === "default") return "enable";
  if (state.permission === "denied") return "blocked";
  // "unknown" (pre-hydration) or "unsupported" — wait.
  return null;
}
