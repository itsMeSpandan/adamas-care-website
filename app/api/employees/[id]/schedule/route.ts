import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const schedules = await db.weeklySchedule.findMany({
      where: { employeeId: id },
      include: { service: true, employee: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    const formatted = schedules.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      serviceName: s.service?.name || "General",
      employeeName: s.employee.name,
    }));

    return NextResponse.json({ schedules: formatted });
  } catch (error) {
    console.error("Failed to fetch schedule:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}
