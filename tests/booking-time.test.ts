/**
 * Tests for lib/booking-time.ts — the two time-based lifecycle rules:
 *   - same-day bookings need 2 hours' notice
 *   - a booking cannot be completed before its appointment has started
 *
 * Times follow the salon's convention: `date` is a UTC-midnight calendar day
 * and `slotStart` is an IST wall-clock time, so "now" is converted to IST
 * before any comparison (Adamas Care is in India, +05:30, no DST).
 */
import { describe, it, expect } from "vitest";
import {
  SALON_UTC_OFFSET_MINUTES,
  SAME_DAY_LEAD_MINUTES,
  parseHmToMinutes,
  salonDateKey,
  salonMinutesOfDay,
  bookingStartDate,
  isBookableSameDay,
  sameDayCutoffMinutes,
  canCompleteBooking,
} from "@/lib/booking-time";

// 2026-10-08 12:00:00 UTC → 17:30 IST on 2026-10-08, so the same-day cutoff is
// 19:30 IST.
const NOW = new Date("2026-10-08T12:00:00.000Z");
const TODAY = "2026-10-08";

describe("parseHmToMinutes", () => {
  it("parses HH:MM", () => {
    expect(parseHmToMinutes("00:00")).toBe(0);
    expect(parseHmToMinutes("14:30")).toBe(870);
    expect(parseHmToMinutes("23:59")).toBe(1439);
  });

  it("rejects missing or malformed values", () => {
    expect(parseHmToMinutes(null)).toBe(null);
    expect(parseHmToMinutes(undefined)).toBe(null);
    expect(parseHmToMinutes("")).toBe(null);
    expect(parseHmToMinutes("1430")).toBe(null);
    expect(parseHmToMinutes("24:00")).toBe(null);
    expect(parseHmToMinutes("12:60")).toBe(null);
    expect(parseHmToMinutes("aa:bb")).toBe(null);
  });
});

describe("salon clock helpers", () => {
  it("shifts UTC into IST (+05:30)", () => {
    expect(SALON_UTC_OFFSET_MINUTES).toBe(330);
    expect(salonDateKey(NOW)).toBe(TODAY);
    expect(salonMinutesOfDay(NOW)).toBe(17 * 60 + 30);
  });

  it("rolls to the next salon day after 18:30 UTC", () => {
    // 2026-10-08 19:00 UTC is 2026-10-09 00:30 IST.
    const lateUtc = new Date("2026-10-08T19:00:00.000Z");
    expect(lateUtc.toISOString().slice(0, 10)).toBe("2026-10-08");
    expect(salonDateKey(lateUtc)).toBe("2026-10-09");
    expect(salonMinutesOfDay(lateUtc)).toBe(30);
  });
});

describe("same-day lead time", () => {
  it("allows a slot exactly at now + 2 hours (salon local)", () => {
    expect(isBookableSameDay(TODAY, "19:30", NOW)).toBe(true);
  });

  it("blocks a slot one minute inside the lead time", () => {
    expect(isBookableSameDay(TODAY, "19:29", NOW)).toBe(false);
  });

  it("blocks a mid-afternoon slot that UTC maths used to allow", () => {
    // Regression: 14:00 IST is "14:00 >= 14:00" in UTC terms (allowed), but the
    // salon is already at 17:30 IST, so 14:00 has passed.
    expect(isBookableSameDay(TODAY, "14:00", NOW)).toBe(false);
    expect(isBookableSameDay(TODAY, "09:00", NOW)).toBe(false);
  });

  it("allows later slots on the same day", () => {
    expect(isBookableSameDay(TODAY, "20:00", NOW)).toBe(true);
  });

  it("never applies the lead on other dates", () => {
    expect(isBookableSameDay("2026-10-09", "09:00", NOW)).toBe(true);
    expect(isBookableSameDay("2026-12-24", "09:00", NOW)).toBe(true);
  });

  it("does not treat a date as today just because it is today in UTC", () => {
    // 19:00 UTC is 2026-10-09 00:30 IST, so the 9th is "today" and the 8th is not.
    const lateUtc = new Date("2026-10-08T19:00:00.000Z");
    expect(isBookableSameDay(TODAY, "09:00", lateUtc)).toBe(true);
    // 01:00 IST on the 9th is only 30 minutes away — inside the 2-hour lead.
    expect(isBookableSameDay("2026-10-09", "01:00", lateUtc)).toBe(false);
    expect(isBookableSameDay("2026-10-09", "09:00", lateUtc)).toBe(true);
  });

  it("treats an unparseable start on today as not bookable", () => {
    expect(isBookableSameDay(TODAY, null, NOW)).toBe(false);
    expect(isBookableSameDay(TODAY, "nope", NOW)).toBe(false);
  });

  it("uses second precision, not just whole minutes", () => {
    const now = new Date("2026-10-08T12:00:30.000Z"); // 17:30:30 IST
    expect(isBookableSameDay(TODAY, "19:30", now)).toBe(false);
    expect(isBookableSameDay(TODAY, "19:31", now)).toBe(true);
  });

  it("reports the cutoff minutes for today only", () => {
    expect(sameDayCutoffMinutes(TODAY, NOW)).toBe(17 * 60 + 30 + SAME_DAY_LEAD_MINUTES);
    expect(sameDayCutoffMinutes("2026-10-09", NOW)).toBe(null);
  });
});

describe("bookingStartDate", () => {
  it("reads the slot time as salon local (IST), not UTC", () => {
    // 14:30 IST == 09:00 UTC.
    expect(bookingStartDate(new Date("2026-10-08T00:00:00.000Z"), "14:30").toISOString())
      .toBe("2026-10-08T09:00:00.000Z");
  });

  it("handles a slot that crosses UTC midnight backwards", () => {
    // 02:00 IST == 20:30 UTC on the previous day.
    expect(bookingStartDate(new Date("2026-10-08T00:00:00.000Z"), "02:00").toISOString())
      .toBe("2026-10-07T20:30:00.000Z");
  });

  it("falls back to the stored instant when there is no slot time", () => {
    expect(bookingStartDate(new Date("2026-10-08T00:00:00.000Z"), null).toISOString())
      .toBe("2026-10-08T00:00:00.000Z");
  });
});

describe("canCompleteBooking", () => {
  it("refuses a future appointment", () => {
    expect(canCompleteBooking(new Date("2026-10-09T00:00:00.000Z"), "10:00", NOW)).toBe(false);
  });

  it("allows a past appointment", () => {
    expect(canCompleteBooking(new Date("2026-10-07T00:00:00.000Z"), "10:00", NOW)).toBe(true);
  });

  it("refuses today before the slot starts (IST)", () => {
    // 17:31 IST is one minute after "now" (17:30 IST).
    expect(canCompleteBooking(new Date("2026-10-08T00:00:00.000Z"), "17:31", NOW)).toBe(false);
  });

  it("allows today once the slot has started (IST)", () => {
    expect(canCompleteBooking(new Date("2026-10-08T00:00:00.000Z"), "17:29", NOW)).toBe(true);
    expect(canCompleteBooking(new Date("2026-10-08T00:00:00.000Z"), "17:30", NOW)).toBe(true);
  });

  it("allows any time today when there is no slot time", () => {
    expect(canCompleteBooking(new Date("2026-10-08T00:00:00.000Z"), null, NOW)).toBe(true);
  });
});
