import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";
import { isSameOrigin } from "@/lib/csrf";
import {
  NOTIFICATION_PAGE_SIZE,
  countUnread,
  listNotifications,
  markAllRead,
  markRead,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications
 *
 * The signed-in user's own notifications, newest first, plus the unread count
 * for the header bell. Never returns another user's rows — the query is scoped
 * by the session's userId, not by anything the client sends.
 */
export const GET = requireAuth(async (request: Request) => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, 100)
      : NOTIFICATION_PAGE_SIZE;

  try {
    const [notifications, unreadCount] = await Promise.all([
      listNotifications(session.userId, limit),
      countUnread(session.userId),
    ]);
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
});

/**
 * PATCH /api/notifications
 *
 * Body: { all: true } to mark everything read, or { id } for one. Scoped by
 * userId in lib/notifications, so passing someone else's id is a 404 rather
 * than a way to touch their inbox.
 */
export const PATCH = requireAuth(async (request: Request) => {
  // Marking read is state-changing, so reject a cross-site Origin. (Returned as
  // a NextResponse to match the handler type requireAuth expects.)
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { id, all } = body as { id?: string; all?: boolean };

    if (all === true) {
      const marked = await markAllRead(session.userId);
      return NextResponse.json({ success: true, marked });
    }

    if (typeof id === "string" && id.length > 0) {
      const ok = await markRead(session.userId, id);
      if (!ok) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, marked: 1 });
    }

    return NextResponse.json(
      { error: "Provide { all: true } or { id }" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to update notifications:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
});
