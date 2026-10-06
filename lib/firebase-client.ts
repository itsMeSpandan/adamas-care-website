/**
 * lib/firebase-client.ts — browser-side Firebase Web Messaging.
 *
 * Uses NEXT_PUBLIC_FIREBASE_* (public by design; the service account key
 * never touches the client) + NEXT_PUBLIC_FIREBASE_VAPID_KEY for Web Push.
 *
 * All functions are safe to call in any browser and return null/false when
 * Firebase isn't configured yet (HUMAN STEPS: set the env vars), so the
 * feature degrades silently instead of crashing the page.
 *
 * Dynamic imports keep firebase out of the initial page bundle.
 */

export function isFirebaseClientConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  );
}

type MessagingModule = typeof import("firebase/messaging");

let messagingPromise: Promise<ReturnType<MessagingModule["getMessaging"]> | null> | null = null;

async function getMessagingInstance() {
  if (!isFirebaseClientConfigured()) return null;
  if (!messagingPromise) {
    messagingPromise = (async () => {
      try {
        const { initializeApp, getApps } = await import("firebase/app");
        const { getMessaging } = await import("firebase/messaging");
        const app =
          getApps()[0] ??
          initializeApp({
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
          });
        return getMessaging(app);
      } catch (err) {
        console.warn("[Push] Firebase client init failed:", err);
        return null;
      }
    })();
  }
  return messagingPromise;
}

/**
 * Google sign-in popup — returns a Firebase ID token to POST to
 * /api/auth/google, or null when cancelled / blocked / unconfigured.
 *
 * Errors are normalized to a user-facing message via the returned
 * { error } variant so the login modal can display something useful.
 */
export type GoogleSignInResult =
  | { idToken: string }
  | { error: string }
  | null; // user closed the popup — not an error

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (!isFirebaseClientConfigured()) {
    return { error: "Google sign-in is not configured yet." };
  }
  try {
    const { initializeApp, getApps } = await import("firebase/app");
    const { getAuth, GoogleAuthProvider, signInWithPopup } = await import(
      "firebase/auth"
    );
    const app =
      getApps()[0] ??
      initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });

    const credential = await signInWithPopup(getAuth(app), new GoogleAuthProvider());
    const idToken = await credential.user.getIdToken();
    return { idToken };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    // User dismissed the popup — silently ignore (no error banner).
    if (
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    ) {
      return null;
    }
    if (code === "auth/popup-blocked") {
      return { error: "Pop-up blocked. Allow pop-ups for this site and try again." };
    }
    console.warn("[GoogleAuth] sign-in failed:", err);
    return { error: "Google sign-in failed. Please try again." };
  }
}

/** Service worker registration used for push (from /firebase-messaging-sw.js). */
export async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    // Wait for our messaging SW; other SWs (if any) are left alone.
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing) return existing;
    return await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
  } catch (err) {
    console.warn("[Push] Service worker registration failed:", err);
    return null;
  }
}

/**
 * Get (or refresh) the FCM registration token for this browser.
 * Returns null when unconfigured, permission denied, or registration fails.
 */
export async function getFcmToken(): Promise<string | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const registration = await getSwRegistration();
  if (!registration) return null;

  try {
    const { getToken } = await import("firebase/messaging");
    return await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
  } catch (err) {
    console.warn("[Push] getToken failed:", err);
    return null;
  }
}

/** Fire-and-forget: delete the FCM token (used on logout). */
export async function deleteFcmToken(): Promise<void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return;
  try {
    const { deleteToken } = await import("firebase/messaging");
    await deleteToken(messaging);
  } catch (err) {
    console.warn("[Push] deleteToken failed:", err);
  }
}

// ─── Device registration (page → /api/devices/*) ─────────────────────────────

const PUSH_TOKEN_KEY = "gracesalon:push-token";

function readStoredToken(): string | null {
  try {
    return window.localStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(PUSH_TOKEN_KEY, token);
    else window.localStorage.removeItem(PUSH_TOKEN_KEY);
  } catch {
    /* private mode — non-fatal */
  }
}

/**
 * Sync this browser's push subscription with the backend (idempotent):
 * get/refresh the FCM token, POST /api/devices/register, remember it for
 * logout. Safe to call on every page load — a no-op without permission or
 * Firebase config.
 */
export async function syncPushDevice(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  if (!isFirebaseClientConfigured()) return false;

  try {
    const token = await getFcmToken();
    if (!token) return false;

    const res = await fetch("/api/devices/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token, platform: "web" }),
    });
    if (res.ok) {
      storeToken(token);
      return true;
    }
    return false;
  } catch (err) {
    console.warn("[Push] device sync failed:", err);
    return false;
  }
}

/**
 * Revoke this browser's device on the backend and drop the local token.
 * Called on logout (while the session cookie is still valid).
 */
export async function unregisterPushDevice(): Promise<void> {
  if (typeof window === "undefined") return;

  const token = readStoredToken();
  storeToken(null);

  if (token) {
    try {
      await fetch("/api/devices/unregister", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
    } catch (err) {
      console.warn("[Push] device unregister failed:", err);
    }
  }

  await deleteFcmToken();
}
