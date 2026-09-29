/**
 * lib/notify.ts — notifyBooking(): the single notification entry point.
 *
 * Contract:
 *   notifyBooking(bookingId, event):
 *     CONFIRMED | RESCHEDULED | CANCELLED | REMINDER_24H | REMINDER_1H | WAITLIST_SLOT_OPEN
 *
 *   - Email ALWAYS (guests without an account get email only).
 *   - Push to every non-revoked DeviceToken of the recipient account.
 *   - NotificationLog is checked before each send and written after a
 *     successful send: (bookingId, event, channel) is unique, so calling
 *     notifyBooking twice sends nothing twice.
 *   - The two channels run independently — one failing never blocks the other.
 *   - Never throws: failures are logged, bookings are never affected
 *     (call sites invoke this AFTER their transaction commits).
 *
 *   Push payload = data-only fields plus title/body:
 *     { type: event, bookingId, deepLink: "/bookings/<id>", title, body }
 */

import { db } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email";
import { getFirebaseMessaging } from "@/lib/firebase-admin";
import { buildIcsCalendar } from "@/lib/ics";
import { rankWaitlist } from "@/lib/scoring-engine";

export type BookingEvent =
  | "CONFIRMED"
  | "RESCHEDULED"
  | "CANCELLED"
  | "REMINDER_24H"
  | "REMINDER_1H"
  | "WAITLIST_SLOT_OPEN";

type BookingFull = NonNullable<
  Awaited<ReturnType<typeof loadBooking>>
>;

async function loadBooking(bookingId: string) {
  return db.booking.findUnique({
    where: { id: bookingId },
    include: {
      employee: true,
      service: true,
      bookingServices: { include: { service: true } },
    },
  });
}

interface Recipient {
  email: string;
  name: string;
  userId: string | null;
  /** For WAITLIST_SLOT_OPEN: how long the claim window is (minutes). */
  claimMinutes?: number;
}

// ─── NotificationLog idempotency ─────────────────────────────────────────────

async function alreadySent(
  bookingId: string,
  event: BookingEvent,
  channel: "email" | "push"
): Promise<boolean> {
  const row = await db.notificationLog.findUnique({
    where: { bookingId_event_channel: { bookingId, event, channel } },
    select: { id: true },
  });
  return !!row;
}

async function markSent(
  bookingId: string,
  event: BookingEvent,
  channel: "email" | "push"
): Promise<void> {
  try {
    await db.notificationLog.create({ data: { bookingId, event, channel } });
  } catch (err) {
    // P2002: a concurrent call already logged it — fine, still idempotent.
    const code = (err as { code?: string })?.code;
    if (code !== "P2002") {
      console.error(`[Notify] Failed to write NotificationLog (${event}/${channel}):`, err);
    }
  }
}

// ─── Recipient resolution ────────────────────────────────────────────────────

async function resolveRecipient(
  booking: BookingFull,
  event: BookingEvent
): Promise<Recipient | null> {
  if (event !== "WAITLIST_SLOT_OPEN") {
    if (!booking.email) return null;
    return { email: booking.email, name: booking.name, userId: booking.userId };
  }

  if (!booking.employeeId || !booking.slotStart) return null;

  // Prefer the entry currently inside its claim window (status "notified"),
  // so this resolves correctly whether called before or after the waitlist
  // status flip. Otherwise the top-ranked "waiting" entry.
  const notified = await db.waitlist.findFirst({
    where: { employeeId: booking.employeeId, slotStart: booking.slotStart, status: "notified" },
    orderBy: { notifiedAt: "desc" },
    include: { user: true },
  });

  const CLAIM_DEFAULT_MINUTES = 30;

  if (notified) {
    const minutes = notified.claimExpiresAt
      ? Math.max(1, Math.round((notified.claimExpiresAt.getTime() - Date.now()) / 60000))
      : CLAIM_DEFAULT_MINUTES;
    return {
      email: notified.user.email,
      name: notified.user.name,
      userId: notified.user.id,
      claimMinutes: minutes,
    };
  }

  const ranked = await rankWaitlist(booking.employeeId, booking.slotStart);
  if (ranked.length === 0) return null;
  const top = await db.waitlist.findUnique({
    where: { id: ranked[0].waitlistId },
    include: { user: true },
  });
  if (!top) return null;
  return {
    email: top.user.email,
    name: top.user.name,
    userId: top.user.id,
    claimMinutes: CLAIM_DEFAULT_MINUTES,
  };
}

