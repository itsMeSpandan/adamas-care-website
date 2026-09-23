import { NextRequest, NextResponse } from "next/server";
import { getDynamicAvailableSlots, computeTotalDuration } from "@/lib/scoring-engine";
import { getAvailableSlots } from "@/lib/availability";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?employeeId=&date=YYYY-MM-DD
 *   &serviceDuration=60                  (legacy: single-service minutes)
 *   &serviceIds=s1,s2,s3                 (new: multi-service array)
 *
 * Returns available time slots computed from EmployeeAvailability windows
 * minus overrides and booked slots (with 10-min cleanup buffer).
 *
 * When `serviceIds` is provided, the server computes totalDurationMinutes
 * (sum of durations + transition buffers) and uses the dynamic slot generator.
 * Falls back to the legacy `serviceDuration` parameter when `serviceIds` is
 * not provided.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const dateStr = searchParams.get("date");
  const serviceIdsParam = searchParams.get("serviceIds");
  const serviceDuration = parseInt(searchParams.get("serviceDuration") || "60", 10);

  if (!employeeId || !dateStr) {
    return NextResponse.json(
      { error: "employeeId and date are are required" },
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

    // Use the new dynamic slot generator for both paths
    const dynamicSlots = await getDynamicAvailableSlots(employeeId, dateStr, totalDurationMinutes);

    // Also run the legacy generator for backward compatibility —
    // the client currently uses the `isBooked` flag from the legacy format
    const legacySlots = await getAvailableSlots(employeeId, dateStr, totalDurationMinutes);

    // Merge: dynamic slots are the primary source; legacy provides isBooked metadata
    const bookedSet = new Set(
      legacySlots.filter((s) => s.isBooked).map((s) => s.start)
    );

    const slots = dynamicSlots.map((s) => ({
      ...s,
      employeeId,
      isBooked: bookedSet.has(s.start),
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
            status: "waiting",
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
