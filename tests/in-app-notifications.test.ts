/**
 * tests/in-app-notifications.test.ts — the always-available notification channel.
 *
 * Why this exists: email needs a Resend key and push needs Firebase plus a
 * registered device, so a freed waitlist slot could previously be announced
 * through two channels that might both be unavailable. These tests pin down:
 *   - a stored notification survives a write failure (never throws into the
 *     booking or cascade that triggered it)
 *   - reads are scoped to the signed-in user, so an id from another account
 *     cannot be read or marked read
 *   - POST-free mutations reject a cross-site Origin
 *   - the waitlist cascade (which bypasses notifyBooking) stores one too
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockSendEmail } = vi.hoisted(() => ({
  mockDb: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
    waitlist: { findUnique: vi.fn(), update: vi.fn() },
  },
  mockSendEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/email", () => ({
  sendTransactionalEmail: mockSendEmail,
  sendVerificationOtpEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));
vi.mock("@/lib/scoring-engine", () => ({
  rankWaitlist: vi.fn(async () => [{ waitlistId: "wl-1", score: 10 }]),
}));

const mockSession = { userId: "user-1", role: "user", email: "casey@example.com" };
vi.mock("@/lib/auth", () => ({
  getSessionFromRequest: vi.fn(async () => mockSession),
  signToken: vi.fn(),
  verifyToken: vi.fn(),
  setSessionCookies: vi.fn(),
  clearSessionCookies: vi.fn(),
}));

vi.mock("@/lib/require-auth", () => ({
  requireAuth: (handler: Function) => async (request: Request, context?: unknown) =>
    handler(request, context),
  requireRole: () => (handler: Function) => async (request: Request, context?: unknown) =>
    handler(request, context),
}));

import {
  createNotification,
  listNotifications,
  countUnread,
  markAllRead,
  markRead,
} from "@/lib/notifications";
import { cascadeToNextWaitlisted } from "@/lib/waitlist";

function makeRequest(method: string, url: string, body?: unknown, origin?: string) {
  // A real HTTP request always carries Host; `new Request` does not set one,
  // so isSameOrigin() would see a hostless request and reject it as cross-site.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    host: "localhost",
  };
  if (origin) headers["origin"] = origin;
  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Store ───────────────────────────────────────────────────────────────────

describe("createNotification", () => {
  it("stores the message with its destination", async () => {
    mockDb.notification.create.mockResolvedValue({ id: "n1" });

    const ok = await createNotification({
      userId: "user-1",
      type: "WAITLIST_SLOT_OPEN",
      title: "A slot opened up! 🎉",
      body: "Arjun Mehta has an opening at 12:15. Claim within 30 minutes.",
      deepLink: "/account/waitlist",
    });

    expect(ok).toBe(true);
    expect(mockDb.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "WAITLIST_SLOT_OPEN",
        title: "A slot opened up! 🎉",
        body: "Arjun Mehta has an opening at 12:15. Claim within 30 minutes.",
        deepLink: "/account/waitlist",
        bookingId: null,
      },
    });
  });

  it("never throws when the write fails — a notification must not roll back a booking", async () => {
    mockDb.notification.create.mockRejectedValue(new Error("db down"));

    await expect(
      createNotification({ userId: "user-1", type: "CONFIRMED", title: "t", body: "b" })
    ).resolves.toBe(false);
  });
});

describe("reads are scoped to one user", () => {
  it("lists only that user's notifications, newest first", async () => {
    mockDb.notification.findMany.mockResolvedValue([
      {
        id: "n1",
        type: "WAITLIST_SLOT_OPEN",
        title: "A slot opened up! 🎉",
        body: "…",
        deepLink: "/account/waitlist",
        bookingId: null,
        readAt: null,
        createdAt: new Date("2026-10-10T09:00:00Z"),
      },
    ]);

    const rows = await listNotifications("user-1");

    expect(mockDb.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
      })
    );
    expect(rows[0]).toMatchObject({
      id: "n1",
      createdAt: "2026-10-10T09:00:00.000Z",
      readAt: null,
    });
  });

  it("counts and clears unread scoped by userId", async () => {
    mockDb.notification.count.mockResolvedValue(3);
    expect(await countUnread("user-1")).toBe(3);
    expect(mockDb.notification.count).toHaveBeenCalledWith({
      where: { userId: "user-1", readAt: null },
    });

    mockDb.notification.updateMany.mockResolvedValue({ count: 3 });
    expect(await markAllRead("user-1")).toBe(3);
    expect(mockDb.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1", readAt: null } })
    );
  });

  it("refuses to mark another user's notification read", async () => {
    // Nothing updated for this user...
    mockDb.notification.updateMany.mockResolvedValue({ count: 0 });
    // ...and the row isn't theirs either.
    mockDb.notification.findFirst.mockResolvedValue(null);

    expect(await markRead("user-2", "n-owned-by-user-1")).toBe(false);
    expect(mockDb.notification.findFirst).toHaveBeenCalledWith({
      where: { id: "n-owned-by-user-1", userId: "user-2" },
      select: { id: true },
    });
  });

  it("reports success for a row that was already read", async () => {
    mockDb.notification.updateMany.mockResolvedValue({ count: 0 });
    mockDb.notification.findFirst.mockResolvedValue({ id: "n1" });

    expect(await markRead("user-1", "n1")).toBe(true);
  });
});

// ─── Waitlist cascade ────────────────────────────────────────────────────────

describe("waitlist cascade", () => {
  it("stores an in-app notification for the notified user, not just an email", async () => {
    mockDb.waitlist.findUnique.mockResolvedValue({
      id: "wl-1",
      userId: "user-1",
      status: "waiting",
      user: { id: "user-1", name: "Casey Customer", email: "casey@example.com" },
      employee: { id: "emp-1", name: "Arjun Mehta" },
    });
    mockDb.waitlist.update.mockResolvedValue({});
    mockDb.notification.create.mockResolvedValue({ id: "n1" });
    mockSendEmail.mockResolvedValue(true);

    const notified = await cascadeToNextWaitlisted("emp-1", "12:15");

    expect(notified).toBe("user-1");
    expect(mockDb.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        type: "WAITLIST_SLOT_OPEN",
        deepLink: "/account/waitlist",
        title: expect.stringMatching(/slot opened up/i),
        body: expect.stringMatching(/Arjun Mehta[\s\S]*12:15[\s\S]*30 minutes/),
      }),
    });
  });

  it("still emails, so the two channels stay independent", async () => {
    mockDb.waitlist.findUnique.mockResolvedValue({
      id: "wl-1",
      userId: "user-1",
      status: "waiting",
      user: { id: "user-1", name: "Casey Customer", email: "casey@example.com" },
      employee: { id: "emp-1", name: "Arjun Mehta" },
    });
    mockDb.waitlist.update.mockResolvedValue({});
    mockDb.notification.create.mockResolvedValue({ id: "n1" });
    mockSendEmail.mockResolvedValue(true);

    await cascadeToNextWaitlisted("emp-1", "12:15");

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "casey@example.com" })
    );
  });

  it("still completes when the in-app write fails", async () => {
    mockDb.waitlist.findUnique.mockResolvedValue({
      id: "wl-1",
      userId: "user-1",
      status: "waiting",
      user: { id: "user-1", name: "Casey Customer", email: "casey@example.com" },
      employee: { id: "emp-1", name: "Arjun Mehta" },
    });
    mockDb.waitlist.update.mockResolvedValue({});
    mockDb.notification.create.mockRejectedValue(new Error("db down"));
    mockSendEmail.mockResolvedValue(true);

    await expect(cascadeToNextWaitlisted("emp-1", "12:15")).resolves.toBe("user-1");
    expect(mockDb.waitlist.update).toHaveBeenCalled();
  });
});

// ─── API ─────────────────────────────────────────────────────────────────────

describe("GET /api/notifications", () => {
  it("returns the session user's rows and unread count", async () => {
    mockDb.notification.findMany.mockResolvedValue([]);
    mockDb.notification.count.mockResolvedValue(2);

    const { GET } = await import("@/app/api/notifications/route");
    const res = await GET(makeRequest("GET", "http://localhost/api/notifications"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.notifications).toEqual([]);
    expect(data.unreadCount).toBe(2);
    expect(mockDb.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } })
    );
  });
});

describe("PATCH /api/notifications", () => {
  it("marks everything read for the session user", async () => {
    mockDb.notification.updateMany.mockResolvedValue({ count: 4 });

    const { PATCH } = await import("@/app/api/notifications/route");
    const res = await PATCH(
      makeRequest("PATCH", "http://localhost/api/notifications", { all: true }, "http://localhost")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true, marked: 4 });
    expect(mockDb.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1", readAt: null } })
    );
  });

  it("404s for a notification id that isn't the caller's", async () => {
    mockDb.notification.updateMany.mockResolvedValue({ count: 0 });
    mockDb.notification.findFirst.mockResolvedValue(null);

    const { PATCH } = await import("@/app/api/notifications/route");
    const res = await PATCH(
      makeRequest("PATCH", "http://localhost/api/notifications", { id: "someone-elses" }, "http://localhost")
    );

    expect(res.status).toBe(404);
  });

  it("rejects a cross-site origin", async () => {
    const { PATCH } = await import("@/app/api/notifications/route");
    const res = await PATCH(
      makeRequest(
        "PATCH",
        "http://localhost/api/notifications",
        { all: true },
        "https://evil.example.com"
      )
    );

    expect(res.status).toBe(403);
    expect(mockDb.notification.updateMany).not.toHaveBeenCalled();
  });

  it("400s when neither all nor id is given", async () => {
    const { PATCH } = await import("@/app/api/notifications/route");
    const res = await PATCH(
      makeRequest("PATCH", "http://localhost/api/notifications", {}, "http://localhost")
    );

    expect(res.status).toBe(400);
  });
});
