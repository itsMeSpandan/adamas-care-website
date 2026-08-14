import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-auth";
import { getHolidaysForYear } from "@/lib/holidays";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/holidays — List all holidays (admin)
 * POST /api/admin/holidays — Add a custom holiday (admin)
 * DELETE /api/admin/holidays?id= — Delete a custom holiday (admin)
 */

export const GET = requireRole("admin", async () => {
  try {
    const holidays = await db.holiday.findMany({
      orderBy: { date: "asc" },
      select: {
        id: true,
        name: true,
        date: true,
        type: true,
        isRecurring: true,
        createdBy: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ holidays });
  } catch (error) {
    console.error("Failed to fetch holidays:", error);
    return NextResponse.json({ error: "Failed to fetch holidays" }, { status: 500 });
  }
});

export const POST = requireRole("admin", async (request: Request) => {
  try {
    const body = await request.json();
    const { name, date, type, isRecurring } = body;

    if (!name || !date) {
      return NextResponse.json(
        { error: "Name and date are required" },
        { status: 400 }
      );
    }

    const holidayDate = new Date(date);

    // Check for duplicate
    const existing = await db.holiday.findFirst({
      where: { date: holidayDate, name },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A holiday with this name and date already exists" },
        { status: 409 }
      );
    }

    const holiday = await db.holiday.create({
      data: {
        name,
        date: holidayDate,
        type: type || "custom",
        isRecurring: isRecurring || false,
      },
    });

    return NextResponse.json({ holiday }, { status: 201 });
  } catch (error) {
    console.error("Failed to create holiday:", error);
    return NextResponse.json({ error: "Failed to create holiday" }, { status: 500 });
  }
});

export const DELETE = requireRole("admin", async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Holiday ID is required" }, { status: 400 });
  }

  try {
    await db.holiday.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete holiday:", error);
    return NextResponse.json({ error: "Failed to delete holiday" }, { status: 500 });
  }
});

/**
 * POST /api/admin/holidays?action=seed — Seed Indian holidays for a year
 */
export const PUT = requireRole("admin", async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "seed") {
    try {
      const yearParam = new URL(request.url).searchParams.get("year");
      const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

      // Get holidays for the requested year from date-holidays (India / West Bengal)
      const holidaysToSeed = getHolidaysForYear(year);

      let created = 0;
      let skipped = 0;

      for (const h of holidaysToSeed) {
        const holidayDate = new Date(h.date + "T00:00:00Z");
        const existing = await db.holiday.findFirst({
          where: { date: holidayDate, name: h.name },
        });
        if (existing) {
          skipped++;
          continue;
        }
        await db.holiday.create({
          data: {
            name: h.name,
            date: holidayDate,
            type: h.type,
            isRecurring: h.isRecurring,
          },
        });
        created++;
      }

      return NextResponse.json({
        message: `Seeded ${created} holidays for ${year} (${skipped} already existed)`,
        created,
        skipped,
      });
    } catch (error) {
      console.error("Failed to seed holidays:", error);
      return NextResponse.json({ error: "Failed to seed holidays" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
});