// ─── Templates ───────────────────────────────────────────────────────────────

const BRAND_FOOTER = `
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
  <p style="color: #999; font-size: 12px;">Grace Salon — Hair That Moves. Skin That Glows.</p>
</div>`;

function wrap(html: string): string {
  return `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">${html}${BRAND_FOOTER}`;
}

function serviceListHtml(booking: BookingFull): string {
  const services =
    booking.bookingServices.length > 0
      ? booking.bookingServices.map((bs) => bs.service)
      : booking.service
        ? [booking.service]
        : [];
  if (services.length === 0) return "<li>Service</li>";
  return services
    .map((s) => `<li>${s.name} — ${s.durationMinutes} min — ₹${s.price.toFixed(0)}</li>`)
    .join("");
}

function serviceNames(booking: BookingFull): string {
  const services =
    booking.bookingServices.length > 0
      ? booking.bookingServices.map((bs) => bs.service.name)
      : booking.service
        ? [booking.service.name]
        : [];
  return services.length > 0 ? services.join(", ") : "Service";
}

function detailsBox(booking: BookingFull): string {
  return `
  <div style="background: #F5F1EA; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p><strong>Specialist:</strong> ${booking.employee?.name || "TBD"}</p>
    <p><strong>Date:</strong> ${booking.date.toISOString().split("T")[0]}</p>
    <p><strong>Time:</strong> ${booking.slotStart || booking.timeSlot}${booking.slotEnd ? ` — ${booking.slotEnd}` : ""}</p>
    <p><strong>Services:</strong></p>
    <ul>${serviceListHtml(booking)}</ul>
    <p style="font-size: 18px; margin-top: 12px;"><strong>Total: ₹${booking.price.toFixed(0)}</strong></p>
  </div>`;
}

