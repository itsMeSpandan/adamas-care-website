/**
 * lib/booking-time.ts — the time-based rules that gate a booking's lifecycle.
 *
 * Two product rules live here so they are enforced in exactly one place and can
 * be unit-tested without a database:
 *
 *   1. Same-day bookings need at least SAME_DAY_LEAD_MINUTES notice. A slot on
 *      today's date that starts sooner than "now + 2 hours" is not offered and
 *      cannot be created — otherwise a customer could book a treatment that
 *      starts before the specialist could possibly be ready.
 *
 *   2. A booking cannot be marked COMPLETED before its appointment has started.
 *      Completing a future booking would award loyalty points for a service
 *      nobody has received yet.
 *
 * Times follow the convention already used by the availability engine and the
 * cancellation policy (app/api/bookings/[id]/route.ts): `date` is a UTC-midnight
 * day and `slotStart`/`slotEnd` are "HH:MM" wall-clock strings interpreted as
 * UTC. Keep that in sync here or the rules will disagree with the calendar.
 */

/** Minimum notice for a same-day booking, in minutes (2 hours). */
export const SAME_DAY_LEAD_MINUTES = 120;

/** "14:30" → 870. Returns null when the string is missing or unparseable. */
export function parseHmToMinutes(value: string | null | undefined): number | null {
  if (typeof value !== "string" || !value.includes(":")) return null;
  const [h, m] = value.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** The UTC calendar day of `d` as "YYYY-MM-DD". */
export function utcDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

/** Seconds elapsed since UTC midnight. */
function utcSecondsOfDay(d: Date): number {
  return d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
}

/**
 * The appointment's scheduled start as a UTC Date. `date` is the booking's
 * UTC-midnight day; `slotStart` ("HH:MM") overrides the time-of-day when
 * present, otherwise the day starts at 00:00.
 */
export function bookingStartDate(
  date: Date | string,
  slotStart?: string | null
): Date {
  const d = new Date(date);
  const start = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  const minutes = parseHmToMinutes(slotStart);
  if (minutes !== null) {
    start.setUTCHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  }
  return start;
}

/**
 * May a slot on `dateKey` (YYYY-MM-DD) starting at `slotStart` (HH:MM) be
 * booked as things stand at `now`?
 *
 * Only the same-day notice rule is decided here — dates other than today are
 * always allowed (past-date and availability checks live elsewhere). An
 * unparseable start time on today's date is treated as NOT bookable.
 */
export function isBookableSameDay(
  dateKey: string,
  slotStart: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (dateKey !== utcDateKey(now)) return true;
  const minutes = parseHmToMinutes(slotStart);
  if (minutes === null) return false;
  return minutes * 60 >= utcSecondsOfDay(now) + SAME_DAY_LEAD_MINUTES * 60;
}

/**
 * Minutes-of-day at/after which a same-day slot may start (now + lead), or
 * null when `dateKey` is not today. Used by the calendar to decide whether
 * today still has any room at all.
 */
export function sameDayCutoffMinutes(
  dateKey: string,
  now: Date = new Date()
): number | null {
  if (dateKey !== utcDateKey(now)) return null;
  return utcSecondsOfDay(now) / 60 + SAME_DAY_LEAD_MINUTES;
}

/**
 * A booking may be completed only once its appointment has started. Completing
 * a future (or not-yet-begun) appointment would award loyalty points for a
 * service that has not happened.
 */
export function canCompleteBooking(
  date: Date | string,
  slotStart: string | null | undefined,
  now: Date = new Date()
): boolean {
  return now.getTime() >= bookingStartDate(date, slotStart).getTime();
}

/** Human-readable reason shown when a premature completion is rejected. */
export const PREMATURE_COMPLETION_MESSAGE =
  "This booking cannot be completed before its scheduled date and time.";
