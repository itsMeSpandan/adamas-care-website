import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applyOverridesToWindows } from "@/lib/scoring-engine";
import { timeToMinutes } from "@/lib/slots";
import { sameDayCutoffMinutes } from "@/lib/booking-time";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability/dates?employeeId=ID&month=YYYY-MM&serviceDuration=60
 * GET /api/availability/dates?employeeIds=ID,ID&month=YYYY-MM&serviceDuration=60
 *
 * Returns an array of date strings (YYYY-MM-DD) in the given month that an
 * employee (or any one of the given employees) could serve the requested
 * duration on. Holidays are excluded.
 *
 * The whole month is computed from three batched queries (holidays,
 * weekly availability, overrides) and the rest is in-memory. The previous
 * implementation issued two queries per day — up to ~62 sequential
 * round-trips per request — which timed out the serverless function on
 * production and left the booking calendar with no available dates.
 */
const DATE_KEY_LENGTH = 10;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const employeeIdsParam = searchParams.get("employeeIds");
  const monthStr = searchParams.get("month");
  const serviceDuration = parseInt(searchParams.get("serviceDuration") || "60", 10);

  const employeeIds = Array.from(
    new Set(
      (employeeIdsParam ? employeeIdsParam.split(",") : employeeId ? [employeeId] : [])
        .map((id) => id.trim())
        .filter(Boolean)
    )
  );

  if (employeeIds.length === 0 || !monthStr) {
    return NextResponse.json(
      { error: "employeeId (or employeeIds) and month are required" },
      { status: 400 }
    );
  }

  try {
    const [year, month] = monthStr.split("-").map(Number);
    if (isNaN(year) || isNaN(month)) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(
      Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999)
    );

    // ── Batched fetch: 3 queries for the entire month, regardless of day count
    const [holidays, availability, overrides] = await Promise.all([
      db.holiday.findMany({
        where: { date: { gte: monthStart, lte: monthEnd } },
        select: { date: true },
      }),
      db.employeeAvailability.findMany({
        where: { employeeId: { in: employeeIds }, isActive: true },
        orderBy: { startTime: "asc" },
      }),
      db.availabilityOverride.findMany({
        where: {
          employeeId: { in: employeeIds },
          overrideDate: { gte: monthStart, lte: monthEnd },
        },
      }),
    ]);

    /** "2026-10-16" → no bookings on public/festive/custom holidays */
    const holidayDates = new Set(
      holidays.map((h) => h.date.toISOString().slice(0, DATE_KEY_LENGTH))
    );

    // employeeId → DB day-of-week (Mon = 0 … Sun = 6) → recurring windows
    const availabilityByEmployeeDay = new Map<
      string,
      Map<number, { start: string; end: string }[]>
    >();
    for (const a of availability) {
      let byDay = availabilityByEmployeeDay.get(a.employeeId);
      if (!byDay) {
        byDay = new Map();
        availabilityByEmployeeDay.set(a.employeeId, byDay);
      }
      const windows = byDay.get(a.dayOfWeek) ?? [];
      windows.push({ start: a.startTime, end: a.endTime });
      byDay.set(a.dayOfWeek, windows);
    }

    // "employeeId|2026-10-16" → overrides for that employee on that date
    const overridesByEmployeeDate = new Map<
      string,
      { isBlocked: boolean; startTime: string | null; endTime: string | null }[]
    >();
    for (const o of overrides) {
      const key = `${o.employeeId}|${o.overrideDate
        .toISOString()
        .slice(0, DATE_KEY_LENGTH)}`;
      const list = overridesByEmployeeDate.get(key) ?? [];
      list.push({
        isBlocked: o.isBlocked,
        startTime: o.startTime,
        endTime: o.endTime,
      });
      overridesByEmployeeDate.set(key, list);
    }

    const availableDates: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;

      if (holidayDates.has(dateStr)) continue;

      // Convert JS day (0 = Sun) to DB day (0 = Mon, 6 = Sun)
      const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      const dbDay = jsDay === 0 ? 6 : jsDay - 1;

      // Same-day notice: on today we only count remaining room at or after
      // "now + 2 hours". Null for every other date, so this is a no-op then.
      const cutoff = sameDayCutoffMinutes(dateStr);

      // A date counts as available when ANY requested employee can serve it.
      let hasSlot = false;

      for (const id of employeeIds) {
        const base = availabilityByEmployeeDay.get(id)?.get(dbDay);
        if (!base || base.length === 0) continue;

        const windows = applyOverridesToWindows(
          base,
          overridesByEmployeeDate.get(`${id}|${dateStr}`) ?? []
        );

        const canFit = windows.some((w) => {
          const start = timeToMinutes(w.start);
          const end = timeToMinutes(w.end);
          const effectiveStart = cutoff === null ? start : Math.max(start, cutoff);
          return end - effectiveStart >= serviceDuration;
        });

        if (canFit) {
          hasSlot = true;
          break;
        }
      }

      if (hasSlot) availableDates.push(dateStr);
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
