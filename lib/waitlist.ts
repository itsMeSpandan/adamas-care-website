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
 */

import { db } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { rankWaitlist } from "@/lib/scoring-engine";

/** How long a notified user has to claim a slot before it moves on. */
export const WAITLIST_CLAIM_EXPIRY_MINUTES = 30;

/**
 * Offer a freed slot to the highest-ranked `waiting` entry (ranking comes from
 * the shared scoring engine). Returns the notified user id, or null when
 * nobody was eligible.
 */
export async function cascadeToNextWaitlisted(
  employeeId: string,
  slotStart: string
): Promise<string | null> {
  const ranked = await rankWaitlist(employeeId, slotStart);
  if (ranked.length === 0) return null;

  const nextEntry = await db.waitlist.findUnique({
    where: { id: ranked[0].waitlistId },
    include: { user: true, employee: true },
  });
  if (!nextEntry || nextEntry.status !== "waiting") return null;

  const claimExpiresAt = new Date(
    Date.now() + WAITLIST_CLAIM_EXPIRY_MINUTES * 60 * 1000
  );

  await db.waitlist.update({
    where: { id: nextEntry.id },
    data: { status: "notified", notifiedAt: new Date(), claimExpiresAt },
  });

  // Direct email for the cascade — deliberately NOT notifyBooking():
  // NotificationLog's (bookingId, event, channel) uniqueness means the primary
  // WAITLIST_SLOT_OPEN for this slot is already logged, and a second waitlist
  // member must still be reachable.
  await sendTransactionalEmail({
    to: nextEntry.user.email,
    subject: "A Slot Opened Up — Grace Salon",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3D5A47;">🎉 A Slot Is Available!</h2>
        <p>Hi ${nextEntry.user.name},</p>
        <p>An opening with <strong>${nextEntry.employee?.name || "your specialist"}</strong> just came up:</p>
        <div style="background: #F5F1EA; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Time:</strong> ${slotStart}</p>
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
    userId: nextEntry.userId,
    type: "WAITLIST_SLOT_OPEN",
    title: "A slot opened up! 🎉",
    body: `${nextEntry.employee?.name || "Your specialist"} has an opening at ${slotStart}. Claim within ${WAITLIST_CLAIM_EXPIRY_MINUTES} minutes.`,
    deepLink: "/account/waitlist",
  });

  console.log(
    `[Waitlist] Cascade: notified user ${nextEntry.userId} for slot ${slotStart}`
  );
  return nextEntry.userId;
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
    select: { id: true, employeeId: true, slotStart: true },
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
        entry.slotStart
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
