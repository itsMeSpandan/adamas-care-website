import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/holidays
 * Public endpoint — returns all holidays (public + festive + custom) for a given year.
 * Query param: ?year=2025 (defaults to current year)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

  try {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const holidays = await db.holiday.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      orderBy: { date: "asc" },
      select: {
        id: true,
        name: true,
        date: true,
        type: true,
        isRecurring: true,
      },
    });

    return NextResponse.json({ holidays });
  } catch (error) {
    console.error("Failed to fetch holidays:", error);
    return NextResponse.json({ error: "Failed to fetch holidays" }, { status: 500 });
  }
}
