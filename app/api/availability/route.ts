import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?employeeId=&date=YYYY-MM-DD&serviceDuration=60
 *
 * Returns available time slots for a given employee on a specific date,
 * computed from EmployeeAvailability windows minus overrides and booked slots.
 * Each slot includes an `employeeId` field so the client knows which employee owns it.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const dateStr = searchParams.get("date");
  const serviceDuration = parseInt(searchParams.get("serviceDuration") || "60", 10);

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

    const date = new Date(Date.UTC(year, month - 1, day));

    // Convert JS day (0=Sun) to DB day (0=Mon, 6=Sun)
    const jsDay = date.getUTCDay();
    const dbDay = jsDay === 0 ? 6 : jsDay - 1;

    // 1. Fetch EmployeeAvailability rows for this employee and day
    const availability = await db.employeeAvailability.findMany({
      where: {
        employeeId,
        dayOfWeek: dbDay,
        isActive: true,
      },
      orderBy: { startTime: "asc" },
    });

    if (availability.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    // 2. Start with availability windows as working windows
    let workingWindows: { start: string; end: string }[] = availability.map((a) => ({
      start: a.startTime,
      end: a.endTime,
    }));

    // 3. Fetch overrides for this date
    const dayStart = new Date(Date.UTC(year, month - 1, day));
    const overrides = await db.availabilityOverride.findMany({
      where: {
        employeeId,
        overrideDate: dayStart,
      },
    });

    for (const override of overrides) {
      if (override.isBlocked) {
        if (!override.startTime) {
          // Full-day block
          workingWindows = [];
          break;
        }
        // Time-range block: subtract from working windows
        workingWindows = subtractTimeRange(
          workingWindows,
          override.startTime,
          override.endTime || "23:59"
        );
      } else {
        // Extra window: add to working windows
        if (override.startTime && override.endTime) {
          workingWindows.push({ start: override.startTime, end: override.endTime });
        }
      }
    }

    if (workingWindows.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    // 4. Merge overlapping windows
    workingWindows = mergeWindows(workingWindows);

    // 5. Generate slots of serviceDuration minutes within each window
    const allSlots: { start: string; end: string; employeeId: string }[] = [];
    for (const window of workingWindows) {
      const slots = generateSlots(window.start, window.end, serviceDuration, employeeId);
      allSlots.push(...slots);
    }

    // 6. Fetch existing bookings for this employee on this date
    const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    const existingBookings = await db.booking.findMany({
      where: {
        employeeId,
        date: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["cancelled"] },
      },
      select: { slotStart: true, slotEnd: true },
    });

    // 7. Remove slots that overlap with existing bookings
    const availableSlots = allSlots.filter((slot) => {
      return !existingBookings.some((booking) => {
        if (!booking.slotStart || !booking.slotEnd) return false;
        return slotsOverlap(slot.start, slot.end, booking.slotStart, booking.slotEnd);
      });
    });

    return NextResponse.json({ slots: availableSlots });
  } catch (error) {
    console.error("Failed to fetch available slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch available slots" },
      { status: 500 }
    );
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function generateSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  employeeId: string
): { start: string; end: string; employeeId: string }[] {
  const slots: { start: string; end: string; employeeId: string }[] = [];
  let current = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  while (current + durationMinutes <= end) {
    slots.push({
      start: minutesToTime(current),
      end: minutesToTime(current + durationMinutes),
      employeeId,
    });
    current += durationMinutes;
  }

  return slots;
}

function subtractTimeRange(
  windows: { start: string; end: string }[],
  blockStart: string,
  blockEnd: string
): { start: string; end: string }[] {
  const result: { start: string; end: string }[] = [];
  const bs = timeToMinutes(blockStart);
  const be = timeToMinutes(blockEnd);

  for (const w of windows) {
    const ws = timeToMinutes(w.start);
    const we = timeToMinutes(w.end);

    if (be <= ws || bs >= we) {
      // No overlap
      result.push(w);
    } else {
      // Partial overlap — keep the non-overlapping parts
      if (bs > ws) {
        result.push({ start: w.start, end: minutesToTime(Math.min(bs, we)) });
      }
      if (be < we) {
        result.push({ start: minutesToTime(Math.max(be, ws)), end: w.end });
      }
    }
  }

  return result;
}

function mergeWindows(
  windows: { start: string; end: string }[]
): { start: string; end: string }[] {
  if (windows.length === 0) return [];

  const sorted = [...windows].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
  );

  const merged: { start: string; end: string }[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (timeToMinutes(sorted[i].start) <= timeToMinutes(last.end)) {
      last.end =
        timeToMinutes(sorted[i].end) > timeToMinutes(last.end)
          ? sorted[i].end
          : last.end;
    } else {
      merged.push(sorted[i]);
    }
  }

  return merged;
}

function slotsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const aS = timeToMinutes(aStart);
  const aE = timeToMinutes(aEnd);
  const bS = timeToMinutes(bStart);
  const bE = timeToMinutes(bEnd);
  return aS < bE && bS < aE;
}