function buildEmail(
  booking: BookingFull,
  event: BookingEvent,
  recipient: Recipient
): { subject: string; html: string; attachIcs: boolean } {
  const dateStr = booking.date.toISOString().split("T")[0];
  const timeStr = `${booking.slotStart || booking.timeSlot}${booking.slotEnd ? ` — ${booking.slotEnd}` : ""}`;

  switch (event) {
    case "CONFIRMED":
      return {
        subject: "Booking Confirmed — Grace Salon",
        html: wrap(`
          <h2 style="color: #3D5A47;">Booking Confirmed ✅</h2>
          <p>Hi ${recipient.name},</p>
          <p>Your appointment at <strong>Grace Salon</strong> has been confirmed.</p>
          ${detailsBox(booking)}
          <p style="color: #666; font-size: 14px;">Booking ID: ${booking.id}</p>
          <p style="color: #666; font-size: 14px;">Need to cancel? Please do so at least 4 hours before your appointment.</p>`),
        attachIcs: true,
      };

    case "RESCHEDULED":
      return {
        subject: "Booking Rescheduled — Grace Salon",
        html: wrap(`
          <h2 style="color: #3D5A47;">Booking Rescheduled 📅</h2>
          <p>Hi ${recipient.name},</p>
          <p>Your appointment at <strong>Grace Salon</strong> has been rescheduled.</p>
          ${detailsBox(booking)}
          <p style="color: #666; font-size: 14px;">Booking ID: ${booking.id}</p>`),
        attachIcs: true,
      };

    case "CANCELLED":
      return {
        subject: "Booking Cancelled — Grace Salon",
        html: wrap(`
          <h2 style="color: #3D5A47;">Booking Cancelled</h2>
          <p>Hi ${recipient.name},</p>
          <p>Your appointment at <strong>Grace Salon</strong> has been cancelled.</p>
          ${detailsBox(booking)}
          <p style="color: #666; font-size: 14px;">We hope to see you again soon — rebook anytime from your account.</p>`),
        attachIcs: false,
      };

    case "REMINDER_24H":
    case "REMINDER_1H": {
      const isDayBefore = event === "REMINDER_24H";
      return {
        subject: `Appointment Reminder — Grace Salon`,
        html: wrap(`
          <h2 style="color: #3D5A47;">Appointment Reminder ⏰</h2>
          <p>Hi ${recipient.name},</p>
          <p>This is a friendly reminder that your appointment at <strong>Grace Salon</strong> is ${
            isDayBefore ? "tomorrow" : "starting in about an hour"
          }.</p>
          ${detailsBox(booking)}
          <p style="color: #666; font-size: 14px;">Need to reschedule? Please do so at least 4 hours before your appointment.</p>`),
        attachIcs: false,
      };
    }

    case "WAITLIST_SLOT_OPEN": {
      const minutes = recipient.claimMinutes ?? 30;
      return {
        subject: "A Slot Opened Up — Grace Salon",
        html: wrap(`
          <h2 style="color: #3D5A47;">🎉 A Slot Is Available!</h2>
          <p>Hi ${recipient.name},</p>
          <p>An opening with <strong>${booking.employee?.name || "your specialist"}</strong> just came up:</p>
          <div style="background: #F5F1EA; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Service:</strong> ${serviceNames(booking)}</p>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${timeStr}</p>
          </div>
          <p style="color: #666; font-size: 14px;">⏰ Claim within <strong>${minutes} minutes</strong> or it goes to the next person in line.</p>
          <div style="background: #F5F1EA; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || ""}/booking"
               style="display: inline-block; background: #3D5A47; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Claim Your Slot
            </a>
          </div>`),
        attachIcs: false,
      };
    }
  }
}

function buildIcsFor(booking: BookingFull): string | undefined {
  const needsIcs = booking.slotStart && booking.date;
  if (!needsIcs) return undefined;
  return buildIcsCalendar({
    uid: booking.id, // same UID for CONFIRMED/RESCHEDULED → calendars treat reschedule as an update
    title: `Grace Salon — ${serviceNames(booking)}`,
    description: `Booking ID: ${booking.id}\nSpecialist: ${booking.employee?.name || "TBD"}\nServices: ${serviceNames(booking)}\nTotal: ₹${booking.price.toFixed(0)}`,
    location: "Grace Salon",
    date: booking.date.toISOString().split("T")[0],
    slotStart: booking.slotStart!,
    slotEnd: booking.slotEnd || undefined,
  });
}

// ─── Push payload ────────────────────────────────────────────────────────────

function pushTitleBody(
  booking: BookingFull,
  event: BookingEvent,
  recipient: Recipient
): { title: string; body: string } {
  const timeStr = `${booking.slotStart || booking.timeSlot}`;
  const dateStr = booking.date.toISOString().split("T")[0];

  switch (event) {
    case "CONFIRMED":
      return { title: "Booking confirmed ✅", body: `Your appointment on ${dateStr} at ${timeStr} is confirmed.` };
    case "RESCHEDULED":
      return { title: "Booking rescheduled 📅", body: `Your appointment has moved to ${dateStr} at ${timeStr}.` };
    case "CANCELLED":
      return { title: "Booking cancelled", body: `Your appointment on ${dateStr} at ${timeStr} was cancelled.` };
    case "REMINDER_24H":
      return { title: "Appointment tomorrow ⏰", body: `Reminder: your appointment is tomorrow at ${timeStr}.` };
    case "REMINDER_1H":
      return { title: "Appointment starting soon ⏰", body: `Your appointment starts in about an hour (${timeStr}).` };
    case "WAITLIST_SLOT_OPEN":
      return {
        title: "A slot opened up! 🎉",
        body: `${booking.employee?.name || "Your specialist"} has an opening at ${timeStr}. Claim within ${recipient.claimMinutes ?? 30} minutes.`,
      };
  }
}

