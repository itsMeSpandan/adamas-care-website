/**
 * lib/availability.ts — Core availability computation logic.
 *
 * Extracted from /api/availability/route.ts to allow reuse by
 * /api/available-slots without HTTP self-fetch.
 */

import { db } from "@/lib/db";
import {
  subtractTimeRange,
  mergeWindows,
  generateSlots,
  slotsOverlap,
  generateSlotStrings,
  timeToMinutes,
  parseDisplayTime,
} from "@/lib/slots";

export interface AvailableSlot {
  start: string;
  end: string;
  employeeId: string;
  isBooked: boolean;
}

/** Resolve date string to UTC components and DB day-of-week. */
function resolveDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error("Invalid date");
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  const jsDay = date.getUTCDay();
  const dbDay = jsDay === 0 ? 6 : jsDay - 1;
  const dayStart = new Date(Date.UTC(year, month - 1, day));
  const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  return { year, month, day, date, dbDay, dayStart, dayEnd };
}

/** Fetch and merge availability windows + overrides for an employee on a date. */
async function getWorkingWindows(
  employeeId: string,
  dbDay: number,
  dayStart: Date
): Promise<{ start: string; end: string }[]> {
  const availability = await db.employeeAvailability.findMany({
    where: { employeeId, dayOfWeek: dbDay, isActive: true },
    orderBy: { startTime: "asc" },
  });

  if (availability.length === 0) return [];

  let windows: { start: string; end: string }[] = availability.map((a) => ({
    start: a.startTime,
    end: a.endTime,
  }));

  const overrides = await db.availabilityOverride.findMany({
    where: { employeeId, overrideDate: dayStart },
  });

  for (const override of overrides) {
    if (override.isBlocked) {
      if (!override.startTime) {
        windows = [];
        break;
      }
      windows = subtractTimeRange(windows, override.startTime, override.endTime || "23:59");
    } else if (override.startTime && override.endTime) {
      windows.push({ start: override.startTime, end: override.endTime });
    }
  }

  return windows.length === 0 ? [] : mergeWindows(windows);
}

/** Fetch active bookings for an employee on a date. */
async function getActiveBookings(employeeId: string, dayStart: Date, dayEnd: Date) {
  return db.booking.findMany({
    where: {
      employeeId,
      date: { gte: dayStart, lte: dayEnd },
      status: { notIn: ["cancelled"] },
    },
    select: { slotStart: true, slotEnd: true, timeSlot: true },
  });
}

/**
 * Compute available time slots for a given employee on a specific date,
 * from EmployeeAvailability windows minus overrides and booked slots.
 * Each slot includes an `employeeId` field so the client knows which employee owns it.
 */
export async function getAvailableSlots(
  employeeId: string,
  dateStr: string,
  serviceDuration: number
): Promise<AvailableSlot[]> {
  const { dbDay, dayStart, dayEnd } = resolveDate(dateStr);

  const workingWindows = await getWorkingWindows(employeeId, dbDay, dayStart);
  if (workingWindows.length === 0) return [];

  // Generate slots of serviceDuration minutes within each window
  const allSlots: { start: string; end: string; employeeId: string }[] = [];
  for (const window of workingWindows) {
    const slots = generateSlots(window.start, window.end, serviceDuration, employeeId);
    allSlots.push(...slots.map((s) => ({ ...s, employeeId })));
  }

  const bookings = await getActiveBookings(employeeId, dayStart, dayEnd);

  // Mark slots that overlap with existing bookings
  return allSlots.map((slot) => {
    const isBooked = bookings.some((b) => {
      if (!b.slotStart || !b.slotEnd) return false;
      return slotsOverlap(slot.start, slot.end, b.slotStart, b.slotEnd);
    });
    return { ...slot, isBooked };
  });
}

/**
 * Compute available 30-min slot strings (HH:MM) for a given employee on a date.
 * Used by the deprecated /api/available-slots endpoint for backward compatibility.
 */
export async function getAvailableSlotStrings(
  employeeId: string,
  dateStr: string
): Promise<string[]> {
  const { date, dbDay, dayStart, dayEnd } = resolveDate(dateStr);

  const workingWindows = await getWorkingWindows(employeeId, dbDay, dayStart);
  if (workingWindows.length === 0) return [];

  // Generate 30-minute slot strings
  const potentialSlots: string[] = [];
  for (const w of workingWindows) {
    potentialSlots.push(...generateSlotStrings(w.start, w.end));
  }
  const uniqueSlots = Array.from(new Set(potentialSlots)).sort();

  // Fetch bookings (includes legacy timeSlot field)
  const bookings = await getActiveBookings(employeeId, dayStart, dayEnd);

  const bookedMinutes = new Set<number>();
  for (const b of bookings) {
    if (b.slotStart && b.slotEnd) {
      let t = timeToMinutes(b.slotStart);
      const end = timeToMinutes(b.slotEnd);
      while (t < end) { bookedMinutes.add(t); t += 30; }
    } else if (b.timeSlot) {
      bookedMinutes.add(parseDisplayTime(b.timeSlot));
    }
  }

  let availableSlots = uniqueSlots.filter((slot) => !bookedMinutes.has(parseDisplayTime(slot)));

  // Filter past slots if today
  const now = new Date();
  const isToday =
    date.getUTCFullYear() === now.getFullYear() &&
    date.getUTCMonth() === now.getMonth() &&
    date.getUTCDate() === now.getDate();

  if (isToday) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    availableSlots = availableSlots.filter((slot) => parseDisplayTime(slot) > nowMinutes);
  }

  return availableSlots;
}
