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
 * ─── Timezone ───────────────────────────────────────────────────────────────
 * Grace Salon is in India, so its opening hours (and therefore every `slotStart`
 * the availability engine produces) are IST wall-clock times. The `date` column
 * is stored as UTC midnight of that calendar day — i.e. it carries a *date*,
 * not an instant.
 *
 * Earlier revisions nevertheless compared those wall-clock times against UTC
 * `new Date()` values. That silently shifted every rule by 5h30m: "now + 2h"
 * was really "now + 7h30m", which hid slots a customer could have booked and
 * let slots through that had already passed. The salon's calendar day and
 * wall-clock minutes are therefore derived here from a fixed +05:30 offset
 * (India observes no DST, so a fixed offset is exact — no timezone database
 * needed). Anything comparing a booking to "now" must go through these helpers.
 */

/** Minimum notice for a same-day booking, in minutes (2 hours). */
export const SAME_DAY_LEAD_MINUTES = 120;

/** Salon local time is IST: UTC +05:30, with no daylight saving. */
export const SALON_UTC_OFFSET_MINUTES = 330;

/** "14:30" → 870. Returns null when the string is missing or unparseable. */
export function parseHmToMinutes(value: string | null | undefined): number | null {
  if (typeof value !== "string" || !value.includes(":")) return null;
  const [h, m] = value.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** `now` shifted into salon-local time. */
function salonShifted(now: Date): Date {
  return new Date(now.getTime() + SALON_UTC_OFFSET_MINUTES * 60_000);
}

/** The salon's calendar day of `d` as "YYYY-MM-DD". */
export function salonDateKey(d: Date): string {
  const local = salonShifted(d);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(local.getUTCDate()).padStart(2, "0")}`;
}

/** Seconds elapsed since salon-local midnight. */
function salonSecondsOfDay(d: Date): number {
  const local = salonShifted(d);
  return local.getUTCHours() * 3600 + local.getUTCMinutes() * 60 + local.getUTCSeconds();
}

/** Minutes elapsed since salon-local midnight (fractional for the seconds). */
export function salonMinutesOfDay(d: Date): number {
  return salonSecondsOfDay(d) / 60;
}

/**
 * The appointment's scheduled start as an absolute UTC instant.
 *
 * `date` is the booking's UTC-midnight day and `slotStart` ("HH:MM") is a
 * salon-local wall-clock time, so the instant is that day at that local time
 * minus the +05:30 offset. When there is no slot time, the stored `date` is the
 * best available instant and is returned unchanged (it may already carry a
 * time-of-day for legacy rows).
 */
export function bookingStartDate(
  date: Date | string,
  slotStart?: string | null
): Date {
  const d = new Date(date);
  const minutes = parseHmToMinutes(slotStart);
  if (minutes === null) return d;

  const start = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  start.setUTCMinutes(start.getUTCMinutes() + minutes - SALON_UTC_OFFSET_MINUTES);
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
  if (dateKey !== salonDateKey(now)) return true;
  const minutes = parseHmToMinutes(slotStart);
  if (minutes === null) return false;
  return minutes * 60 >= salonSecondsOfDay(now) + SAME_DAY_LEAD_MINUTES * 60;
}

/**
 * Salon-local minutes-of-day at/after which a same-day slot may start (now +
 * lead), or null when `dateKey` is not today. Used by the calendar to decide
 * whether today still has any room at all.
 */
export function sameDayCutoffMinutes(
  dateKey: string,
  now: Date = new Date()
): number | null {
  if (dateKey !== salonDateKey(now)) return null;
  return salonSecondsOfDay(now) / 60 + SAME_DAY_LEAD_MINUTES;
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
