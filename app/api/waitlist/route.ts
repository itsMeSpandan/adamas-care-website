import { NextResponse } from "next/server";
import { rankWaitlist } from "@/lib/scoring-engine";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/waitlist?employeeId=xxx&slotStart=10:00
 *
 * Returns waitlist entries ranked by the unified scoring engine.
 * Top entry gets notified first when a slot opens.
 */
export const GET = requireAuth(async (request: Request) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Only staff can view waitlist rankings
  if (session.role !== "admin" && session.role !== "employee") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const slotStart = searchParams.get("slotStart");

  if (!employeeId || !slotStart) {
    return NextResponse.json(
      { error: "employeeId and slotStart are required" },
      { status: 400 }
    );
  }

  try {
    const ranked = await rankWaitlist(employeeId, slotStart);
    return NextResponse.json({ entries: ranked });
  } catch (error) {
    console.error("Failed to rank waitlist:", error);
    return NextResponse.json(
      { error: "Failed to rank waitlist" },
      { status: 500 }
    );
  }
});

/**
 * POST /api/waitlist
 *
 * Add a user to the waitlist for a specific employee + time slot.
 */
export const POST = requireAuth(async (request: Request) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { employeeId, slotStart, slotEnd, slotDate, serviceId } = body;

    if (!employeeId || !slotStart || !slotEnd) {
      return NextResponse.json(
        { error: "employeeId, slotStart, and slotEnd are required" },
        { status: 400 }
      );
    }

    // Check for duplicate waitlist entry
    const existing = await db.waitlist.findFirst({
      where: {
        userId: session.userId,
        employeeId,
        slotStart,
        status: "waiting",
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You are already on the waitlist for this slot" },
        { status: 409 }
      );
    }

    // EDGE-03: Block joining waitlist for a slot the user already holds.
    // Only checks the exact employeeId + slotStart combination — doesn't
    // block waitlisting for other slots with the same employee.
    const existingConfirmedBooking = await db.booking.findFirst({
      where: {
        userId: session.userId,
        employeeId,
        slotStart,
        status: { in: ["confirmed", "pending"] },
      },
    });

    if (existingConfirmedBooking) {
      return NextResponse.json(
        { error: "You already have a booking for this slot." },
        { status: 400 }
      );
    }

    const entry = await db.waitlist.create({
      data: {
        userId: session.userId,
        employeeId,
        slotStart,
        slotEnd,
        slotDate: slotDate ? new Date(slotDate) : null,
        serviceId: serviceId || null,
        status: "waiting",
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Failed to join waitlist:", error);
    return NextResponse.json(
      { error: "Failed to join waitlist" },
      { status: 500 }
    );
  }
});
