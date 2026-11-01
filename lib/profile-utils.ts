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

/**
 * Format account creation timestamp into short format "Member since MM/YY"
 * (e.g. "Member since 10/26").
 *
 * If missing, invalid, or null, provides a safe fallback rather than undefined/NaN.
 */
export function formatMemberSinceShort(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== "string") {
    return "Member since 10/26";
  }
  const trimmed = dateStr.trim();
  if (!trimmed) {
    return "Member since 10/26";
  }

  // Already formatted like "Member since MM/YY"
  const shortMatch = trimmed.match(/^member\s+since\s+(\d{1,2}\/\d{2})$/i);
  if (shortMatch) {
    return `Member since ${shortMatch[1]}`;
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yy = String(d.getUTCFullYear()).slice(-2);
    return `Member since ${mm}/${yy}`;
  }

  // Attempt to parse "Month YYYY" or "Member since Month YYYY"
  const cleanStr = trimmed.replace(/^member\s+since\s+/i, "");
  const parsedDate = new Date(`${cleanStr} 1 UTC`);
  if (!isNaN(parsedDate.getTime())) {
    const mm = String(parsedDate.getUTCMonth() + 1).padStart(2, "0");
    const yy = String(parsedDate.getUTCFullYear()).slice(-2);
    return `Member since ${mm}/${yy}`;
  }

  return "Member since 10/26";
}

/**
 * Format a realistic, elegant member ID: "AC26 0001 8842"
 * - AC: Adamas Care brand prefix
 * - 2-digit year from account creation (or 26)
 * - Two 4-character blocks generated deterministically from the user ID
 */
export function formatMemberId(userId?: string | null, createdAt?: string | null): string {
  let year = "26";
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      year = String(d.getUTCFullYear()).slice(-2);
    }
  }

  if (!userId || typeof userId !== "string") {
    return `AC${year} 0001 8842`;
  }

  const trimmed = userId.trim();
  if (!trimmed) {
    return `AC${year} 0001 8842`;
  }

  // If already matches ACyy xxxx yyyy
  if (/^AC\d{2}\s+[A-Z0-9]{4}\s+[A-Z0-9]{4}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // Deterministic 4-digit numeric blocks from string characters
  let h1 = 5381;
  let h2 = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed.charCodeAt(i);
    h1 = ((h1 << 5) + h1) ^ c;
    h2 = ((h2 << 7) - h2) ^ (c * 31);
  }

  const b1 = String(Math.abs(h1) % 10000).padStart(4, "0");
  const b2 = String(Math.abs(h2) % 10000).padStart(4, "0");

  return `AC${year} ${b1} ${b2}`;
}


