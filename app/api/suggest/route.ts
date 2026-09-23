import { NextRequest, NextResponse } from "next/server";
import { suggestAlternatives } from "@/lib/scoring-engine";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/suggest?serviceIds=s1,s2&preferredTime=10:00&date=2026-09-15
 *
 * Returns top 3 alternative slot suggestions ranked by the unified
 * scoring engine (closeness to preferred time, employee reliability,
 * load penalty).
 *
 * When the user is authenticated, results are filtered by gender preference.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serviceIdsParam = searchParams.get("serviceIds");
  const preferredTime = searchParams.get("preferredTime");
  const date = searchParams.get("date");

  if (!serviceIdsParam || !preferredTime || !date) {
    return NextResponse.json(
      { error: "serviceIds, preferredTime, and date are required" },
      { status: 400 }
    );
  }

  const serviceIds = serviceIdsParam.split(",").filter(Boolean);
  if (serviceIds.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    let suggestions = await suggestAlternatives(serviceIds, preferredTime, date);

    // Apply gender filter for authenticated users
    const session = await getSessionFromRequest(request);
    if (session?.userId) {
      const { db } = await import("@/lib/db");
      const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { gender: true },
      });

      // Filter by gender — null/other means no filter
      if (user?.gender) {
        const eligibleEmployeeIds = new Set(
          (
            await db.employee.findMany({
              where: { gender: user.gender },
              select: { id: true },
            })
          ).map((e) => e.id)
        );
        suggestions = suggestions.filter((s) =>
          eligibleEmployeeIds.has(s.employeeId)
        );
      }
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Failed to generate suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
