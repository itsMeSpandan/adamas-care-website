/**
 * tests/availability-occupancy.test.ts — regression guard for waitlist
 * visibility during booking.
 *
 * The bug: occupancy was decided by comparing raw slot START strings against a
 * :00/:15 grid. The 10-minute cleanup buffer after a booking shifts the next
 * free gap to :10, so free slots stopped matching the grid and almost a whole
 * day was reported as "occupied" (offering the waitlist for times nobody had
 * booked), while the single-specialist path never flagged booked slots at all.
 *
 * Occupancy must be decided by interval containment instead.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    service: { findMany: vi.fn() },
    employeeAvailability: { findMany: vi.fn() },
    availabilityOverride: { findMany: vi.fn() },
    booking: { findMany: vi.fn() },
    waitlist: { count: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import {
  buildSlotGrid,
  containsInterval,
  getFreeGaps,
  getWorkingWindows,
} from "@/lib/scoring-engine";

const DATE = "2026-10-09"; // Friday → db day 4
const BOOKED_10_TO_11 = [{ slotStart: "10:00", slotEnd: "11:00" }];

function mockDay(bookings: Array<{ slotStart: string; slotEnd: string }>) {
  (db.employeeAvailability.findMany as any).mockResolvedValue([
    { startTime: "10:00", endTime: "19:00" },
  ]);
  (db.availabilityOverride.findMany as any).mockResolvedValue([]);
  (db.booking.findMany as any).mockResolvedValue(bookings);
}

describe("waitlist occupancy uses interval containment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the whole shift as one free gap when nothing is booked", async () => {
    mockDay([]);
    const gaps = await getFreeGaps("arjun-mehta", DATE);
    expect(gaps).toEqual([{ start: "10:00", end: "19:00" }]);
  });

  it("applies the 10-minute cleanup buffer after a booking", async () => {
    mockDay(BOOKED_10_TO_11);
    const gaps = await getFreeGaps("arjun-mehta", DATE);
    expect(gaps).toEqual([{ start: "11:10", end: "19:00" }]);
  });

  it("treats a grid-aligned free slot as free even though the grid shifted", async () => {
    mockDay(BOOKED_10_TO_11);
    const gaps = await getFreeGaps("arjun-mehta", DATE);

    // 11:15 is a legitimate bookable start...
    expect(containsInterval(gaps, "11:15", "12:15")).toBe(true);
    // ...but it is NOT the start the generator emits after a buffer shift, so
    // the old start-equality check could never match it (false "occupied").
    expect(buildSlotGrid(gaps, 60).some((s) => s.start === "11:15")).toBe(false);
  });

  it("reports only the booking and its buffer as occupied", async () => {
    mockDay(BOOKED_10_TO_11);
    const windows = await getWorkingWindows("arjun-mehta", DATE);
    const gaps = await getFreeGaps("arjun-mehta", DATE);

    const occupied = buildSlotGrid(windows, 60)
      .filter((s) => !containsInterval(gaps, s.start, s.end))
      .map((s) => s.start);

    expect(occupied).toEqual(["10:00", "10:15", "10:30", "10:45", "11:00"]);
    expect(occupied).not.toContain("11:15");
    expect(occupied).not.toContain("16:00");
  });

  it("reports no free gaps when the employee is booked all shift", async () => {
    mockDay([{ slotStart: "10:00", slotEnd: "19:00" }]);
    const gaps = await getFreeGaps("arjun-mehta", DATE);
    expect(gaps).toEqual([]);
  });

  it("ignores a full-day leave override", async () => {
    (db.employeeAvailability.findMany as any).mockResolvedValue([
      { startTime: "10:00", endTime: "19:00" },
    ]);
    (db.availabilityOverride.findMany as any).mockResolvedValue([
      { isBlocked: true, startTime: null, endTime: null },
    ]);
    (db.booking.findMany as any).mockResolvedValue([]);

    expect(await getWorkingWindows("arjun-mehta", DATE)).toEqual([]);
    expect(await getFreeGaps("arjun-mehta", DATE)).toEqual([]);
  });
});
