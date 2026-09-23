import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { awardPointsForBooking, clawbackPointsForBooking } from "@/lib/loyalty";
import { sendBookingConfirmation, isResendConfigured } from "@/lib/email";
import { sendWhatsAppBookingConfirmation, sendWhatsAppSlotAvailable, isWhatsAppConfigured } from "@/lib/whatsapp";

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

const CLAIM_EXPIRY_MINUTES = 30;

/**
 * When a slot opens up (booking cancelled), find the top-ranked waitlisted user
 * and notify them via WhatsApp that they have 30 minutes to claim the slot.
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

  const claimExpiresAt = new Date(Date.now() + CLAIM_EXPIRY_MINUTES * 60 * 1000);

  await db.waitlist.update({
    where: { id: topEntry.id },
    data: {
      status: "notified",
      notifiedAt: new Date(),
      claimExpiresAt,
    },
  });

  // Send WhatsApp notification (best-effort)
  if (isWhatsAppConfigured() && topEntry.user.whatsappNumber) {
    sendWhatsAppSlotAvailable(
      topEntry.user.whatsappNumber,
      topEntry.user.name,
      topEntry.employee?.name || "a specialist",
      slotStart,
      CLAIM_EXPIRY_MINUTES
    ).catch((err) => console.error("[WhatsApp] Waitlist notify failed:", err));
  }

  console.log(`[Waitlist] Notified user ${topEntry.userId} for slot ${slotStart}`);
}

export const PATCH = requireAuth(async (request: Request, context) => {
  const { id } = await context!.params!;
  try {
    const body = await request.json();
    const { status, rating, review } = body;

    // Handle status updates
    if (status) {
      if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status. Must be one of: pending, confirmed, completed, cancelled" },
          { status: 400 }
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
            const slotDateTime = new Date(updated.date);
            const [sh, sm] = updated.slotStart.split(":").map(Number);
            slotDateTime.setUTCHours(sh, sm, 0, 0);
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

      // Send confirmation email (best-effort, never blocks the response)
      if (status === "confirmed" && isResendConfigured()) {
        const fullBooking = await db.booking.findUnique({
          where: { id },
          include: { employee: true, service: true, bookingServices: { include: { service: true } } },
        });
        if (fullBooking) {
          const services = fullBooking.bookingServices.length > 0
            ? fullBooking.bookingServices.map((bs) => ({
                name: bs.service.name,
                duration: bs.service.durationMinutes,
                price: bs.service.price,
              }))
            : fullBooking.service
              ? [{ name: fullBooking.service.name, duration: fullBooking.service.durationMinutes, price: fullBooking.service.price }]
              : [];

          const dateStr = fullBooking.date.toISOString().split("T")[0];
          const timeStr = `${fullBooking.slotStart || ""} — ${fullBooking.slotEnd || ""}`;

          sendBookingConfirmation({
            customerName: fullBooking.name,
            customerEmail: fullBooking.email,
            services,
            employeeName: fullBooking.employee?.name || "TBD",
            date: dateStr,
            slotStart: fullBooking.slotStart || "",
            slotEnd: fullBooking.slotEnd || "",
            totalPrice: fullBooking.price,
            bookingId: fullBooking.id,
          }).catch((err) => console.error("[Email] Confirmation send failed:", err));

          // WhatsApp confirmation (best-effort)
          if (isWhatsAppConfigured() && fullBooking.phone) {
            sendWhatsAppBookingConfirmation({
              customerName: fullBooking.name,
              customerPhone: fullBooking.phone,
              services: services.map((s) => s.name).join(", "),
              employeeName: fullBooking.employee?.name || "TBD",
              date: dateStr,
              time: timeStr,
              totalPrice: `₹${fullBooking.price.toFixed(0)}`,
            }).catch((err) => console.error("[WhatsApp] Confirmation send failed:", err));
          }
        }
      }

      // ─── Waitlist notification on cancellation ────────────────────────
      // When a booking is cancelled, find waitlisted users for this employee+slot
      // and notify the highest-ranked one that a slot is available.
      if (status === "cancelled" && booking.employeeId && booking.slotStart) {
        notifyWaitlistedUser(booking.employeeId, booking.slotStart).catch((err) =>
          console.error("[Waitlist] Notification failed:", err)
        );
      }

      return NextResponse.json({ booking });
    }

    // Handle rating/review updates
    if (rating !== undefined) {
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
