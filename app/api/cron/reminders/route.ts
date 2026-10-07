import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { notifyBooking } from "@/lib/notify";

export const dynamic = "force-dynamic";

/**
 * Constant-time string comparison. A plain `!==` leaks how many leading
 * characters of the secret were guessed via response timing.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

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
  // Verify cron secret to prevent unauthorized access.
  //
  // This must fail CLOSED. The previous check interpolated the env var
  // directly, so an unset CRON_SECRET turned the expected value into the
  // literal string "Bearer undefined" — anyone who guessed it could fire the
  // whole reminder blast. Refuse to run at all when it is missing.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error(
      "[cron/reminders] CRON_SECRET is not configured — refusing to run."
    );
    return NextResponse.json(
      { error: "Server is not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!safeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const hoursUntilSlot = (booking: { date: Date; slotStart: string | null }): number => {
    const slotDateTime = new Date(booking.date);
    if (booking.slotStart) {
      const [h, m] = booking.slotStart.split(":").map(Number);
      slotDateTime.setUTCHours(h, m, 0, 0);
    }
    return (slotDateTime.getTime() - now.getTime()) / HOUR;
  };

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
