/**
 * lib/holidays.ts — Indian public and festive holidays via date-holidays.
 *
 * Uses the date-holidays package for India (IN) / West Bengal (WB) to
 * dynamically compute holidays for any year. Admin can also add custom
 * holidays via /api/admin/holidays (stored in the Holiday DB model).
 */

import Holidays from "date-holidays";

export interface HolidayEntry {
  name: string;
  date: string; // YYYY-MM-DD
  type: "public" | "festive";
  isRecurring: boolean;
}

// ─── date-holidays instance for India / West Bengal ──────────────────────────

const hd = new Holidays("IN", "WB");

/**
 * Get all date-holidays holidays for a given year, converted to our HolidayEntry format.
 * Includes both public and bank holidays from the date-holidays library.
 */
export function getHolidaysForYear(year: number): HolidayEntry[] {
  const raw = hd.getHolidays(year);
  return raw.map((h) => ({
    name: h.name,
    date: typeof h.date === "string" ? h.date.substring(0, 10) : new Date(h.date).toISOString().split("T")[0],
    type: h.type === "public" ? "public" : "festive",
    // National fixed-date holidays recur every year; lunar-based ones don't
    isRecurring: isFixedDateHoliday(h.name),
  }));
}

// ─── Fixed-date holidays (recurring annually) ───────────────────────────────

function isFixedDateHoliday(name: string): boolean {
  const fixedNames = [
    "Republic Day",
    "Independence Day",
    "Gandhi Jayanti",
    "Christmas Day",
    "New Year",
    "Dr. Ambedkar Jayanti",
    "May Day",
    "Labour Day",
  ];
  return fixedNames.some((fn) => name.toLowerCase().includes(fn.toLowerCase()));
}

// ─── Helper functions (work with both DB results and HolidayEntry) ───────────

/**
 * Normalize a date value to a YYYY-MM-DD string.
 * Accepts Date objects (from Prisma) or ISO date strings.
 */
function normalizeDate(d: Date | string): string {
  if (typeof d === "string") return d.substring(0, 10);
  return d.toISOString().split("T")[0];
}

/**
 * Check if a given date string (YYYY-MM-DD) is a holiday.
 * Works with both DB results ({ date: Date; name: string }[]) and HolidayEntry[].
 */
export function isHoliday(dateStr: string, holidays: { date: Date | string; name: string }[]): boolean {
  return holidays.some((h) => normalizeDate(h.date) === dateStr);
}

/**
 * Get holiday name for a date string, if any.
 * Works with both DB results ({ date: Date; name: string }[]) and HolidayEntry[].
 */
export function getHolidayName(dateStr: string, holidays: { date: Date | string; name: string }[]): string | null {
  const found = holidays.find((h) => normalizeDate(h.date) === dateStr);
  return found ? found.name : null;
}
