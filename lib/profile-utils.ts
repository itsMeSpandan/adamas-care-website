/**
 * lib/profile-utils.ts
 *
 * Pure utilities for the customer profile / member card view.
 * Kept side-effect free and decoupled from React components for fast, reliable unit testing.
 */

export type ProfileSection = "profile" | "security" | "bookings" | "waitlist";

export const VALID_SECTIONS: readonly ProfileSection[] = [
  "profile",
  "security",
  "bookings",
  "waitlist",
] as const;

/**
 * Format account creation timestamp into "Member since <Month YYYY>"
 * (e.g. "Member since October 2026").
 *
 * If missing, null, undefined or invalid date, returns null so the UI
 * cleanly hides the line instead of rendering "undefined" or "NaN".
 */
export function formatMemberSince(dateStr?: string | null): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;

  // Format month and full 4-digit year in UTC for deterministic rendering
  const month = d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  const year = d.toLocaleDateString("en-US", { year: "numeric", timeZone: "UTC" });
  return `Member since ${month} ${year}`;
}

/**
 * Format loyalty points value as a safe numeric string with thousands separator.
 * Fallbacks cleanly to "0" on invalid, undefined, null, or negative inputs.
 */
export function formatLoyaltyPoints(points?: number | null): string {
  if (typeof points !== "number" || isNaN(points) || points < 0) {
    return "0";
  }
  return Math.floor(points).toLocaleString("en-US");
}

/**
 * Maps the user role into a display badge for the top-right of the member card.
 * - Customer / user: "MEMBER"
 * - Employee / specialist: "SPECIALIST"
 * - Admin: "ADMIN"
 */
export function getRoleBadge(role?: string | null): string {
  if (!role || typeof role !== "string") return "MEMBER";
  const normalized = role.trim().toLowerCase();
  if (normalized === "admin") return "ADMIN";
  if (normalized === "employee") return "SPECIALIST";
  return "MEMBER";
}

/**
 * Determines whether the loyalty points row should be rendered on the card.
 * - Customers always show points (even if 0 pts).
 * - Admin and employee accounts hide points when they have none (0 or null),
 *   per spec: "no loyalty points if they have none".
 */
export function shouldShowPoints(
  role?: string | null,
  points?: number | null
): boolean {
  const normRole = (role || "").trim().toLowerCase();
  const pts = typeof points === "number" && !isNaN(points) ? points : 0;

  if (normRole === "admin" || normRole === "employee") {
    return pts > 0;
  }
  return true;
}

/**
 * Normalizes query parameter (from `?section=` or `?tab=`) into a valid ProfileSection.
 * Returns null if the param is not recognized or missing, which defaults to the settings list.
 */
export function normalizeSection(param?: string | null): ProfileSection | null {
  if (!param || typeof param !== "string") return null;
  const normalized = param.trim().toLowerCase();
  if (VALID_SECTIONS.includes(normalized as ProfileSection)) {
    return normalized as ProfileSection;
  }
  return null;
}

/**
 * Extracts the active profile section from a URL query string or URLSearchParams.
 * Gives precedence to `section`, with transparent fallback to legacy `tab`
 * to protect deep links in emails, push notifications, and saved bookmarks.
 */
export function parseSectionFromUrl(
  search: string | URLSearchParams
): ProfileSection | null {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;

  const section = params.get("section");
  const tab = params.get("tab");

  return normalizeSection(section) || normalizeSection(tab);
}

export interface PushToggleState {
  permission: "granted" | "denied" | "default" | "unsupported" | "unknown";
  registered: boolean;
  busy: boolean;
  configured: boolean;
  isIosStandaloneRequired: boolean;
  error?: string | null;
}

/**
 * Computes presentation and accessibility states for the push notification switch.
 * Deterministic and easily tested across all device/permission scenarios.
 */
export function computePushToggleView(state: PushToggleState): {
  isOn: boolean;
  isDisabled: boolean;
  ariaLabel: string;
  helperText: string | null;
  helperType: "success" | "error" | "info" | null;
} {
  const isOn = state.permission === "granted" && state.registered;
  const isUnsupported = state.permission === "unsupported";
  const isDisabled =
    state.busy ||
    (!state.configured && state.permission !== "granted") ||
    isUnsupported;
  const ariaLabel = isOn
    ? "Turn off push notifications"
    : "Turn on push notifications";

  let helperText: string | null = null;
  let helperType: "success" | "error" | "info" | null = null;

  if (state.error) {
    helperText = state.error;
    helperType = "error";
  } else if (state.isIosStandaloneRequired) {
    helperText = "Add app to Home Screen to enable notifications on iOS";
    helperType = "info";
  } else if (state.permission === "denied") {
    helperText = "Blocked in browser — please allow in site settings";
    helperType = "error";
  } else if (isOn) {
    helperText = "This device is registered";
    helperType = "success";
  } else if (isUnsupported) {
    helperText = "Not supported on this browser";
    helperType = "info";
  }

  return { isOn, isDisabled, ariaLabel, helperText, helperType };
}

