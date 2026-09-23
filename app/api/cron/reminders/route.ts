import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendReminder, isResendConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/reminders
 *
 * Triggered by Vercel Cron (or manually) to send reminder emails.
 * Finds confirmed bookings in the 24h and 2h windows and sends
 * reminders exactly once per window (tracked via reminder24hSentAt / reminder2hSentAt).
 *
 * Vercel Cron config (vercel.json):
 *   schedule: "every 15 minutes"
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isResendConfigured()) {
    return NextResponse.json({ message: "Email not configured — skipping" });
  }

  const now = new Date();
  let sent24h = 0;
  let sent2h = 0;

  // ─── 24-hour reminders ──────────────────────────────────────────────────
  const window24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000); // up to 25h ahead (buffer)
  const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // at least 23h ahead

  const bookings24h = await db.booking.findMany({
    where: {
      status: "confirmed",
      date: { gte: window24hStart, lte: window24hEnd },
      reminder24hSentAt: null,
      employeeId: { not: null },
    },
    include: {
      employee: true,
      bookingServices: { include: { service: true } },
      service: true,
    },
  });

  for (const booking of bookings24h) {
    const slotDateTime = new Date(booking.date);
    if (booking.slotStart) {
      const [h, m] = booking.slotStart.split(":").map(Number);
      slotDateTime.setUTCHours(h, m, 0, 0);
    }

    const hoursUntil = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntil < 23 || hoursUntil > 25) continue;

    const services = booking.bookingServices.length > 0
      ? booking.bookingServices.map((bs) => ({ name: bs.service.name }))
      : booking.service
        ? [{ name: booking.service.name }]
        : [];

    const ok = await sendReminder({
      customerName: booking.name,
      customerEmail: booking.email,
      services,
      employeeName: booking.employee?.name || "TBD",
      date: booking.date.toISOString().split("T")[0],
      slotStart: booking.slotStart || "",
      slotEnd: booking.slotEnd || "",
      hoursBefore: 24,
    });

    if (ok) {
      await db.booking.update({
        where: { id: booking.id },
        data: { reminder24hSentAt: now },
      });
      sent24h++;
    }
  }

  // ─── 2-hour reminders ───────────────────────────────────────────────────
  const window2hEnd = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);
  const window2hStart = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);

  const bookings2h = await db.booking.findMany({
    where: {
      status: "confirmed",
      date: { gte: window2hStart, lte: window2hEnd },
      reminder2hSentAt: null,
      employeeId: { not: null },
    },
    include: {
      employee: true,
      bookingServices: { include: { service: true } },
      service: true,
    },
  });

  for (const booking of bookings2h) {
    const slotDateTime = new Date(booking.date);
    if (booking.slotStart) {
      const [h, m] = booking.slotStart.split(":").map(Number);
      slotDateTime.setUTCHours(h, m, 0, 0);
    }

    const hoursUntil = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntil < 1.5 || hoursUntil > 2.5) continue;

    const services = booking.bookingServices.length > 0
      ? booking.bookingServices.map((bs) => ({ name: bs.service.name }))
      : booking.service
        ? [{ name: booking.service.name }]
        : [];

    const ok = await sendReminder({
      customerName: booking.name,
      customerEmail: booking.email,
      services,
      employeeName: booking.employee?.name || "TBD",
      date: booking.date.toISOString().split("T")[0],
      slotStart: booking.slotStart || "",
      slotEnd: booking.slotEnd || "",
      hoursBefore: 2,
    });

    if (ok) {
      await db.booking.update({
        where: { id: booking.id },
        data: { reminder2hSentAt: now },
      });
      sent2h++;
    }
  }

  return NextResponse.json({
    message: "Reminders processed",
    sent24h,
    sent2h,
    timestamp: now.toISOString(),
  });
}