// ─── Channels ────────────────────────────────────────────────────────────────

async function emailChannel(
  booking: BookingFull,
  event: BookingEvent,
  recipient: Recipient
): Promise<void> {
  if (await alreadySent(booking.id, event, "email")) return;

  const { subject, html, attachIcs } = buildEmail(booking, event, recipient);
  const attachments =
    attachIcs && booking.slotStart
      ? [{ filename: `grace-salon-booking.ics`, content: Buffer.from(buildIcsFor(booking) || "", "utf8") }]
      : undefined;

  const ok = await sendTransactionalEmail({ to: recipient.email, subject, html, attachments });
  // Only log on success: a failed send can be retried by a later notifyBooking.
  if (ok) await markSent(booking.id, event, "email");
}

const STALE_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

async function pushChannel(
  booking: BookingFull,
  event: BookingEvent,
  recipient: Recipient
): Promise<void> {
  if (!recipient.userId) return; // guests: email only
  if (await alreadySent(booking.id, event, "push")) return;

  const tokens = await db.deviceToken.findMany({
    where: { userId: recipient.userId, revokedAt: null },
    select: { id: true, token: true },
  });
  if (tokens.length === 0) return; // no registered devices → nothing to send (and nothing to log)

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    console.warn("[Notify] Firebase not configured — skipping push");
    return;
  }

  const { title, body } = pushTitleBody(booking, event, recipient);
  const data: Record<string, string> = {
    type: event,
    bookingId: booking.id,
    deepLink: `/bookings/${booking.id}`,
    title,
    body,
  };

  try {
    // Data-only per contract: the service worker reads {type, bookingId,
    // deepLink, title, body} from `data` and decides how/where to display.
    const res = await messaging.sendEachForMulticast({
      tokens: tokens.map((t) => t.token),
      data,
    });

    // Revoke stale tokens (contract: not-registered / invalid → revokedAt)
    for (let i = 0; i < res.responses.length; i++) {
      const r = res.responses[i];
      if (!r.success && r.error && STALE_TOKEN_CODES.has(r.error.code)) {
        db.deviceToken
          .update({ where: { id: tokens[i].id }, data: { revokedAt: new Date() } })
          .catch((err) => console.error("[Notify] Failed to revoke stale token:", err));
      }
    }

    if (res.responses.some((r) => r.success)) {
      await markSent(booking.id, event, "push");
    } else {
      console.error(`[Notify] Push failed for all ${tokens.length} tokens (${event}):`, res.responses[0]?.error?.message);
    }
  } catch (err) {
    console.error(`[Notify] Push send error (${event}):`, err);
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Send every channel for (bookingId, event). Idempotent per channel,
 * isolated between channels, never throws.
 */
export async function notifyBooking(bookingId: string, event: BookingEvent): Promise<void> {
  try {
    const booking = await loadBooking(bookingId);
    if (!booking) {
      console.warn(`[Notify] Booking ${bookingId} not found for ${event}`);
      return;
    }

    const recipient = await resolveRecipient(booking, event);
    if (!recipient) {
      console.warn(`[Notify] No recipient for ${event} on booking ${bookingId}`);
      return;
    }

    // Channels run independently — one failing must never block the other.
    const results = await Promise.allSettled([
      emailChannel(booking, event, recipient),
      pushChannel(booking, event, recipient),
    ]);
    for (const r of results) {
      if (r.status === "rejected") {
        console.error(`[Notify] Channel error (${event}/${bookingId}):`, r.reason);
      }
    }
  } catch (err) {
    console.error(`[Notify] notifyBooking failed (${event}/${bookingId}):`, err);
  }
}
