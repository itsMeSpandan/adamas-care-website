/**
 * lib/waitlist.ts — waitlist claim-window lifecycle.
 *
 * A slot that opens up is offered to the top-ranked waitlisted user, whose
 * entry moves to `status: "notified"` with a `claimExpiresAt` deadline. The
 * deadline has to be enforced from the server, not only when the user happens
 * to press "claim": a `notified` entry that is never claimed used to sit there
 * forever. Because rankWaitlist only considers `status: "waiting"`, that stale
 * row was simultaneously excluded from the ranking *and* still counted as
 * "on waitlist" — so the slot was offered to nobody and the queue stalled.
 *
 * `expireStaleClaims()` is the sweep that closes this: it moves every overdue
 * claim to `expired` and hands the slot to the next person in line.
 *
 * ── What counts as "their slot opened up" ────────────────────────────────────
 * The booking page marks a slot as occupied whenever the requested interval
 * OVERLAPS an existing booking (see /api/availability/combined), so a member
 * waiting for 11:30–13:30 is told the slot is taken because a 13:15–15:15
 * appointment runs into it. Cancelling that 13:15 appointment is therefore what
 * frees the 11:30 window.
 *
 * Offering only the identical start time (`booking.slotStart ===
 * waitlist.slotStart`) meant none of those members was ever told anything: the
 * freed window was never compared with what they asked for. So the cascade
 * below asks the same availability engine the booking page uses — is this
 * window free *now*, and did the cancellation touch it — instead of comparing
 * two strings.
 */

import { db } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import {
  rankWaitlist,
  getFreeGaps,
  containsInterval,
} from "@/lib/scoring-engine";
import { slotsOverlap } from "@/lib/slots";
import { salonDateKey } from "@/lib/booking-time";

/** How long a notified user has to claim a slot before it moves on. */
export const WAITLIST_CLAIM_EXPIRY_MINUTES = 30;

/** A window a member is waiting for, in salon-local "HH:MM". */
export interface WaitlistWindow {
  start: string;
  end: string;
}

/** An offer that has been started (status flip + deadline written). */
export interface WaitlistOffer extends WaitlistWindow {
  waitlistId: string;
  userId: string;
}

/**
 * The result of a cancellation: the offer that was started, and the other
 * windows the cancellation freed that still need offering.
 *
 * They are split because the best window is announced by the caller through
 * notifyBooking(WAITLIST_SLOT_OPEN) — the only channel that reaches push — and
 * that call resolves its recipient from the waitlist tables, so exactly one
 * entry may be inside its claim window when it runs.
 */
export interface FreedWindowsResult {
  primary: WaitlistOffer | null;
  remaining: WaitlistWindow[];
}

/**
 * UTC midnight of a "YYYY-MM-DD" salon date.
 *
 * `Waitlist.slotDate` and `Booking.date` are both written this way (see
 * /api/waitlist POST and lib/availability resolveDate), so the two can be
 * compared directly.
 */
