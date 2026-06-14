import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBookings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bookings = await getBookings();
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      serviceId,
      employeeId,
      userId,
      date,
      slotStart,
      slotEnd,
      name,
      email,
      phone,
      notes,
      price,
    } = body;

    if (
      !serviceId ||
      !employeeId ||
      !date ||
      !slotStart ||
      !name ||
      !email ||
      !phone ||
      price === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Conflict check: query for same employeeId + date + overlapping slot
    const bookingDate = new Date(date);
    const dayStart = new Date(bookingDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(bookingDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const existingBookings = await db.booking.findMany({
      where: {
        employeeId,
        date: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["cancelled"] },
        slotStart: { not: null },
        slotEnd: { not: null },
      },
      select: { slotStart: true, slotEnd: true },
    });

    const hasConflict = existingBookings.some((b) => {
      if (!b.slotStart || !b.slotEnd) return false;
      return timeToMinutes(slotStart) < timeToMinutes(b.slotEnd) && timeToMinutes(b.slotStart) < timeToMinutes(slotEnd);
    });

    if (hasConflict) {
      return NextResponse.json(
        { error: "This slot was just taken. Please pick another." },
        { status: 409 }
      );
    }

    // Use slotStart as timeSlot for backward compat, include slotStart/slotEnd in single create
    const booking = await db.booking.create({
      data: {
        serviceId,
        employeeId,
        userId: userId || null,
        date: bookingDate,
        timeSlot: slotStart,
        slotStart: slotStart || null,
        slotEnd: slotEnd || null,
        name,
        email,
        phone,
        notes: notes || null,
        price,
      },
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Failed to create booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
