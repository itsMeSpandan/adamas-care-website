import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timeToMinutes, subtractTimeRange, mergeWindows } from "@/lib/slots";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability/dates?employeeId=&month=YYYY-MM&serviceDuration=60
 *
 * Returns an array of date strings (YYYY-MM-DD) in the given month
 * that have at least one available slot for the specified employee.
 * Excludes dates that fall on a holiday.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const monthStr = searchParams.get("month");
  const serviceDuration = parseInt(searchParams.get("serviceDuration") || "60", 10);

  if (!employeeId || !monthStr) {
    return NextResponse.json(
      { error: "employeeId and month are required" },
      { status: 400 }
    );
  }

  try {
    const [year, month] = monthStr.split("-").map(Number);
    if (isNaN(year) || isNaN(month)) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    // Fetch holidays for this month to exclude them
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month - 1, new Date(year, month, 0).getDate(), 23, 59, 59, 999));
    const holidays = await db.holiday.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      select: { date: true, name: true },
    });
    // Build a Set of holiday date strings for O(1) lookup
    const holidayDates = new Set(holidays.map((h) => h.date.toISOString().split("T")[0]));

    const daysInMonth = new Date(year, month, 0).getDate();
    const availableDates: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      // Skip holidays — no bookings on public/festive/custom holidays
      if (holidayDates.has(dateStr)) continue;

      const date = new Date(Date.UTC(year, month - 1, day));

      // Convert JS day (0=Sun) to DB day (0=Mon, 6=Sun)
      const jsDay = date.getUTCDay();
      const dbDay = jsDay === 0 ? 6 : jsDay - 1;

      // Check if employee has availability for this day of week
      const availability = await db.employeeAvailability.findMany({
        where: {
          employeeId,
          dayOfWeek: dbDay,
          isActive: true,
        },
      });

      if (availability.length === 0) continue;

      // Build working windows from availability
      let workingWindows: { start: string; end: string }[] = availability.map((a) => ({
        start: a.startTime,
        end: a.endTime,
      }));

      // Check overrides
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
            workingWindows = [];
            break;
          }
          workingWindows = subtractTimeRange(
            workingWindows,
            override.startTime,
            override.endTime || "23:59"
          );
        } else {
          if (override.startTime && override.endTime) {
            workingWindows.push({ start: override.startTime, end: override.endTime });
          }
        }
      }

      if (workingWindows.length === 0) continue;

      // Merge overlapping windows
      workingWindows = mergeWindows(workingWindows);

      // Check if at least one slot of serviceDuration fits
      const hasSlot = workingWindows.some((w) => {
        const ws = timeToMinutes(w.start);
        const we = timeToMinutes(w.end);
        return we - ws >= serviceDuration;
      });

      if (hasSlot) {
        availableDates.push(dateStr);
      }
    }

    return NextResponse.json({ dates: availableDates });
  } catch (error) {
    console.error("Failed to fetch available dates:", error);
    return NextResponse.json(
      { error: "Failed to fetch available dates" },
      { status: 500 }
    );
  }
}
