/**
 * lib/gender-prompt.ts — decides whether to ask a signed-in user for their
 * gender, and remembers a "Not now" for the rest of the session.
 *
 * Product rule: the profile gate appears at the start of EVERY visit until a
 * gender is stored, because the booking wizard uses it to match the right
 * specialist pool (`app/booking/page.tsx` filters employees by gender). A
 * dismissal must NOT persist across visits — sessionStorage only, so the
 * prompt returns next session if the gender is still missing. Setting a real
 * gender is the only thing that clears it for good.
 *
 * Kept pure + storage-isolated so it is unit-testable (the repo's vitest runs
 * plain TS in a node environment — no DOM).
 */

export interface GenderPromptState {
  /** A gender is already stored on the account. */
  hasGender: boolean;
  /** "Not now" was tapped earlier in THIS browser session. */
  dismissedThisSession: boolean;
  /** A higher-priority prompt (the post-Google-sign-in number ask) is up. */
  higherPriorityOpen: boolean;
}

const STORAGE_KEY = "gracesalon:gender-prompt-closed";

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
export function wasGenderPromptDismissed(): boolean {
  const store = getStorage();
  if (!store) return false;
  try {
    return store.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Remember a dismissal until the session ends (tab close / browser exit). */
export function rememberGenderPromptDismissed(): void {
  const store = getStorage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, "1");
  } catch {
    /* private mode — a lost dismissal only means we ask again */
  }
}

/** Forget a dismissal (used once a gender is actually saved). */
export function clearGenderPromptDismissed(): void {
  const store = getStorage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to recover from */
  }
}

/**
 * The single source of truth for "should the gender prompt be on screen?".
 *
 * True only when a gender is missing, the user has not dismissed it this
 * session, and no higher-priority modal owns the screen.
 */
export function shouldPromptForGender(state: GenderPromptState): boolean {
  if (state.hasGender) return false;
  if (state.dismissedThisSession) return false;
  if (state.higherPriorityOpen) return false;
  return true;
}
