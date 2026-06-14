import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/available-slots?employeeId=xxx&date=2024-06-15&serviceId=yyy
 *
 * Returns available 30-min time slots for an employee on a given date,
 * based on their Shifts (date-specific) and/or WeeklySchedule (recurring),
 * minus existing bookings.
 *
 * Both sources are combined: if a shift exists for a date it adds slots,
 * and the weekly schedule also contributes slots for that day-of-week.
 * Duplicate time slots are deduplicated.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const dateStr = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  if (!employeeId || !dateStr) {
    return NextResponse.json(
      { error: "employeeId and date are required" },
      { status: 400 }
    );
  }

  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    // Use UTC to avoid timezone drift
    const date = new Date(Date.UTC(year, month - 1, day));

    // Convert JS day (0=Sun) to DB day (0=Mon, 6=Sun)
    const jsDay = date.getUTCDay();
    const dbDay = jsDay === 0 ? 6 : jsDay - 1;

    const dayStart = new Date(Date.UTC(year, month - 1, day));
    const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    // Collect potential slots from both shifts and weekly schedules
    const potentialSlots: string[] = [];

    // 1) Date-specific shifts for this employee on this date
    const shiftWhere: Record<string, unknown> = {
      employeeId,
      date: { gte: dayStart, lte: dayEnd },
    };

    if (serviceId) {
      shiftWhere.OR = [
        { serviceId: null },
        { serviceId },
      ];
    }

    const shifts = await db.shift.findMany({
      where: shiftWhere,
      orderBy: { startTime: "asc" },
    });

    for (const shift of shifts) {
      potentialSlots.push(...generateSlots(shift.startTime, shift.endTime));
    }

    // 2) Weekly schedules (recurring) for this day-of-week
    const scheduleWhere: Record<string, unknown> = {
      employeeId,
      dayOfWeek: dbDay,
    };

    if (serviceId) {
      scheduleWhere.OR = [
        { serviceId: null },
        { serviceId },
      ];
    }

    const schedules = await db.weeklySchedule.findMany({
      where: scheduleWhere,
      orderBy: { startTime: "asc" },
    });

    for (const schedule of schedules) {
      potentialSlots.push(...generateSlots(schedule.startTime, schedule.endTime));
    }

    // If no availability from either source, return empty
    if (potentialSlots.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    // Deduplicate overlapping slots
    const uniqueSlots = Array.from(new Set(potentialSlots)).sort();

    // Find existing bookings for this employee on this date
    const existingBookings = await db.booking.findMany({
      where: {
        employeeId,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: { notIn: ["cancelled"] },
      },
      select: { timeSlot: true },
    });

    const bookedSlots = new Set(existingBookings.map((b) => b.timeSlot));

    // Filter out booked slots
    let availableSlots = uniqueSlots.filter((slot) => !bookedSlots.has(slot));

    // If the selected date is today, also filter out past time slots
    const now = new Date();
    const isToday =
      date.getUTCFullYear() === now.getFullYear() &&
      date.getUTCMonth() === now.getMonth() &&
      date.getUTCDate() === now.getDate();

    if (isToday) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      availableSlots = availableSlots.filter((slot) => {
        const slotMinutes = parseSlotToMinutes(slot);
        return slotMinutes > nowMinutes;
      });
    }

    return NextResponse.json({ slots: availableSlots });
  } catch (error) {
    console.error("Failed to fetch available slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch available slots" },
      { status: 500 }
    );
  }
}

/**
 * Generate 30-minute time slots between startTime and endTime.
 * Times are in "HH:MM" 24-hour format (e.g., "09:00", "17:00").
 * Returns slots in "h:mm AM/PM" format (e.g., "9:00 AM").
 */
function generateSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  let totalMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (totalMinutes + 30 <= endMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    slots.push(`${displayHour}:${minutes === 0 ? "00" : minutes} ${period}`);
    totalMinutes += 30;
  }

  return slots;
}

/**
 * Parse a time slot string (e.g., "9:00 AM", "12:30 PM") into total minutes since midnight.
 */
function parseSlotToMinutes(slot: string): number {
  const match = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}
