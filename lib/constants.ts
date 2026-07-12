/**
 * lib/constants.ts — Shared constants used across the application.
 *
 * Centralizes values that were previously duplicated across multiple files.
 */

// ─── Booking Status Colors ─────────────────────────────────────────────────────

/** Status color map for booking status badges (single-line string format) */
export const statusColors: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

/** Status badge config for split bg/text classes (used in WeeklyTimetable, schedule) */
export const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: "bg-green-100", text: "text-green-700" },
  completed: { bg: "bg-blue-100", text: "text-blue-700" },
  pending: { bg: "bg-amber-100", text: "text-amber-700" },
  cancelled: { bg: "bg-red-100", text: "text-red-700" },
};

// ─── Cookie & Auth Constants ───────────────────────────────────────────────────

export const COOKIE_NAMES = {
  session: "adamascare_session",
  refresh: "adamascare_refresh",
} as const;

export const TOKEN_EXPIRY = {
  access: "15m",
  refresh: "7d",
} as const;
