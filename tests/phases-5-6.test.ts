/**
 * tests/phases-5-6.test.ts — Tests for Phase 5 (multi-service duration)
 * and Phase 6 (dynamic day-adaptive slot generation).
 *
 * These test the DB-dependent functions with mocked Prisma.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  db: {
    service: { findMany: vi.fn() },
    employeeAvailability: { findMany: vi.fn() },
    availabilityOverride: { findMany: vi.fn() },
    booking: { findMany: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { computeTotalDuration, getDynamicAvailableSlots } from "@/lib/scoring-engine";

describe("Phase 5: computeTotalDuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0 for empty service list", async () => {
    const result = await computeTotalDuration([]);
    expect(result).toBe(0);
  });

  it("computes single service duration (no buffer)", async () => {
    (db.service.findMany as any).mockResolvedValue([
      { id: "s1", durationMinutes: 60 },
    ]);
    const result = await computeTotalDuration(["s1"]);
    expect(result).toBe(60);
  });

  it("sums durations and adds buffer for 2 services", async () => {
    (db.service.findMany as any).mockResolvedValue([
      { id: "s1", durationMinutes: 30 },
      { id: "s2", durationMinutes: 45 },
    ]);
    // 30 + 45 + 5 (1 buffer) = 80
    const result = await computeTotalDuration(["s1", "s2"]);
    expect(result).toBe(80);
  });

  it("sums durations and adds buffers for 3 services", async () => {
    (db.service.findMany as any).mockResolvedValue([
      { id: "s1", durationMinutes: 30 },
      { id: "s2", durationMinutes: 45 },
      { id: "s3", durationMinutes: 60 },
    ]);
    // 30 + 45 + 60 + 5*2 (2 buffers) = 145
    const result = await computeTotalDuration(["s1", "s2", "s3"]);
    expect(result).toBe(145);
  });

  it("handles missing services gracefully (duration = 0 for unknown)", async () => {
    (db.service.findMany as any).mockResolvedValue([
      { id: "s1", durationMinutes: 30 },
      // s2 not found in DB
    ]);
    // 30 + 0 + 5 (1 buffer) = 35
    const result = await computeTotalDuration(["s1", "s2"]);
    expect(result).toBe(35);
  });

  it("produces one contiguous total for 2-3 services", async () => {
    (db.service.findMany as any).mockResolvedValue([
      { id: "s1", durationMinutes: 20 },
      { id: "s2", durationMinutes: 30 },
      { id: "s3", durationMinutes: 40 },
    ]);
    // 20 + 30 + 40 + 5*2 = 100
    const total = await computeTotalDuration(["s1", "s2", "s3"]);
    expect(total).toBe(100);
  });
});

describe("Phase 6: getDynamicAvailableSlots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockAvailability(windows: { start: string; end: string }[]) {
    (db.employeeAvailability.findMany as any).mockResolvedValue(
      windows.map((w, i) => ({
        id: `ea${i}`,
        employeeId: "emp1",
        dayOfWeek: 1,
        startTime: w.start,
        endTime: w.end,
        isActive: true,
      }))
    );
  }

  function mockBookings(bookings: { slotStart: string; slotEnd: string }[]) {
    (db.booking.findMany as any).mockResolvedValue(bookings);
  }

  function mockOverrides(overrides: any[]) {
    (db.availabilityOverride.findMany as any).mockResolvedValue(overrides);
  }

  it("zero bookings → slots span the whole working day at 15-min intervals", async () => {
    mockAvailability([{ start: "09:00", end: "17:00" }]);
    mockBookings([]);
    mockOverrides([]);

    const slots = await getDynamicAvailableSlots("emp1", "2026-09-15", 60);

    // 09:00-17:00 = 480 min. First valid start = 09:00, last = 16:00.
    // Starts: 09:00, 09:15, ..., 16:00 → (420/15)+1 = 29 slots
    expect(slots.length).toBe(29);
    expect(slots[0].start).toBe("09:00");
    expect(slots[0].end).toBe("10:00");
    expect(slots[slots.length - 1].start).toBe("16:00");
    expect(slots[slots.length - 1].end).toBe("17:00");
  });

  it("back-to-back bookings with no gap → zero slots in that stretch", async () => {
    mockAvailability([{ start: "09:00", end: "17:00" }]);
    // 09:00-12:00 booked, 12:10-17:00 booked (10 min buffer)
    mockBookings([
      { slotStart: "09:00", slotEnd: "12:00" },
      { slotStart: "12:10", slotEnd: "17:00" },
    ]);
    mockOverrides([]);

    const slots = await getDynamicAvailableSlots("emp1", "2026-09-15", 30);

    // The 10-minute gap (12:00-12:10) is less than 30 min → no slots
    expect(slots.length).toBe(0);
  });

  it("multi-service duration longer than any single gap → only returns big enough gaps", async () => {
    mockAvailability([
      { start: "09:00", end: "12:00" }, // 180 min gap
      { start: "13:00", end: "17:00" }, // 240 min gap
    ]);
    mockBookings([{ slotStart: "12:00", slotEnd: "13:00" }]);
    mockOverrides([]);

    // Gap 1: 09:00-12:00 (180 min), request 120 → 5 slots
    // Gap 2: booking 12:00-13:00 + 10min buffer → free 13:10-17:00 (230 min)
    //         request 120 → (230-120)/15+1 = 8 slots
    // Total: 5 + 8 = 13
    const slots120 = await getDynamicAvailableSlots("emp1", "2026-09-15", 120);
    expect(slots120.length).toBe(13);

    // Request 200 min — gap 1 too small (180), gap 2 is 230
    // (230-200)/15+1 = 3 slots starting at 13:10, 13:25, 13:40
    const slots200 = await getDynamicAvailableSlots("emp1", "2026-09-15", 200);
    expect(slots200.length).toBe(3);
    expect(slots200[0].start).toBe("13:10");
    expect(slots200[2].end).toBe("17:00");
  });

  it("AvailabilityOverride full-day leave → returns empty array", async () => {
    mockAvailability([{ start: "09:00", end: "17:00" }]);
    mockBookings([]);
    // Full-day block (isBlocked=true, no startTime → entire day blocked)
    mockOverrides([{ isBlocked: true, startTime: null, endTime: null }]);

    const slots = await getDynamicAvailableSlots("emp1", "2026-09-15", 60);
    expect(slots).toEqual([]);
  });

  it("gap exactly equal to requested duration → returns exactly one slot", async () => {
    mockAvailability([{ start: "09:00", end: "17:00" }]);
    // Book 09:00-14:00 (300 min) + 10 buffer = blocked until 14:10
    // Book 15:10-17:00 (110 min) + 10 buffer → blocked 15:10-17:00
    // Free gap: 14:10-15:10 = exactly 60 minutes
    mockBookings([
      { slotStart: "09:00", slotEnd: "14:00" },
      { slotStart: "15:10", slotEnd: "17:00" },
    ]);
    mockOverrides([]);

    const slots = await getDynamicAvailableSlots("emp1", "2026-09-15", 60);
    expect(slots).toHaveLength(1);
    expect(slots[0].start).toBe("14:10");
    expect(slots[0].end).toBe("15:10");
  });

  it("duration longer than entire working day → returns empty array, no crash", async () => {
    mockAvailability([{ start: "09:00", end: "17:00" }]); // 480 min
    mockBookings([]);
    mockOverrides([]);

    const slots = await getDynamicAvailableSlots("emp1", "2026-09-15", 600);
    expect(slots).toEqual([]);
  });

  it("no availability windows → returns empty array", async () => {
    (db.employeeAvailability.findMany as any).mockResolvedValue([]);
    mockBookings([]);
    mockOverrides([]);

    const slots = await getDynamicAvailableSlots("emp1", "2026-09-15", 60);
    expect(slots).toEqual([]);
  });

  it("partial-day override reduces working hours", async () => {
    mockAvailability([{ start: "09:00", end: "17:00" }]);
    mockBookings([]);
    // Override: block 12:00-13:00 (lunch break)
    mockOverrides([
      { isBlocked: true, startTime: "12:00", endTime: "13:00" },
    ]);

    const slots = await getDynamicAvailableSlots("emp1", "2026-09-15", 60);

    // After blocking 12:00-13:00, free windows are:
    // 09:00-12:00 (180 min → (120/15)+1 = 9 slots) and 13:00-17:00 (240 min → (180/15)+1 = 13 slots)
    // Total: 22 slots
    expect(slots.length).toBe(22);
    // First slot at 09:00, last slot at 16:00
    expect(slots[0].start).toBe("09:00");
    expect(slots[slots.length - 1].start).toBe("16:00");
  });

  it("no generated slot overlaps an existing booking + buffer", async () => {
    mockAvailability([{ start: "09:00", end: "17:00" }]);
    mockBookings([
      { slotStart: "11:00", slotEnd: "12:00" }, // blocks 11:00-12:10 with buffer
    ]);
    mockOverrides([]);

    const slots = await getDynamicAvailableSlots("emp1", "2026-09-15", 60);

    // Verify no slot overlaps with 11:00-12:10
    for (const slot of slots) {
      const slotStart = parseInt(slot.start.split(":")[0]) * 60 + parseInt(slot.start.split(":")[1]);
      const slotEnd = parseInt(slot.end.split(":")[0]) * 60 + parseInt(slot.end.split(":")[1]);
      const blockStart = 11 * 60; // 11:00
      const blockEnd = 12 * 60 + 10; // 12:10 (with buffer)

      // No overlap: slotEnd <= blockStart OR slotStart >= blockEnd
      const noOverlap = slotEnd <= blockStart || slotStart >= blockEnd;
      expect(noOverlap).toBe(true);
    }
  });
});
