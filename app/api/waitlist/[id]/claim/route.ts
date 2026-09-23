import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";
import { sendBookingConfirmation, isResendConfigured } from "@/lib/email";
import { sendWhatsAppBookingConfirmation, isWhatsAppConfigured } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const CLAIM_EXPIRY_MINUTES = 30;

/**
 * POST /api/waitlist/[id]/claim
 *
 * When a waitlisted user claims their notified slot:
 * 1. Verify the entry belongs to them and is in "notified" status
 * 2. Check the claim hasn't expired
 * 3. Create a booking for the slot
 * 4. Update waitlist entry status to "claimed"
 * 5. Send confirmation email + WhatsApp
 */
export const POST = requireAuth(async (request: Request, context) => {
  const { id } = await context!.params!;
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    // Find the waitlist entry
    const entry = await db.waitlist.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!entry) {
      return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
    }

    // Ownership check
    if (entry.userId !== session.userId) {
      return NextResponse.json({ error: "Not your waitlist entry" }, { status: 403 });
    }

    // Must be in "notified" status to claim
    if (entry.status !== "notified") {
      return NextResponse.json(
        { error: `Cannot claim — entry status is "${entry.status}"` },
        { status: 400 }
      );
    }

    // Check expiry
    if (entry.claimExpiresAt && new Date() > entry.claimExpiresAt) {
      // Mark as expired and cascade to next user
      await db.waitlist.update({
        where: { id },
        data: { status: "expired" },
      });

      // Notify next person in line
      await cascadeToNextWaitlisted(entry.employeeId, entry.slotStart);

      return NextResponse.json(
        { error: "Claim window expired. The slot has been offered to the next person." },
        { status: 410 }
      );
    }

    // Find the user's details for the booking
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true, whatsappNumber: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the service (from the original booking that was cancelled)
    // We need to figure out what service to book — use the employee's first assigned service
    // or check if the waitlist entry has a serviceId
    let serviceId = entry.serviceId;
    if (!serviceId) {
      // Fallback: use the first service the employee offers
      const firstAssignment = await db.employeeService.findFirst({
        where: { employeeId: entry.employeeId },
      });
      serviceId = firstAssignment?.serviceId || null;
    }

    const service = serviceId
      ? await db.service.findUnique({ where: { id: serviceId } })
      : null;

    // Determine the booking date: prefer the stored slotDate, fall back to recent cancelled booking
    let bookingDate = entry.slotDate || new Date();
    if (!entry.slotDate) {
      const recentBooking = await db.booking.findFirst({
        where: {
          employeeId: entry.employeeId,
          slotStart: entry.slotStart,
          status: "cancelled",
        },
        orderBy: { updatedAt: "desc" },
      });
      if (recentBooking) {
        bookingDate = recentBooking.date;
      }
    }

    // Create the booking
    const booking = await db.booking.create({
      data: {
        serviceId: serviceId || null,
        employeeId: entry.employeeId,
        userId: session.userId,
        date: bookingDate,
        timeSlot: entry.slotStart,
        slotStart: entry.slotStart,
        slotEnd: entry.slotEnd,
        name: user.name,
        email: user.email,
        phone: user.whatsappNumber || "",
        price: service?.price || 0,
        status: "confirmed",
      },
    });

    // Mark waitlist entry as claimed
    await db.waitlist.update({
      where: { id },
      data: { status: "claimed" },
    });

    // Send confirmation (best-effort)
    const dateStr = booking.date.toISOString().split("T")[0];
    const timeStr = `${entry.slotStart} — ${entry.slotEnd}`;

    if (isResendConfigured()) {
      sendBookingConfirmation({
        customerName: user.name,
        customerEmail: user.email,
        services: service ? [{ name: service.name, duration: service.durationMinutes, price: service.price }] : [],
        employeeName: entry.employee?.name || "TBD",
        date: dateStr,
        slotStart: entry.slotStart,
        slotEnd: entry.slotEnd || "",
        totalPrice: booking.price,
        bookingId: booking.id,
      }).catch((err) => console.error("[Email] Waitlist claim confirmation failed:", err));
    }

    if (isWhatsAppConfigured() && user.whatsappNumber) {
      sendWhatsAppBookingConfirmation({
        customerName: user.name,
        customerPhone: user.whatsappNumber,
        services: service ? service.name : "Service",
        employeeName: entry.employee?.name || "TBD",
        date: dateStr,
        time: timeStr,
        totalPrice: `₹${booking.price.toFixed(0)}`,
      }).catch((err) => console.error("[WhatsApp] Waitlist claim confirmation failed:", err));
    }

    return NextResponse.json({
      booking,
      message: "Slot claimed successfully! Your booking is confirmed.",
    });
  } catch (error) {
    console.error("Failed to claim waitlist slot:", error);
    return NextResponse.json({ error: "Failed to claim slot" }, { status: 500 });
  }
});

/**
 * After a waitlisted user's claim expires, notify the next person in line.
 */
async function cascadeToNextWaitlisted(employeeId: string, slotStart: string) {
  const { rankWaitlist } = await import("@/lib/scoring-engine");
  const ranked = await rankWaitlist(employeeId, slotStart);

  if (ranked.length === 0) return;

  // Notify the next person
  const nextEntry = await db.waitlist.findUnique({
    where: { id: ranked[0].waitlistId },
    include: { user: true, employee: true },
  });

  if (!nextEntry || nextEntry.status !== "waiting") return;

  const claimExpiresAt = new Date(Date.now() + CLAIM_EXPIRY_MINUTES * 60 * 1000);

  await db.waitlist.update({
    where: { id: nextEntry.id },
    data: {
      status: "notified",
      notifiedAt: new Date(),
      claimExpiresAt,
    },
  });

  // Send notification (best-effort)
  const { sendWhatsAppSlotAvailable } = await import("@/lib/whatsapp");
  if (isWhatsAppConfigured() && nextEntry.user.whatsappNumber) {
    sendWhatsAppSlotAvailable(
      nextEntry.user.whatsappNumber,
      nextEntry.user.name,
      nextEntry.employee?.name || "a specialist",
      slotStart,
      CLAIM_EXPIRY_MINUTES
    ).catch((err) => console.error("[WhatsApp] Cascade notification failed:", err));
  }

  console.log(`📱 Waitlist cascade: notified user ${nextEntry.userId} for slot ${slotStart}`);
}
