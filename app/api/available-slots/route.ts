import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlotStrings } from "@/lib/availability";

export const dynamic = "force-dynamic";

/**
 * GET /api/available-slots?employeeId=xxx&date=2024-06-15
 *
 * DEPRECATED: Prefer /api/availability which returns richer data.
 * This endpoint is kept for backward compatibility with existing client code.
 * Returns 24h "HH:MM" slot strings.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const dateStr = searchParams.get("date");

  if (!employeeId || !dateStr) {
    return NextResponse.json(
      { error: "employeeId and date are required" },
      { status: 400 }
    );
  }

  try {
    const slots = await getAvailableSlotStrings(employeeId, dateStr);
    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Failed to fetch available slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch available slots" },
      { status: 500 }
    );
  }
}
