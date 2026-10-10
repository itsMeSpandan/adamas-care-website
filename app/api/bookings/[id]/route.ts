import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";
import { awardPointsForBooking, clawbackPointsForBooking } from "@/lib/loyalty";
import { notifyBooking } from "@/lib/notify";
import { WAITLIST_CLAIM_EXPIRY_MINUTES } from "@/lib/waitlist";
import {
  bookingStartDate,
  canCompleteBooking,
  PREMATURE_COMPLETION_MESSAGE,
} from "@/lib/booking-time";

export const dynamic = "force-dynamic";

// Helper function for retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 500
): Promise<T> {
  let lastError: Error;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) break;
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError!;
}

/**
 * When a slot opens up (booking cancelled), find the top-ranked waitlisted user
 * and start their claim window.
 *
 * The window length comes from lib/waitlist.ts so this path and the expiry
 * sweep can never disagree about how long a user has to claim.
 */
async function notifyWaitlistedUser(employeeId: string, slotStart: string) {
  const { rankWaitlist } = await import("@/lib/scoring-engine");
  const ranked = await rankWaitlist(employeeId, slotStart);

  if (ranked.length === 0) {
    console.log(`[Waitlist] No waitlisted users for employee ${employeeId} at ${slotStart}`);
    return;
  }

  // Notify the top-ranked user
  const topEntry = await db.waitlist.findUnique({
    where: { id: ranked[0].waitlistId },
    include: { user: true, employee: true },
  });

  if (!topEntry || topEntry.status !== "waiting") return;

  const claimExpiresAt = new Date(
    Date.now() + WAITLIST_CLAIM_EXPIRY_MINUTES * 60 * 1000
  );

  await db.waitlist.update({
    where: { id: topEntry.id },
    data: {
      status: "notified",
      notifiedAt: new Date(),
      claimExpiresAt,
    },
  });

  console.log(`[Waitlist] Notified user ${topEntry.userId} for slot ${slotStart}`);
}

export const PATCH = requireAuth(async (request: Request, context) => {
  const { id } = await context!.params!;
  try {
    const body = await request.json();
    const { status, rating, review } = body;

    // requireAuth only proves that *someone* is signed in — it says nothing
    // about whether that someone owns this booking. Without the checks below,
    // any authenticated account could cancel/confirm another customer's
    // appointment (firing real emails, loyalty clawbacks and reliability
    // penalties) or overwrite their rating and review.
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const existing = await db.booking.findUnique({
      where: { id },
      select: { id: true, userId: true, date: true, slotStart: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const isAdmin = session.role === "admin";
    // Staff-created walk-in bookings have no userId, so nobody "owns" them.
    const isOwner = !!existing.userId && existing.userId === session.userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "You can only change your own bookings" },
        { status: 403 }
      );
    }

    // Handle status updates
    if (status) {
      if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status. Must be one of: pending, confirmed, completed, cancelled" },
          { status: 400 }
        );
      }

      // Customers may only cancel their own booking. Moving a booking into
      // pending/confirmed/completed is a staff action.
      if (!isAdmin && status !== "cancelled") {
        return NextResponse.json(
          { error: "Only staff can set this status" },
          { status: 403 }
        );
      }

      // A booking may not be completed before its appointment has started —
      // doing so would award loyalty points for a service not yet delivered.
      // This applies to everyone, admins included: it is a business fact, not
      // a permission.
      if (status === "completed" && !canCompleteBooking(existing.date, existing.slotStart)) {
        return NextResponse.json(
          { error: PREMATURE_COMPLETION_MESSAGE },
          { status: 409 }
        );
      }
      // Atomic: status update + loyalty + reliability in a single transaction
      const booking = await db.$transaction(async (tx) => {
        const updated = await tx.booking.update({ where: { id }, data: { status } });

        if (status === "completed" && updated.userId) {
          await retryWithBackoff(() => awardPointsForBooking(id, tx));
        } else if (status === "cancelled") {
          await retryWithBackoff(() => clawbackPointsForBooking(id, tx));

          // ─── Cancellation policy enforcement ─────────────────────────
          // If cancelled within 4 hours of slot start, count as late cancel.
          // Late cancels accumulate; after 3 in 30 days, restrict same-day booking.
          if (updated.userId && updated.slotStart && updated.date) {
            // slotStart is a salon-local (IST) wall-clock time — convert it to
            // a real instant before comparing with now, or the 4-hour window is
            // off by 5h30m and almost every cancel looks "late".
            const slotDateTime = bookingStartDate(updated.date, updated.slotStart);
            const hoursUntilSlot = (slotDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
            const isLateCancel = hoursUntilSlot >= 0 && hoursUntilSlot < 4;

            // Upsert reliability record
            const reliability = await tx.userReliability.upsert({
              where: { userId: updated.userId },
              create: {
                userId: updated.userId,
                cancelCount: 1,
                lateCancelCount: isLateCancel ? 1 : 0,
              },
              update: {
                cancelCount: { increment: 1 },
                ...(isLateCancel ? { lateCancelCount: { increment: 1 } } : {}),
              },
            });

            // Restrict if 3+ late cancels in recent window
            if (isLateCancel && reliability.lateCancelCount >= 3) {
              const restrictUntil = new Date();
              restrictUntil.setDate(restrictUntil.getDate() + 7);
              await tx.userReliability.update({
                where: { userId: updated.userId },
                data: { restrictedUntil: restrictUntil },
              });
            }
          }
        }

        return updated;
      });

      // ─── Notifications (AFTER the transaction commits) ───────────────
      // notifyBooking never throws and is idempotent per (booking, event,
      // channel), so a notification failure can never affect the booking.
      if (status === "confirmed") {
        await notifyBooking(id, "CONFIRMED");
      } else if (status === "cancelled") {
        await notifyBooking(id, "CANCELLED");

        // ─── Waitlist notification on cancellation ────────────────────────
        // Find waitlisted users for this employee+slot, flip the top-ranked
        // one to "notified" (starts their claim window), then notify them via
        // the WAITLIST_SLOT_OPEN event (email + push, idempotent).
        if (booking.employeeId && booking.slotStart) {
          try {
            await notifyWaitlistedUser(booking.employeeId, booking.slotStart);
            await notifyBooking(id, "WAITLIST_SLOT_OPEN");
          } catch (err) {
            console.error("[Waitlist] Notification failed:", err);
          }
        }
      }

      return NextResponse.json({ booking });
    }

    // Handle rating/review updates
    if (rating !== undefined) {
      // A review belongs to the customer who sat through the appointment —
      // even an admin has no business rewriting someone's words.
      if (!isOwner) {
        return NextResponse.json(
          { error: "You can only rate your own booking" },
          { status: 403 }
        );
      }

      const numRating = Number(rating);
      if (isNaN(numRating) || numRating < 0 || numRating > 5) {
        return NextResponse.json(
          { error: "Invalid rating. Must be between 0 and 5" },
          { status: 400 }
        );
      }

      const booking = await db.booking.update({
        where: { id },
        data: {
          rating: Math.round(numRating * 10) / 10,
          review: review ?? null,
        },
      });
      return NextResponse.json({ booking });
    }

    return NextResponse.json(
      { error: "Nothing to update. Provide status, rating, or review." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to update booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
});
