import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/availability/dates/route";
import { db } from "@/lib/db";
import { getWorkingWindows } from "@/lib/scoring-engine";
import { timeToMinutes } from "@/lib/slots";
import { sameDayCutoffMinutes } from "@/lib/booking-time";

/**
 * The batched month route must return exactly what the old per-day
 * implementation returned. The reference below is the original algorithm:
 * for each day, fetch that day's working windows (which re-queries
 * availability + overrides) and keep the day if a window fits the duration.
 */
async function referenceDates(
  employeeIds: string[],
  monthStr: string,
  serviceDuration: number
): Promise<string[]> {
  const [year, month] = monthStr.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(
    Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999)
  );

  const holidays = await db.holiday.findMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
    select: { date: true },
  });
  const holidayDates = new Set(
    holidays.map((h) => h.date.toISOString().slice(0, 10))
  );

  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    if (holidayDates.has(dateStr)) continue;

    for (const id of employeeIds) {
      const windows = await getWorkingWindows(id, dateStr);
      // Mirror the route's same-day notice rule: on today, only room AFTER
      // "now + 2 hours" counts toward the duration.
      const cutoff = sameDayCutoffMinutes(dateStr);
      const fits = windows.some((w) => {
        const start = timeToMinutes(w.start);
        const end = timeToMinutes(w.end);
        const effectiveStart = cutoff === null ? start : Math.max(start, cutoff);
        return end - effectiveStart >= serviceDuration;
      });
      if (fits) {
        dates.push(dateStr);
        break;
      }
    }
  }
  return dates;
}

async function callRoute(
  employeeIds: string[] | null,
  employeeId: string | null,
  monthStr: string,
  serviceDuration: number
) {
  const qs = new URLSearchParams();
  if (employeeIds) qs.set("employeeIds", employeeIds.join(","));
  if (employeeId) qs.set("employeeId", employeeId);
  qs.set("month", monthStr);
  qs.set("serviceDuration", String(serviceDuration));

  const res = await GET(
    new NextRequest(`http://localhost/api/availability/dates?${qs}`)
  );
  return { status: res.status, body: await res.json() };
}

describe("GET /api/availability/dates (batched)", () => {
  it("returns 400 without employee or month", async () => {
    const noEmp = await callRoute(null, null, "2026-10", 60);
    expect(noEmp.status).toBe(400);
    const noMonth = await callRoute(["arjun-mehta"], null, "", 60);
    expect(noMonth.status).toBe(400);
  });

  it("matches the per-day reference for a single employee", async () => {
    const employees = await db.employee.findMany({ select: { id: true } });
    const ids = employees.map((e) => e.id).slice(0, 4);
    expect(ids.length).toBeGreaterThan(0);

    for (const month of ["2026-10", "2026-12"]) {
      for (const id of ids.slice(0, 2)) {
        for (const duration of [30, 120]) {
          const res = await callRoute(null, id, month, duration);
          expect(res.status).toBe(200);
          expect(res.body.dates).toEqual(
            await referenceDates([id], month, duration)
          );
        }
      }
    }
  }, 120000);

  it("employeeIds is the union of the single-employee results", async () => {
    const employees = await db.employee.findMany({ select: { id: true } });
    const ids = employees.map((e) => e.id).slice(0, 4);

    for (const month of ["2026-10", "2026-11"]) {
      const combined = await callRoute(ids, null, month, 60);
      expect(combined.status).toBe(200);

      const union = new Set<string>();
      for (const id of ids) {
        const single = await callRoute(null, id, month, 60);
        for (const d of single.body.dates) union.add(d);
      }

      expect(combined.body.dates).toEqual(Array.from(union).sort());
    }
  });

  it("deduplicates repeated employeeIds and ignores blank entries", async () => {
    const duped = await callRoute(
      ["arjun-mehta", "arjun-mehta", " ", ""],
      null,
      "2026-10",
      60
    );
    expect(duped.status).toBe(200);
    const single = await callRoute(null, "arjun-mehta", "2026-10", 60);
    expect(duped.body.dates).toEqual(single.body.dates);
  });

  it("excludes holidays from the returned dates", async () => {
    const res = await callRoute(["arjun-mehta"], null, "2026-10", 60);
    const holidays = await db.holiday.findMany({
      where: {
        date: {
          gte: new Date(Date.UTC(2026, 9, 1)),
          lte: new Date(Date.UTC(2026, 9, 31, 23, 59, 59, 999)),
        },
      },
      select: { date: true },
    });
    expect(holidays.length).toBeGreaterThan(0);
    for (const h of holidays) {
      expect(res.body.dates).not.toContain(h.date.toISOString().slice(0, 10));
    }
  });
});
