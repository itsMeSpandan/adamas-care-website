import { NextResponse } from "next/server";
import { createBooking, getBookings } from "@/lib/queries";

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

    const { serviceId, employeeId, userId, date, timeSlot, name, email, phone, notes, price } = body;

    if (!serviceId || !employeeId || !date || !timeSlot || !name || !email || !phone || price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const booking = await createBooking({
      serviceId,
      employeeId,
      userId: userId || null,
      date: new Date(date),
      timeSlot,
      name,
      email,
      phone,
      notes: notes || null,
      price,
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
