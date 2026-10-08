import { NextRequest, NextResponse } from "next/server";
import {
  buildSlotGrid,
  computeTotalDuration,
  containsInterval,
  getFreeGaps,
  getWorkingWindows,
} from "@/lib/scoring-engine";
import { db } from "@/lib/db";
import { mergeWindows } from "@/lib/slots";
import { isBookableSameDay } from "@/lib/booking-time";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability/combined?employeeIds=emp1,emp2&date=YYYY-MM-DD
 *   &serviceDuration=60
 *   &serviceIds=s1,s2
 *
 * Returns combined available slots across all listed employees, plus the
 * "occupied" slots: times inside someone's shift where NO employee can take
 * the requested duration (everyone is booked, or the time falls inside a
 * booking's cleanup buffer). This enables the waitlist flow — the client shows
 * occupied slots as "Join waitlist" options.
 *
 * Occupied slots carry an `employeeId` (the first employee whose shift covers
 * the interval). The waitlist is keyed per employee, so the entry needs an
 * owner to be notified against when their slot frees up.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeIdsParam = searchParams.get("employeeIds");
  const dateStr = searchParams.get("date");
  const serviceIdsParam = searchParams.get("serviceIds");
  const serviceDuration = parseInt(
    searchParams.get("serviceDuration") || "60",
    10
  );

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

    // Per-employee shift windows (still include booked time) and free gaps.
    const perEmployee = await Promise.all(
      employeeIds.map(async (eid) => ({
        employeeId: eid,
        windows: await getWorkingWindows(eid, dateStr),
        gaps: await getFreeGaps(eid, dateStr),
      }))
    );

    // Available slots: every start at least one employee can serve, keeping the
    // first employee (in request order) who can take it.
    const availableMap = new Map<
      string,
      { start: string; end: string; employeeId: string }
    >();
    for (const emp of perEmployee) {
      for (const s of buildSlotGrid(emp.gaps, totalDurationMinutes)) {
        // Same-day notice: skip today's slots starting less than 2 hours out.
        if (!isBookableSameDay(dateStr, s.start)) continue;
        if (!availableMap.has(s.start)) {
          availableMap.set(s.start, {
            start: s.start,
            end: s.end,
            employeeId: emp.employeeId,
          });
        }
      }
    }

    const availableSlots = Array.from(availableMap.values()).sort((a, b) =>
      a.start.localeCompare(b.start)
    );

    // Universe of candidate slots: the union of everyone's shift windows.
    // Occupancy is decided by testing the whole interval against each
    // employee's free gaps — start-time grid comparisons break as soon as the
    // 10-minute cleanup buffer shifts a gap start off the :00/:15 grid.
    const mergedWindows = mergeWindows(perEmployee.flatMap((emp) => emp.windows));

    const occupiedSlots: Array<{
      start: string;
      end: string;
      employeeId: string;
    }> = [];

    for (const candidate of buildSlotGrid(mergedWindows, totalDurationMinutes)) {
      // Same-day notice applies to waitlist options too — a slot that is too
      // soon is not offered as bookable or waitlistable.
      if (!isBookableSameDay(dateStr, candidate.start)) continue;

      const canServe = perEmployee.some((emp) =>
        containsInterval(emp.gaps, candidate.start, candidate.end)
      );
      if (canServe) continue;

      const owner =
        perEmployee.find((emp) =>
          containsInterval(emp.windows, candidate.start, candidate.end)
        ) || perEmployee[0];

      occupiedSlots.push({ ...candidate, employeeId: owner.employeeId });
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