function dayStartOf(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

interface OfferableEntry {
  id: string;
  userId: string;
  slotStart: string;
  slotEnd: string | null;
  slotDate: Date | null;
  user: { name: string; email: string };
  employee: { name: string } | null;
  service?: { name: string } | null;
}

/** "11:30 – 13:30", or just "11:30" when the end is unknown. */
function windowLabel(window: WaitlistWindow): string {
  return `${window.start}${window.end ? ` – ${window.end}` : ""}`;
}

/**
 * Move an entry into its claim window: `notified` plus the deadline that
 * expireStaleClaims() sweeps. Writes nothing else — the offer still has to be
 * announced (see offerEntry and offerFreedWaitlistWindows).
 */
async function startClaimWindow(entryId: string): Promise<void> {
  await db.waitlist.update({
    where: { id: entryId },
    data: {
      status: "notified",
      notifiedAt: new Date(),
      claimExpiresAt: new Date(
        Date.now() + WAITLIST_CLAIM_EXPIRY_MINUTES * 60 * 1000
      ),
    },
  });
}

/**
 * Start a member's claim window for one specific window and tell them about it.
 *
 * Used by every offer path that is not announced by notifyBooking — so an offer
 * always means the same three things: the status flip with a deadline, an
 * email, and an in-app message (the inbox is the one channel that always works
 * — no Resend key, no device required).
 */
async function offerEntry(
  entry: OfferableEntry,
  window: WaitlistWindow
): Promise<void> {
  await startClaimWindow(entry.id);

  const when = windowLabel(window);
  const onDate = entry.slotDate ? salonDateKey(entry.slotDate) : null;

  // Direct email for the cascade — deliberately NOT notifyBooking():
  // NotificationLog's (bookingId, event, channel) uniqueness means the primary
  // WAITLIST_SLOT_OPEN for this slot is already logged, and a second waitlist
  // member must still be reachable.
  await sendTransactionalEmail({
    to: entry.user.email,
    subject: "A Slot Opened Up — Grace Salon",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3D5A47;">🎉 A Slot Is Available!</h2>
        <p>Hi ${entry.user.name},</p>
        <p>An opening with <strong>${entry.employee?.name || "your specialist"}</strong> just came up:</p>
        <div style="background: #F5F1EA; padding: 16px; border-radius: 8px; margin: 16px 0;">
          ${entry.service?.name ? `<p><strong>Service:</strong> ${entry.service.name}</p>` : ""}
          ${onDate ? `<p><strong>Date:</strong> ${onDate}</p>` : ""}
          <p><strong>Time:</strong> ${when}</p>
        </div>
        <p style="color: #666; font-size: 14px;">⏰ Claim within <strong>${WAITLIST_CLAIM_EXPIRY_MINUTES} minutes</strong> or it goes to the next person in line.</p>
        <div style="background: #F5F1EA; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || ""}/account/waitlist"
             style="display: inline-block; background: #3D5A47; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Claim Your Slot
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Grace Salon — Hair That Moves. Skin That Glows.</p>
      </div>
    `,
  });

  // Same offer in the app. This path deliberately bypasses notifyBooking (see
  // above), so the in-app notification has to be written here too — otherwise a
  // cascaded slot would only ever be announced by email, which is the channel
  // that may not be configured at all.
  await createNotification({
    userId: entry.userId,
    type: "WAITLIST_SLOT_OPEN",
    title: "A slot opened up! 🎉",
    body: `${entry.employee?.name || "Your specialist"} has an opening at ${when}${
      onDate ? ` on ${onDate}` : ""
    }. Claim within ${WAITLIST_CLAIM_EXPIRY_MINUTES} minutes.`,
    deepLink: "/account/waitlist",
  });

  console.log(
    `[Waitlist] Offered ${windowLabel(window)} to user ${entry.userId}`
  );
}

/**
 * Offer a freed slot to the highest-ranked `waiting` entry for one exact
 * window (ranking comes from the shared scoring engine). Returns the notified
 * user id, or null when nobody was eligible.
 *
 * `dateKey` scopes the offer to the day it opened: without it a slot freed on
 * the 21st could be offered to somebody who asked about the 14th. Entries with
 * no `slotDate` (the member never picked a day) are honoured either way.
 *
 * `slotEnd` lets the caller describe the window when the stored entry has no
 * end — the offer message and the claim deadline always describe what is
 * actually on the table.
 */
export async function cascadeToNextWaitlisted(
  employeeId: string,
  slotStart: string,
  dateKey?: string,
  slotEnd?: string | null
): Promise<string | null> {
  const ranked = await rankWaitlist(employeeId, slotStart, dateKey);
  if (ranked.length === 0) return null;

  const nextEntry = await db.waitlist.findUnique({
    where: { id: ranked[0].waitlistId },
    include: { user: true, employee: true, service: true },
  });
  if (!nextEntry || nextEntry.status !== "waiting") return null;

  await offerEntry(nextEntry, {
    start: slotStart,
    end: slotEnd ?? nextEntry.slotEnd ?? "",
  });

  return nextEntry.userId;
}

/**
 * A booking just stopped holding its time: work out which waitlisted windows
 * that actually opened, start the claim window for the best of them, and report
 * the windows that still need offering.
 *
 * A window counts when BOTH hold:
 *   1. it overlaps the freed time — so a cancellation can never fire an offer
 *      for a window it did not touch; and
 *   2. the availability engine now reports the whole window as free, using the
 *      same rule (working hours, overrides, bookings and the cleanup buffer)
 *      that decides whether the booking page shows it as occupied. The two can
 *      therefore never disagree about what is available.
 *
 * One candidate is kept per distinct window, and a window that overlaps one
 * already chosen is skipped — two members cannot both be offered the same
 * stretch of the day. Only the primary offer is started here; the caller
 * announces it (see FreedWindowsResult) and then hands `remaining` to
 * offerRemainingWindows().
 */
export async function offerFreedWaitlistWindows(
  employeeId: string,
  dateKey: string,
  freed: WaitlistWindow
): Promise<FreedWindowsResult> {
  const none: FreedWindowsResult = { primary: null, remaining: [] };

  const entries = await db.waitlist.findMany({
    where: {
      employeeId,
      status: "waiting",
      OR: [{ slotDate: dayStartOf(dateKey) }, { slotDate: null }],
    },
    include: { user: true, employee: true, service: true },
    orderBy: { createdAt: "asc" },
  });
  if (entries.length === 0) return none;

  const gaps = await getFreeGaps(employeeId, dateKey);

  const eligible = entries.filter(
    (e) =>
      !!e.slotEnd &&
      slotsOverlap(e.slotStart, e.slotEnd, freed.start, freed.end) &&
      containsInterval(gaps, e.slotStart, e.slotEnd)
  );
  if (eligible.length === 0) return none;

  // Group by the window actually asked for, so each window is offered once to
  // whichever member ranks highest inside it.
  const byWindow = new Map<string, typeof eligible>();
  for (const entry of eligible) {
    const key = `${entry.slotStart}|${entry.slotEnd}`;
    const group = byWindow.get(key);
    if (group) group.push(entry);
    else byWindow.set(key, [entry]);
  }

  const groups = Array.from(byWindow.values()).sort((a, b) =>
    a[0].slotStart.localeCompare(b[0].slotStart)
  );

  const chosen: { entry: (typeof eligible)[number]; window: WaitlistWindow }[] = [];
  const claimed: WaitlistWindow[] = [];

  for (const group of groups) {
    const window: WaitlistWindow = {
      start: group[0].slotStart,
      end: group[0].slotEnd as string,
    };
    if (claimed.some((w) => slotsOverlap(window.start, window.end, w.start, w.end))) {
      continue;
    }

    const ranked = await rankWaitlist(employeeId, window.start, dateKey);
    const top = ranked.length
      ? group.find((e) => e.id === ranked[0].waitlistId)
      : group[0];
    if (!top) continue;

    claimed.push(window);
    chosen.push({ entry: top, window });
  }

  const [primary, ...rest] = chosen;
  if (!primary) return none;

  // Start the claim window but send nothing here: the caller announces this
  // offer through notifyBooking(bookingId, "WAITLIST_SLOT_OPEN") — the only
  // path that reaches push as well as email and the inbox, and the only one
  // whose NotificationLog key (the cancelled booking) can hold one offer.
  // Announcing here as well would double-message the member.
  await startClaimWindow(primary.entry.id);

  console.log(
    `[Waitlist] Freed ${windowLabel(freed)} on ${dateKey}: offering ${windowLabel(
      primary.window
    )} to user ${primary.entry.userId}`
  );

  return {
    primary: {
      waitlistId: primary.entry.id,
      userId: primary.entry.userId,
      ...primary.window,
    },
    remaining: rest.map((c) => c.window),
  };
}

/**
 * Offer the windows a cancellation freed beyond the primary one (email +
 * in-app each, flip included). One cancellation can free several waitlisted
 * windows at once — a four-hour booking sits on top of every window inside it —
 * and each of those members asked to be told about their own window.
 *
 * Call it AFTER the primary offer has been announced, so exactly one entry is
 * inside its claim window while notifyBooking resolves the recipient.
 */
export async function offerRemainingWindows(
  employeeId: string,
  dateKey: string,
  windows: WaitlistWindow[]
): Promise<number> {
  let offered = 0;

  for (const window of windows) {
    try {
      const userId = await cascadeToNextWaitlisted(
        employeeId,
        window.start,
        dateKey,
        window.end
      );
      if (userId) offered++;
    } catch (err) {
      // One failed window must not stop the others.
      console.error(
        `[Waitlist] Failed to offer ${windowLabel(window)} on ${dateKey}:`,
        err
      );
    }
  }

  return offered;
}

export interface ExpireStaleClaimsResult {
  /** Overdue `notified` entries moved to `expired`. */
  expired: number;
  /** Slots handed on to the next person in line. */
  cascaded: number;
}

/**
 * Expire every claim window that has passed and pass each slot to the next
 * person in line.
 *
 * Entries are matched on `claimExpiresAt < now`; a `notified` row that somehow
 * has no deadline is caught by the `notifiedAt` fallback so no entry can live
 * on in the queue forever. Each flip is a conditional `updateMany` so a claim
 * that lands between the read and the write always wins.
 */
export async function expireStaleClaims(
  now: Date = new Date()
): Promise<ExpireStaleClaimsResult> {
  const staleCutoff = new Date(
    now.getTime() - WAITLIST_CLAIM_EXPIRY_MINUTES * 60 * 1000
  );

  const stale = await db.waitlist.findMany({
    where: {
      status: "notified",
      OR: [
        { claimExpiresAt: { lt: now } },
        { claimExpiresAt: null, notifiedAt: { lt: staleCutoff } },
      ],
    },
    select: {
      id: true,
      employeeId: true,
      slotStart: true,
      slotEnd: true,
      slotDate: true,
    },
    orderBy: { claimExpiresAt: "asc" },
  });

  let expired = 0;
  let cascaded = 0;

  for (const entry of stale) {
    const flipped = await db.waitlist.updateMany({
      where: { id: entry.id, status: "notified" },
      data: { status: "expired" },
    });
    if (flipped.count === 0) continue; // claimed concurrently

    expired++;
    try {
      const notifiedUserId = await cascadeToNextWaitlisted(
        entry.employeeId,
        entry.slotStart,
        entry.slotDate ? salonDateKey(entry.slotDate) : undefined,
        entry.slotEnd
      );
      if (notifiedUserId) cascaded++;
    } catch (err) {
      // A failed cascade must not abort the sweep or strand the remaining rows.
      console.error(
        `[Waitlist] Failed to cascade slot ${entry.slotStart} (employee ${entry.employeeId}):`,
        err
      );
    }
  }

  return { expired, cascaded };
}
