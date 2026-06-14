import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { displayTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET all shifts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        const [sy, sm, sd] = startDate.split("-").map(Number);
        (where.date as Record<string, Date>).gte = new Date(Date.UTC(sy, sm - 1, sd));
      }
      if (endDate) {
        const [ey, em, ed] = endDate.split("-").map(Number);
        (where.date as Record<string, Date>).lte = new Date(Date.UTC(ey, em - 1, ed));
      }
    }

    const shifts = await db.shift.findMany({
      where,
      include: { service: true, employee: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({ shifts });
  } catch (error) {
    console.error("Failed to fetch shifts:", error);
    return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 });
  }
}

// POST create new shift
export async function POST(request: Request) {
  try {
    const { employeeId, date, startTime, endTime, serviceId } = await request.json();

    if (!employeeId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Employee, date, start time, and end time are required" },
        { status: 400 }
      );
    }

    if (startTime >= endTime) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    // Parse date without timezone issues (YYYY-MM-DD should stay as-is)
    const [year, month, day] = date.split("-").map(Number);
    const shiftDate = new Date(Date.UTC(year, month - 1, day));
    // Check for overlapping shifts for the same employee on the same date
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1));

    const existing = await db.shift.findFirst({
      where: {
        employeeId,
        date: { gte: shiftDate, lt: nextDay },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      include: { service: true },
    });

    if (existing) {
      const conflictService = existing.service?.name || "General";
      return NextResponse.json(
        { error: `Conflict: overlaps with an existing shift (${displayTime(existing.startTime)} – ${displayTime(existing.endTime)}, ${conflictService})` },
        { status: 409 }
      );
    }

    const shift = await db.shift.create({
      data: {
        employeeId,
        date: shiftDate,
        startTime,
        endTime,
        serviceId: serviceId || null,
      },
      include: { service: true, employee: true },
    });

    return NextResponse.json({ shift }, { status: 201 });
  } catch (error) {
    console.error("Failed to create shift:", error);
    return NextResponse.json({ error: "Failed to create shift" }, { status: 500 });
  }
}

// DELETE multiple shifts
export async function DELETE(request: Request) {
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No shift IDs provided" }, { status: 400 });
    }

    await db.shift.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ message: "Shifts deleted" });
  } catch (error) {
    console.error("Failed to delete shifts:", error);
    return NextResponse.json({ error: "Failed to delete shifts" }, { status: 500 });
  }
}
