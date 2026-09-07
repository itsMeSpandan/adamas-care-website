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
  session: "gracesalon_session",
  refresh: "gracesalon_refresh",
} as const;

export const TOKEN_EXPIRY = {
  access: "15m",
  refresh: "7d",
} as const;

// ─── Loyalty Points ───────────────────────────────────────────────────────────

/**
 * Points earned per currency unit spent.
 * 0.1 means 1 point per ₹10 spent (e.g. ₹85 haircut → 8 points).
 * Adjust this value to tune the earning rate.
 */
export const LOYALTY_POINTS_PER_CURRENCY_UNIT = 0.1;

/** Maximum points balance a user can hold (prevents abuse). */
export const LOYALTY_MAX_BALANCE = 100_000;

/** Redemption code length (alphanumeric). */
export const LOYALTY_REDEMPTION_CODE_LENGTH = 8;

/** Default redemption expiry in days (null = no expiry). */
export const LOYALTY_REDEMPTION_EXPIRY_DAYS = 90;
