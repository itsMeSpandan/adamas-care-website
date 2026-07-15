import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBookings } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ---------- Time helpers (local to this route) ----------

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function subtractTimeRange(
  windows: { start: number; end: number }[],
  blockStart: number,
  blockEnd: number
): { start: number; end: number }[] {
  const result: { start: number; end: number }[] = [];
  for (const w of windows) {
    const ws = w.start;
    const we = w.end;
    if (blockEnd <= ws || blockStart >= we) {
      result.push(w);
    } else {
      if (blockStart > ws) {
        result.push({ start: ws, end: Math.min(blockStart, we) });
      }
      if (blockEnd < we) {
        result.push({ start: Math.max(blockEnd, ws), end: we });
      }
    }
  }
  return result;
}

function mergeWindows(
  windows: { start: number; end: number }[]
): { start: number; end: number }[] {
  if (windows.length === 0) return [];
  const sorted = [...windows].sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = sorted[i].end > last.end ? sorted[i].end : last.end;
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

// Verify a requested [slotStart, slotEnd] fits within the employee's active
// availability windows for the given date (honoring overrides).
async function isSlotWithinAvailability(
  employeeId: string,
  dateStr: string,
  slotStart: string,
  slotEnd: string
): Promise<boolean> {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  const jsDay = date.getUTCDay();
  const dbDay = jsDay === 0 ? 6 : jsDay - 1;

  const availability = await db.employeeAvailability.findMany({
    where: { employeeId, dayOfWeek: dbDay, isActive: true },
    orderBy: { startTime: "asc" },
  });
  if (availability.length === 0) return false;

  let windows = availability.map((a: { startTime: string; endTime: string }) => ({
    start: timeToMinutes(a.startTime),
    end: timeToMinutes(a.endTime),
  }));

  const dayStart = new Date(Date.UTC(year, month - 1, day));
  const overrides = await db.availabilityOverride.findMany({
    where: { employeeId, overrideDate: dayStart },
  });

  for (const override of overrides) {
    if (override.isBlocked) {
      if (!override.startTime) {
        windows = [];
        break;
      }
      windows = subtractTimeRange(
        windows,
        timeToMinutes(override.startTime),
        timeToMinutes(override.endTime || "23:59")
      );
    } else if (override.startTime && override.endTime) {
      windows.push({
        start: timeToMinutes(override.startTime),
        end: timeToMinutes(override.endTime),
      });
    }
  }

  if (windows.length === 0) return false;
  windows = mergeWindows(windows);

  const s = timeToMinutes(slotStart);
  const e = timeToMinutes(slotEnd);
  return windows.some((w) => s >= w.start && e <= w.end);
}

// ------------------------- GET -------------------------

export const GET = requireAuth(async (request: Request) => {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Staff may view all bookings; a regular customer sees only their own.
    if (session.role === "admin" || session.role === "employee") {
      const bookings = await getBookings();
      return NextResponse.json({ bookings });
    }

    const bookings = await db.booking.findMany({
      where: {
        OR: [{ userId: session.userId }, { email: session.email }],
      },
      include: { service: true, user: true, employee: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
});

// ------------------------- POST ------------------------

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();

    const {
      serviceId,
      employeeId,
      userId,
      date,
      slotStart,
      slotEnd,
      name,
      email,
      phone,
      notes,
    } = body;

    if (
      !serviceId ||
      !employeeId ||
      !date ||
      !slotStart ||
      !slotEnd ||
      !name ||
      !email ||
      !phone
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Server-side price: never trust the client-supplied price.
    const service = await db.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return NextResponse.json({ error: "Invalid service" }, { status: 400 });
    }

    // The employee must actually offer this service.
    const assignment = await db.employeeService.findFirst({
      where: { serviceId, employeeId },
    });
    if (!assignment) {
      return NextResponse.json(
        { error: "Selected specialist does not offer this service" },
        { status: 400 }
      );
    }

    // Reject past dates (compare as YYYY-MM-DD strings).
    const today = new Date();
    const todayKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
    if (typeof date !== "string" || date < todayKey) {
      return NextResponse.json(
        { error: "Booking date cannot be in the past" },
        { status: 400 }
      );
    }

    // Reject slots outside the employee's availability windows.
    const within = await isSlotWithinAvailability(employeeId, date, slotStart, slotEnd);
    if (!within) {
      return NextResponse.json(
        { error: "Selected time is outside the specialist's availability" },
        { status: 400 }
      );
    }

    const bookingDate = new Date(date);

    // Conflict check: same employee + date + overlapping slot.
    const dayStart = new Date(bookingDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(bookingDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const existingBookings = await db.booking.findMany({
      where: {
        employeeId,
        date: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["cancelled"] },
        slotStart: { not: null },
        slotEnd: { not: null },
      },
      select: { slotStart: true, slotEnd: true },
    });

    const hasConflict = existingBookings.some((b) => {
      if (!b.slotStart || !b.slotEnd) return false;
      return (
        timeToMinutes(slotStart) < timeToMinutes(b.slotEnd) &&
        timeToMinutes(b.slotStart) < timeToMinutes(slotEnd)
      );
    });

    if (hasConflict) {
      return NextResponse.json(
        { error: "This slot was just taken. Please pick another." },
        { status: 409 }
      );
    }

    const booking = await db.booking.create({
      data: {
        serviceId,
        employeeId,
        userId: userId || null,
        date: bookingDate,
        timeSlot: slotStart,
        slotStart: slotStart || null,
        slotEnd: slotEnd || null,
        name,
        email,
        phone,
        notes: notes || null,
        price: service.price,
      },
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Failed to create booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
});
