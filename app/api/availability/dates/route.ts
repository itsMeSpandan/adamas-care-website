import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability/dates?employeeId=&month=YYYY-MM&serviceDuration=60
 *
 * Returns an array of date strings (YYYY-MM-DD) in the given month
 * that have at least one available slot for the specified employee.
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

    const daysInMonth = new Date(year, month, 0).getDate();
    const availableDates: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
      result.push(w);
    } else {
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
