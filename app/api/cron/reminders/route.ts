import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyBooking } from "@/lib/notify";
import { requireCronAuth } from "@/lib/cron-auth";
import { bookingStartDate } from "@/lib/booking-time";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/reminders
 *
 * Triggered by Vercel Cron (every 10 minutes) with `Authorization: Bearer CRON_SECRET`.
 *
 * Window-based lookup:
 *   - REMINDER_24H: slot starts between now+23h and now+25h (next day)
 *   - REMINDER_6H:  slot starts between now+5.5h and now+6.5h
 *
 * Idempotency comes from NotificationLog (checked inside notifyBooking), so
 * two cron runs inside the same window send each reminder exactly once.
 * A notification failure never affects the booking.
 */
export async function GET(request: Request) {
  // Verify the cron secret before doing any work. Fails CLOSED when
  // CRON_SECRET is unset (see lib/cron-auth.ts).
  const denied = requireCronAuth(request);
  if (denied) return denied;

  const now = new Date();
  const HOUR = 60 * 60 * 1000;

  let sent24h = 0;
  let sent6h = 0;

  // Candidate pre-filter. The date column is midnight of the booking day while
  // the slot time lives in slotStart, so a narrow future band would miss every
  // daytime slot (bug in the previous implementation). Scan ±26h and let the
  // exact hoursUntil check below decide.
  const candidates = await db.booking.findMany({
    where: {
      status: "confirmed",
      date: {
        gte: new Date(now.getTime() - 26 * HOUR),
        lte: new Date(now.getTime() + 26 * HOUR),
      },
      employeeId: { not: null },
    },
    select: { id: true, date: true, slotStart: true },
  });

  // slotStart is a salon-local (IST) wall-clock time; bookingStartDate turns
  // it into the real instant. Reading it as UTC shifted every reminder window
  // by 5h30m.
  const hoursUntilSlot = (booking: { date: Date; slotStart: string | null }): number =>
    (bookingStartDate(booking.date, booking.slotStart).getTime() - now.getTime()) / HOUR;

  // ─── 24-hour reminders ──────────────────────────────────────────────────
  for (const booking of candidates) {
    const hoursUntil = hoursUntilSlot(booking);
    if (hoursUntil < 23 || hoursUntil > 25) continue;
    await notifyBooking(booking.id, "REMINDER_24H");
    sent24h++;
  }

  // ─── ~6-hour reminders ──────────────────────────────────────────────────
  for (const booking of candidates) {
    const hoursUntil = hoursUntilSlot(booking);
    if (hoursUntil < 5.5 || hoursUntil > 6.5) continue;
    await notifyBooking(booking.id, "REMINDER_6H");
    sent6h++;
  }

  return NextResponse.json({
    message: "Reminders processed",
    sent24h,
    sent6h,
    timestamp: now.toISOString(),
  });
}
