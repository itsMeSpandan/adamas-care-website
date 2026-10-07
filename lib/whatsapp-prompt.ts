/**
 * lib/whatsapp-prompt.ts — decides whether to nudge a user for a WhatsApp number.
 *
 * Product rule: prompt Google sign-in users for their number the first time,
 * but NEVER prompt an account that already stores one.
 *
 * Kept pure and separate from the component so the guard can be unit-tested
 * (the repo has no React testing library — vitest runs plain TS only).
 */

/** Minimum shape needed to decide — mirrors AuthUser from lib/auth-context. */
export interface PromptableUser {
  whatsappNumber?: string | null;
  gender?: string | null;
}

function storageKey(userId: string): string {
  return `gracesalon:wa-prompt-dismissed:${userId}`;
}

/**
 * Safe localStorage access: unavailable during SSR, in private mode, or when
 * storage is blocked. Returns null instead of throwing.
 */
function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Has this user already dismissed the prompt on this device? */
export function wasWhatsAppPromptDismissed(userId: string): boolean {
  const store = getStorage();
  if (!store) return false;
  try {
    return store.getItem(storageKey(userId)) === "1";
  } catch {
    return false;
  }
}

/** Remember a dismissal so repeated Google sign-ins don't nag. */
export function rememberWhatsAppPromptDismissed(userId: string): void {
  const store = getStorage();
  if (!store) return;
  try {
    store.setItem(storageKey(userId), "1");
  } catch {
    /* quota / private mode — a lost dismissal only means we ask again */
  }
}

/** Forget a dismissal (used if the user later clears their number). */
export function clearWhatsAppPromptDismissed(userId: string): void {
  const store = getStorage();
  if (!store) return;
  try {
    store.removeItem(storageKey(userId));
  } catch {
    /* nothing to recover from */
  }
}

/**
 * Client-side mirror of the server rule in app/api/auth/profile/route.ts:
 * `replace(/[^0-9+]/g, "")` then `/^\+?[0-9]{10,15}$/`.
 *
 * Keep these identical — if they drift, the API rejects numbers the UI
 * already accepted. Returns an error message, or null when acceptable.
 */
export function validateWhatsAppNumber(number: string): string | null {
  const trimmed = number.trim();
  if (!trimmed) return "Please enter your phone number";
  const clean = trimmed.replace(/[^0-9+]/g, "");
  if (!clean.match(/^\+?[0-9]{10,15}$/)) {
    return "Please enter a valid phone number";
  }
  return null;
}

/**
 * The single source of truth for "should the prompt be on screen?".
 *
 * Prompts only when all of these hold:
 *   - there is a signed-in user,
 *   - their stored number or gender is missing
 *   - they have not dismissed it on this device.
 */
export function shouldPromptForWhatsApp(
  user: PromptableUser | null | undefined,
  dismissed: boolean,
): boolean {
  if (!user) return false;
  if (dismissed) return false;
  const missingPhone = (user.whatsappNumber ?? "").trim().length === 0;
  const missingGender = !user.gender || (user.gender ?? "").trim().length === 0;
  return missingPhone || missingGender;
}

