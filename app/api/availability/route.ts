import { NextRequest, NextResponse } from "next/server";
import {
  buildSlotGrid,
  computeTotalDuration,
  containsInterval,
  getFreeGaps,
  getWorkingWindows,
} from "@/lib/scoring-engine";
import { db } from "@/lib/db";
import { isBookableSameDay } from "@/lib/booking-time";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?employeeId=&date=YYYY-MM-DD
 *   &serviceDuration=60                  (legacy: single-service minutes)
 *   &serviceIds=s1,s2,s3                 (new: multi-service array)
 *
 * Returns every slot in the employee's shift for that date, each flagged with
 * `isBooked`:
 *   - `isBooked: false` → free, computed from EmployeeAvailability windows
 *     minus overrides and booked slots (with 10-min cleanup buffer)
 *   - `isBooked: true`  → taken by a booking (or its cleanup buffer), so the
 *     client can offer it as a waitlist option
 *
 * When `serviceIds` is provided, the server computes totalDurationMinutes
 * (sum of durations + transition buffers). Falls back to the legacy
 * `serviceDuration` parameter when `serviceIds` is not provided.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const dateStr = searchParams.get("date");
  const serviceIdsParam = searchParams.get("serviceIds");
  const serviceDuration = parseInt(searchParams.get("serviceDuration") || "60", 10);

  if (!employeeId || !dateStr) {
    return NextResponse.json(
      { error: "employeeId and date are required" },
      { status: 400 }
    );
  }

  try {
    let totalDurationMinutes: number;

    if (serviceIdsParam) {
      // Multi-service: compute total duration server-side from service IDs
      const serviceIds = serviceIdsParam.split(",").filter(Boolean);
      if (serviceIds.length === 0) {
        return NextResponse.json({ slots: [] });
      }
      totalDurationMinutes = await computeTotalDuration(serviceIds);
    } else {
      // Legacy: use the client-supplied duration
      totalDurationMinutes = serviceDuration;
    }

    // The employee's shift (still includes booked time) and the free gaps
    // within it. A candidate slot that is not fully inside a free gap is taken
    // by a booking or its cleanup buffer.
    const windows = await getWorkingWindows(employeeId, dateStr);
    const freeGaps = await getFreeGaps(employeeId, dateStr);

    // Same-day notice: drop slots on today's date that start less than 2 hours
    // from now — the specialist could not be ready in time.
    const slots = buildSlotGrid(windows, totalDurationMinutes)
      .filter((s) => isBookableSameDay(dateStr, s.start))
      .map((s) => ({
        ...s,
        employeeId,
        isBooked: !containsInterval(freeGaps, s.start, s.end),
      }));

    // Check waitlist counts for occupied slots
    const occupiedSlots = slots.filter((s) => s.isBooked);
    const waitlistCounts: Record<string, number> = {};

    if (occupiedSlots.length > 0) {
      for (const slot of occupiedSlots) {
        const count = await db.waitlist.count({
          where: {
            employeeId,
            slotStart: slot.start,
            status: { in: ["waiting", "notified"] },
          },
        });
        waitlistCounts[slot.start] = count;
      }
    }

    return NextResponse.json({
      slots,
      totalDurationMinutes,
      waitlistCounts,
    });
  } catch (error) {
    console.error("Failed to fetch available slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch available slots" },
      { status: 500 }
    );
  }
}
