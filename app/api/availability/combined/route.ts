import { NextRequest, NextResponse } from "next/server";
import { getDynamicAvailableSlots, computeTotalDuration } from "@/lib/scoring-engine";
import { db } from "@/lib/db";
import { timeToMinutes, minutesToTime } from "@/lib/slots";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability/combined?employeeIds=emp1,emp2&date=YYYY-MM-DD
 *   &serviceDuration=60
 *   &serviceIds=s1,s2
 *
 * Returns combined available slots across all listed employees.
 * Also returns "occupied" slots — time slots where ALL employees are booked.
 * This enables the waitlist flow: when all same-gender specialists are booked,
 * the client sees the occupied slots with a "Join waitlist" option.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeIdsParam = searchParams.get("employeeIds");
  const dateStr = searchParams.get("date");
  const serviceIdsParam = searchParams.get("serviceIds");
  const serviceDuration = parseInt(searchParams.get("serviceDuration") || "60", 10);

  if (!employeeIdsParam || !dateStr) {
    return NextResponse.json(
      { error: "employeeIds and date are required" },
      { status: 400 }
    );
  }

  const employeeIds = employeeIdsParam.split(",").filter(Boolean);
  if (employeeIds.length === 0) {
    return NextResponse.json({ slots: [], occupiedSlots: [], waitlistCounts: {} });
  }

  try {
    let totalDurationMinutes: number;

    if (serviceIdsParam) {
      const serviceIds = serviceIdsParam.split(",").filter(Boolean);
      if (serviceIds.length === 0) {
        return NextResponse.json({ slots: [], occupiedSlots: [], waitlistCounts: {} });
      }
      totalDurationMinutes = await computeTotalDuration(serviceIds);
    } else {
      totalDurationMinutes = serviceDuration;
    }

    // Fetch available slots for each employee in parallel
    const perEmployeeResults = await Promise.all(
      employeeIds.map(async (eid) => {
        const dynamicSlots = await getDynamicAvailableSlots(eid, dateStr, totalDurationMinutes);
        return { employeeId: eid, slots: dynamicSlots };
      })
    );

    // Merge available slots: union by start time
    const availableMap = new Map<string, { start: string; end: string; employeeId: string }>();
    for (const emp of perEmployeeResults) {
      for (const s of emp.slots) {
        if (!availableMap.has(s.start)) {
          availableMap.set(s.start, { start: s.start, end: s.end, employeeId: emp.employeeId });
        }
      }
    }

    const availableSlots = Array.from(availableMap.values()).sort((a, b) =>
      a.start.localeCompare(b.start)
    );

    // To find "occupied" slots (all employees booked), we need to know the
    // working hours union. We generate all possible 15-min slots from working hours
    // and subtract the available ones.
    const occupiedSlots: Array<{ start: string; end: string }> = [];

    if (availableSlots.length > 0 || perEmployeeResults.some(e => e.slots.length === 0)) {
      // Generate the "universe" of possible slots from working hours
      // Use the first employee's working hours as the baseline
      const [year, month, day] = dateStr.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      const jsDay = date.getUTCDay();
      const dbDay = jsDay === 0 ? 6 : jsDay - 1;
      const dayStart = new Date(Date.UTC(year, month - 1, day));

      // Fetch working hours for all employees
      const allAvailability = await db.employeeAvailability.findMany({
        where: {
          employeeId: { in: employeeIds },
          dayOfWeek: dbDay,
          isActive: true,
        },
        orderBy: { startTime: "asc" },
      });

      // Fetch overrides
      const allOverrides = await db.availabilityOverride.findMany({
        where: {
          employeeId: { in: employeeIds },
          overrideDate: dayStart,
        },
      });

      // Fetch ALL bookings for these employees on this date
      const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      const allBookings = await db.booking.findMany({
        where: {
          employeeId: { in: employeeIds },
          date: { gte: dayStart, lte: dayEnd },
          status: { in: ["confirmed", "pending"] },
          slotStart: { not: null },
          slotEnd: { not: null },
        },
        select: {
          employeeId: true,
          slotStart: true,
          slotEnd: true,
        },
      });

      // Group by employee
      const availByEmp = new Map<string, Array<{ startTime: string; endTime: string }>>();
      for (const a of allAvailability) {
        if (!availByEmp.has(a.employeeId)) availByEmp.set(a.employeeId, []);
        availByEmp.get(a.employeeId)!.push({ startTime: a.startTime, endTime: a.endTime });
      }

      const overridesByEmp = new Map<string, typeof allOverrides>();
      for (const o of allOverrides) {
        if (!overridesByEmp.has(o.employeeId)) overridesByEmp.set(o.employeeId, []);
        overridesByEmp.get(o.employeeId)!.push(o);
      }

      const bookingsByEmp = new Map<string, typeof allBookings>();
      for (const b of allBookings) {
        if (!b.employeeId) continue;
        if (!bookingsByEmp.has(b.employeeId)) bookingsByEmp.set(b.employeeId, []);
        bookingsByEmp.get(b.employeeId)!.push(b);
      }

      // For each employee, compute their booked time ranges
      const employeeBookedRanges = new Map<string, Array<{ start: string; end: string }>>();
      for (const empId of employeeIds) {
        const empBookings = bookingsByEmp.get(empId) || [];
        const ranges: Array<{ start: string; end: string }> = [];
        for (const b of empBookings) {
          if (b.slotStart && b.slotEnd) {
            ranges.push({ start: b.slotStart, end: b.slotEnd });
          }
        }
        employeeBookedRanges.set(empId, ranges);
      }

      // Generate all possible 15-min slots from the union of working hours
      // Collect all working windows across all employees
      const allWindows: Array<{ start: string; end: string }> = [];
      for (const empId of employeeIds) {
        let windows = (availByEmp.get(empId) || []).map(a => ({
          start: a.startTime,
          end: a.endTime,
        }));

        const overrides = overridesByEmp.get(empId) || [];
        for (const override of overrides) {
          if (override.isBlocked) {
            if (!override.startTime) {
              windows = [];
              break;
            }
            windows = subtractTimeRangeSimple(windows, override.startTime, override.endTime || "23:59");
          } else if (override.startTime && override.endTime) {
            windows.push({ start: override.startTime, end: override.endTime });
          }
        }

        allWindows.push(...windows);
      }

      // Merge all windows
      const mergedWindows = mergeWindowsSimple(allWindows);

      // Generate all possible 15-min slots
      const STEP = 15;
      const allPossibleSlots: Array<{ start: string; end: string }> = [];
      for (const w of mergedWindows) {
        const wStart = timeToMinutes(w.start);
        const wEnd = timeToMinutes(w.end);
        for (let t = wStart; t + totalDurationMinutes <= wEnd; t += STEP) {
          allPossibleSlots.push({
            start: minutesToTime(t),
            end: minutesToTime(t + totalDurationMinutes),
          });
        }
      }

      // Find occupied slots: slots where NO employee has it available
      // A slot is "occupied" if it's in the universe but NOT in the available set
      const availableStarts = new Set(availableSlots.map(s => s.start));
      for (const possible of allPossibleSlots) {
        if (!availableStarts.has(possible.start)) {
          occupiedSlots.push(possible);
        }
      }
    }

    // Fetch waitlist counts for occupied slots
    const waitlistCounts: Record<string, number> = {};
    if (occupiedSlots.length > 0) {
      for (const slot of occupiedSlots) {
        const count = await db.waitlist.count({
          where: {
            employeeId: { in: employeeIds },
            slotStart: slot.start,
            status: { in: ["waiting", "notified"] },
          },
        });
        waitlistCounts[slot.start] = count;
      }
    }

    return NextResponse.json({
      slots: availableSlots,
      occupiedSlots,
      totalDurationMinutes,
      waitlistCounts,
    });
  } catch (error) {
    console.error("Failed to fetch combined availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch combined availability" },
      { status: 500 }
    );
  }
}

// Simple time range helpers (inline to avoid circular deps)
function subtractTimeRangeSimple(
  windows: Array<{ start: string; end: string }>,
  subStart: string,
  subEnd: string
): Array<{ start: string; end: string }> {
  const s = timeToMinutes(subStart);
  const e = timeToMinutes(subEnd);
  const result: Array<{ start: string; end: string }> = [];

  for (const w of windows) {
    const ws = timeToMinutes(w.start);
    const we = timeToMinutes(w.end);

    if (e <= ws || s >= we) {
      result.push(w);
    } else {
      if (s > ws) result.push({ start: w.start, end: minutesToTime(s) });
      if (e < we) result.push({ start: minutesToTime(e), end: w.end });
    }
  }

  return result;
}

function mergeWindowsSimple(windows: Array<{ start: string; end: string }>): Array<{ start: string; end: string }> {
  if (windows.length === 0) return [];

  const sorted = [...windows].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  const merged: Array<{ start: string; end: string }> = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (timeToMinutes(sorted[i].start) <= timeToMinutes(last.end)) {
      last.end = timeToMinutes(sorted[i].end) > timeToMinutes(last.end) ? sorted[i].end : last.end;
    } else {
      merged.push(sorted[i]);
    }
  }

  return merged;
}
