import { describe, it, expect } from "vitest";
import {
  salonDateKey,
  addDaysToDateKey,
  getSalonBookingWindow,
} from "@/lib/booking-time";

describe("Booking Window & Date Calculation (lib/booking-window.test.ts)", () => {
  describe("1. addDaysToDateKey", () => {
    it("handles month rollover correctly (October 31 -> November 1..13)", () => {
      expect(addDaysToDateKey("2026-10-31", 1)).toBe("2026-11-01");
      expect(addDaysToDateKey("2026-10-31", 13)).toBe("2026-11-13");
    });

    it("handles non-leap February (2026-01-29..31 -> February)", () => {
      expect(addDaysToDateKey("2026-01-29", 1)).toBe("2026-01-30");
      expect(addDaysToDateKey("2026-01-29", 3)).toBe("2026-02-01");
      expect(addDaysToDateKey("2026-01-31", 1)).toBe("2026-02-01");
      expect(addDaysToDateKey("2026-01-31", 13)).toBe("2026-02-13");
    });

    it("handles leap year February (2024-02-28 -> 2024-02-29 -> 2024-03-01)", () => {
      expect(addDaysToDateKey("2024-02-28", 1)).toBe("2024-02-29");
      expect(addDaysToDateKey("2024-02-28", 2)).toBe("2024-03-01");
    });

    it("handles year rollover (December 31 -> January)", () => {
      expect(addDaysToDateKey("2026-12-31", 1)).toBe("2027-01-01");
      expect(addDaysToDateKey("2026-12-31", 13)).toBe("2027-01-13");
    });
  });

  describe("2. getSalonBookingWindow with injectable clock (`now`)", () => {
    it("Oct 31: Spans October and November without dropping November", () => {
      const mockNow = new Date("2026-10-31T10:00:00Z");
      const window = getSalonBookingWindow(mockNow);

      expect(window.startKey).toBe("2026-10-31");
      expect(window.endKey).toBe("2026-11-13");
      expect(window.dates).toHaveLength(14);
      expect(window.dates[0]).toBe("2026-10-31");
      expect(window.dates[13]).toBe("2026-11-13");
      expect(window.months).toEqual(["2026-10", "2026-11"]);
      expect(window.years).toEqual([2026]);
    });

    it("Oct 25-30: All span ['2026-10', '2026-11']", () => {
      for (let day = 25; day <= 30; day++) {
        const mockNow = new Date(Date.UTC(2026, 9, day, 12, 0, 0));
        const window = getSalonBookingWindow(mockNow);
        expect(window.months).toEqual(["2026-10", "2026-11"]);
        expect(window.dates).toHaveLength(14);
      }
    });

    it("Nov 28-30: Span ['2026-11', '2026-12']", () => {
      for (let day = 28; day <= 30; day++) {
        const mockNow = new Date(Date.UTC(2026, 10, day, 12, 0, 0));
        const window = getSalonBookingWindow(mockNow);
        expect(window.months).toEqual(["2026-11", "2026-12"]);
      }
    });

    it("Dec 25-31 (Year rollover): Spans ['2026-12', '2027-01'] and years [2026, 2027]", () => {
      for (let day = 25; day <= 31; day++) {
        const mockNow = new Date(Date.UTC(2026, 11, day, 12, 0, 0));
        const window = getSalonBookingWindow(mockNow);
        expect(window.months).toEqual(["2026-12", "2027-01"]);
        expect(window.years).toEqual([2026, 2027]);
      }
    });

    it("Jan 29-31 (Non-leap year 2026): Correctly span ['2026-01', '2026-02'] without dropping Feb", () => {
      for (let day = 29; day <= 31; day++) {
        const mockNow = new Date(Date.UTC(2026, 0, day, 12, 0, 0));
        const window = getSalonBookingWindow(mockNow);
        expect(window.months).toEqual(["2026-01", "2026-02"]);
        expect(window.dates).toHaveLength(14);
      }
    });

    it("Feb 28 (2026 non-leap) and Feb 28-29 (2024 leap year): Span into March", () => {
      // 2026 non-leap
      const w1 = getSalonBookingWindow(new Date(Date.UTC(2026, 1, 28, 12, 0, 0)));
      expect(w1.months).toEqual(["2026-02", "2026-03"]);
      expect(w1.endKey).toBe("2026-03-13");

      // 2024 leap year Feb 28
      const w2 = getSalonBookingWindow(new Date(Date.UTC(2024, 1, 28, 12, 0, 0)));
      expect(w2.months).toEqual(["2024-02", "2024-03"]);
      expect(w2.dates[1]).toBe("2024-02-29"); // leap day included
      expect(w2.endKey).toBe("2024-03-12");

      // 2024 leap year Feb 29
      const w3 = getSalonBookingWindow(new Date(Date.UTC(2024, 1, 29, 12, 0, 0)));
      expect(w3.months).toEqual(["2024-02", "2024-03"]);
      expect(w3.startKey).toBe("2024-02-29");
      expect(w3.endKey).toBe("2024-03-13");
    });

    it("31st days followed by 30-day months (March 31, May 31, August 31): Next month is preserved", () => {
      const cases = [
        { date: new Date(Date.UTC(2026, 2, 31, 12, 0, 0)), expected: ["2026-03", "2026-04"] },
        { date: new Date(Date.UTC(2026, 4, 31, 12, 0, 0)), expected: ["2026-05", "2026-06"] },
        { date: new Date(Date.UTC(2026, 7, 31, 12, 0, 0)), expected: ["2026-08", "2026-09"] },
      ];
      for (const { date, expected } of cases) {
        const window = getSalonBookingWindow(date);
        expect(window.months).toEqual(expected);
      }
    });

    it("IST Edge time: 23:30 UTC on Oct 30 is 05:00 IST on Oct 31 -> startKey is 2026-10-31", () => {
      const utcInstant = new Date("2026-10-30T23:30:00.000Z");
      const window = getSalonBookingWindow(utcInstant);
      expect(window.startKey).toBe("2026-10-31");
      expect(window.endKey).toBe("2026-11-13");
      expect(window.months).toEqual(["2026-10", "2026-11"]);
    });
  });

  describe("3. DayPicker disabled logic simulation", () => {
    it("disables dates outside [startKey, endKey] and enables available dates inside", () => {
      const mockNow = new Date("2026-10-31T10:00:00Z");
      const window = getSalonBookingWindow(mockNow);
      // available dates returned by API for 2026-10 and 2026-11
      const availableDates = ["2026-10-31", "2026-11-01", "2026-11-05", "2026-11-13"];

      const isDateDisabled = (dateStr: string) => {
        if (dateStr < window.startKey || dateStr > window.endKey) return true;
        return !availableDates.includes(dateStr);
      };

      // Past date (Oct 30) -> disabled
      expect(isDateDisabled("2026-10-30")).toBe(true);
      // Today (Oct 31) -> enabled
      expect(isDateDisabled("2026-10-31")).toBe(false);
      // Day 1 (Nov 1) -> enabled! (was previously broken)
      expect(isDateDisabled("2026-11-01")).toBe(false);
      // Inside window but not in availableDates (Nov 2) -> disabled
      expect(isDateDisabled("2026-11-02")).toBe(true);
      // Last day of window (Nov 13) -> enabled
      expect(isDateDisabled("2026-11-13")).toBe(false);
      // Day 15 (Nov 14) -> disabled (outside 14-day window)
      expect(isDateDisabled("2026-11-14")).toBe(true);
    });
  });

  describe("4. Upper bound enforcement logic for customer vs staff", () => {
    it("allows staff to book beyond 14 days, blocks customer beyond 14 days", () => {
      const mockNow = new Date("2026-10-31T10:00:00Z");
      const todayKey = salonDateKey(mockNow);
      const maxBookingKey = addDaysToDateKey(todayKey, 13); // 2026-11-13

      const validateBookingDate = (date: string, isStaff: boolean): { ok: boolean; error?: string } => {
        if (typeof date !== "string" || date < todayKey) {
          return { ok: false, error: "Booking date cannot be in the past" };
        }
        if (!isStaff && date > maxBookingKey) {
          return {
            ok: false,
            error: `Online bookings can only be made up to 14 days in advance (latest: ${maxBookingKey})`,
          };
        }
        return { ok: true };
      };

      // Customer within 14 days
      expect(validateBookingDate("2026-11-05", false).ok).toBe(true);
      // Customer at exact 14th day limit
      expect(validateBookingDate("2026-11-13", false).ok).toBe(true);
      // Customer beyond 14 days -> blocked!
      const customerBeyond = validateBookingDate("2026-11-14", false);
      expect(customerBeyond.ok).toBe(false);
      expect(customerBeyond.error).toContain("Online bookings can only be made up to 14 days in advance");

      // Staff beyond 14 days -> allowed!
      const staffBeyond = validateBookingDate("2026-11-14", true);
      expect(staffBeyond.ok).toBe(true);

      // Staff months in advance -> allowed!
      const staffMonthsAhead = validateBookingDate("2026-12-25", true);
      expect(staffMonthsAhead.ok).toBe(true);

      // Past date -> rejected for both
      expect(validateBookingDate("2026-10-30", false).ok).toBe(false);
      expect(validateBookingDate("2026-10-30", true).ok).toBe(false);
    });
  });
});
