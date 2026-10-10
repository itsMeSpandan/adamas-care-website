/**
 * lib/notifications.ts — in-app notifications.
 *
 * The other two delivery channels have external dependencies: email needs a
 * Resend key and push needs Firebase plus a registered device. Neither can be
 * relied on, and a freed waitlist slot that nobody is told about is a slot
 * that goes to waste. This store is the always-available channel: the message
 * lives in the database until the user opens the bell, so it survives a
 * missing email key, a signed-out phone and a closed browser tab.
 *
 * Writes are best-effort and never throw — exactly like the email and push
 * channels, a notification failure must never roll back the booking or the
 * waitlist cascade that triggered it.
 */

import { db } from "@/lib/db";

export interface CreateNotificationInput {
  userId: string;
  /** Event name, matching the values in lib/notify.ts. */
  type: string;
  title: string;
  body: string;
  /** Where the bell should send the user (relative path). */
  deepLink?: string | null;
  bookingId?: string | null;
}

export interface InAppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  deepLink: string | null;
  bookingId: string | null;
  readAt: string | null;
  createdAt: string;
}

/** How many notifications `listNotifications` returns by default. */
export const NOTIFICATION_PAGE_SIZE = 50;

/**
 * Store a notification for a user. Best-effort: logs and returns false on
 * failure rather than throwing into the caller's transaction.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<boolean> {
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        deepLink: input.deepLink ?? null,
        bookingId: input.bookingId ?? null,
      },
    });
    return true;
  } catch (err) {
    console.error(
      `[Notifications] Failed to store ${input.type} for user ${input.userId}:`,
      err
    );
    return false;
  }
}

/** A user's own notifications, newest first. */
export async function listNotifications(
  userId: string,
  limit: number = NOTIFICATION_PAGE_SIZE
): Promise<InAppNotification[]> {
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      deepLink: true,
      bookingId: true,
      readAt: true,
      createdAt: true,
    },
  });

  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    deepLink: n.deepLink,
    bookingId: n.bookingId,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function countUnread(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } });
}

/**
 * Mark every unread notification read. Scoped by userId so it can never touch
 * another user's rows, and idempotent — re-marking read rows is a no-op.
 */
export async function markAllRead(userId: string): Promise<number> {
  const result = await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

/** Mark one notification read. Returns false when it isn't the user's. */
export async function markRead(userId: string, id: string): Promise<boolean> {
  const result = await db.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  // 0 rows is also the answer when it was already read, so confirm ownership
  // before reporting a miss.
  if (result.count > 0) return true;
  const own = await db.notification.findFirst({ where: { id, userId }, select: { id: true } });
  return !!own;
}
