import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/availability?employeeId=
 * POST /api/admin/availability
 * PATCH /api/admin/availability?id=
 * DELETE /api/admin/availability?id=
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");

  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 }
    );
  }

  try {
    const availability = await db.employeeAvailability.findMany({
      where: { employeeId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({ availability });
  } catch (error) {
    console.error("Failed to fetch availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, dayOfWeek, startTime, endTime } = body;

    if (!employeeId || dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json(
        { error: "employeeId, dayOfWeek, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    // Overlap check: query for any existing row with same employeeId + dayOfWeek
    // whose time range overlaps the new one
    const existing = await db.employeeAvailability.findMany({
      where: {
        employeeId,
        dayOfWeek,
      },
    });

    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);

    const hasOverlap = existing.some((row) => {
      const rowStart = timeToMinutes(row.startTime);
      const rowEnd = timeToMinutes(row.endTime);
      return newStart < rowEnd && rowStart < newEnd;
    });

    if (hasOverlap) {
      return NextResponse.json(
        { error: "Time slot overlaps an existing window" },
        { status: 409 }
      );
    }

    const availability = await db.employeeAvailability.create({
      data: {
        employeeId,
        dayOfWeek,
        startTime,
        endTime,
      },
    });

    return NextResponse.json({ availability }, { status: 201 });
  } catch (error) {
    console.error("Failed to create availability:", error);
    return NextResponse.json(
      { error: "Failed to create availability" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.startTime !== undefined) data.startTime = body.startTime;
    if (body.endTime !== undefined) data.endTime = body.endTime;

    const availability = await db.employeeAvailability.update({
      where: { id },
      data,
    });

    return NextResponse.json({ availability });
  } catch (error) {
    console.error("Failed to update availability:", error);
    return NextResponse.json(
      { error: "Failed to update availability" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    await db.employeeAvailability.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete availability:", error);
    return NextResponse.json(
      { error: "Failed to delete availability" },
      { status: 500 }
    );
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
