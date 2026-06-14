import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/availability/overrides?employeeId=&month=YYYY-MM
 * POST /api/admin/availability/overrides
 * DELETE /api/admin/availability/overrides?id=
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month");

  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 }
    );
  }

  try {
    const where: Record<string, unknown> = { employeeId };

    if (month) {
      const [year, mon] = month.split("-").map(Number);
      const monthStart = new Date(Date.UTC(year, mon - 1, 1));
      const monthEnd = new Date(Date.UTC(year, mon, 0, 23, 59, 59, 999));
      where.overrideDate = { gte: monthStart, lte: monthEnd };
    }

    const overrides = await db.availabilityOverride.findMany({
      where,
      orderBy: { overrideDate: "asc" },
    });

    return NextResponse.json({ overrides });
  } catch (error) {
    console.error("Failed to fetch overrides:", error);
    return NextResponse.json(
      { error: "Failed to fetch overrides" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, overrideDate, startTime, endTime, isBlocked, note } = body;

    if (!employeeId || !overrideDate) {
      return NextResponse.json(
        { error: "employeeId and overrideDate are required" },
        { status: 400 }
      );
    }

    const override = await db.availabilityOverride.create({
      data: {
        employeeId,
        overrideDate: new Date(overrideDate),
        startTime: startTime || null,
        endTime: endTime || null,
        isBlocked: isBlocked ?? false,
        note: note || null,
      },
    });

    return NextResponse.json({ override }, { status: 201 });
  } catch (error) {
    console.error("Failed to create override:", error);
    return NextResponse.json(
      { error: "Failed to create override" },
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
    await db.availabilityOverride.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete override:", error);
    return NextResponse.json(
      { error: "Failed to delete override" },
      { status: 500 }
    );
  }
}
