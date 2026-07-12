import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/availability";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?employeeId=&date=YYYY-MM-DD&serviceDuration=60
 *
 * Returns available time slots for a given employee on a specific date,
 * computed from EmployeeAvailability windows minus overrides and booked slots.
 * Each slot includes an `employeeId` field so the client knows which employee owns it.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const dateStr = searchParams.get("date");
  const serviceDuration = parseInt(searchParams.get("serviceDuration") || "60", 10);

  if (!employeeId || !dateStr) {
    return NextResponse.json(
      { error: "employeeId and date are required" },
      { status: 400 }
    );
  }

  try {
    const slots = await getAvailableSlots(employeeId, dateStr, serviceDuration);
    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Failed to fetch available slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch available slots" },
      { status: 500 }
    );
  }
}
