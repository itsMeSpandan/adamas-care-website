import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { displayTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

// PATCH update a shift
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { employeeId, date, startTime, endTime, serviceId } = await request.json();

    const shift = await db.shift.findUnique({ where: { id } });
    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    const checkEmployeeId = employeeId ?? shift.employeeId;
    const checkStartTime = startTime ?? shift.startTime;
    const checkEndTime = endTime ?? shift.endTime;

    // Parse date without timezone issues (YYYY-MM-DD should stay as-is)
    let checkDate: Date;
    let nextDay: Date;
    if (date) {
      const [year, month, day] = date.split("-").map(Number);
      checkDate = new Date(Date.UTC(year, month - 1, day));
      nextDay = new Date(Date.UTC(year, month - 1, day + 1));
    } else {
      checkDate = new Date(shift.date);
      nextDay = new Date(checkDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    }

    // Check for overlapping shifts (excluding this entry)
    const overlapping = await db.shift.findFirst({
      where: {
        id: { not: id },
        employeeId: checkEmployeeId,
        date: { gte: checkDate, lt: nextDay },
        startTime: { lt: checkEndTime },
        endTime: { gt: checkStartTime },
      },
      include: { service: true },
    });

    if (overlapping) {
      const conflictService = overlapping.service?.name || "General";
      return NextResponse.json(
        { error: `Conflict: overlaps with an existing shift (${displayTime(overlapping.startTime)} – ${displayTime(overlapping.endTime)}, ${conflictService})` },
        { status: 409 }
      );
    }

    const updated = await db.shift.update({
      where: { id },
      data: {
        ...(employeeId !== undefined && { employeeId }),
        ...(date !== undefined && { date: checkDate! }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(serviceId !== undefined && { serviceId: serviceId || null }),
      },
      include: { service: true, employee: true },
    });

    return NextResponse.json({ shift: updated });
  } catch (error) {
    console.error("Failed to update shift:", error);
    return NextResponse.json({ error: "Failed to update shift" }, { status: 500 });
  }
}

// DELETE a single shift
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const shift = await db.shift.findUnique({ where: { id } });
    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    await db.shift.delete({ where: { id } });

    return NextResponse.json({ message: "Shift deleted" });
  } catch (error) {
    console.error("Failed to delete shift:", error);
    return NextResponse.json({ error: "Failed to delete shift" }, { status: 500 });
  }
}
