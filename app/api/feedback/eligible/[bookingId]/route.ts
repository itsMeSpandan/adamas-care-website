import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isBookingEligibleForFeedback, FEEDBACK_SUBMISSION_WINDOW_DAYS } from "@/lib/feedback";
import { getBookingServices } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/feedback/eligible/[bookingId]
 *
 * Verifies if the booking is eligible for customer feedback.
 * Requirements:
 * - User must be authenticated and own the booking
 * - Booking must be completed
 * - Must be within the 14-day window
 * - Feedback must not have been submitted already
 */
export async function GET(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const booking = await db.booking.findUnique({
      where: { id: params.bookingId },
      include: {
        employee: {
          select: { id: true, name: true, role: true, imageUrl: true },
        },
        service: {
          select: { id: true, name: true, durationMinutes: true, price: true },
        },
        bookingServices: {
          include: {
            service: {
              select: { id: true, name: true, durationMinutes: true, price: true },
            },
          },
          orderBy: { position: "asc" },
        },
        feedback: {
          select: { id: true, createdAt: true, overallRating: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify ownership
    if (booking.userId !== session.userId && session.role !== "admin") {
      return NextResponse.json(
        { error: "You can only provide feedback for your own bookings" },
        { status: 403 }
      );
    }

    const { eligible, reason } = isBookingEligibleForFeedback({
      status: booking.status,
      userId: booking.userId,
      completedAt: booking.completedAt,
      date: booking.date,
      feedback: booking.feedback,
    });

    const services = getBookingServices(booking);

    return NextResponse.json({
      eligible,
      reason,
      windowDays: FEEDBACK_SUBMISSION_WINDOW_DAYS,
      alreadySubmitted: !!booking.feedback,
      booking: {
        id: booking.id,
        date: booking.date,
        timeSlot: booking.slotStart || booking.timeSlot,
        status: booking.status,
        completedAt: booking.completedAt,
        employee: booking.employee,
        services,
      },
    });
  } catch (error) {
    console.error("[Feedback Eligibility Error]:", error);
    return NextResponse.json({ error: "Failed to check feedback eligibility" }, { status: 500 });
  }
}
