/**
 * tests/notify.test.ts — notifyBooking contract tests.
 *
 * Covers (Phase 7.1):
 *   - idempotency: second call sends nothing twice (per booking/event/channel)
 *   - channel isolation: a failing email channel never blocks push, and vice versa
 *   - guests (no userId) get email only
 *   - stale FCM tokens are revoked (registration-token-not-registered /
 *     invalid-registration-token)
 *   - .ics attached to CONFIRMED; per-event templates
 *
 * Mocks firebase-admin (via lib/firebase-admin) and Resend (via lib/email).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockDb, logRows } = vi.hoisted(() => {
  const logRows = new Set<string>();
  const mockDb = {
    booking: { findUnique: vi.fn() },
    notificationLog: { findUnique: vi.fn(), create: vi.fn() },
    deviceToken: { findMany: vi.fn(), update: vi.fn() },
    waitlist: { findFirst: vi.fn(), findUnique: vi.fn() },
  };
  return { mockDb, logRows };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/email", () => ({
  sendTransactionalEmail: vi.fn(),
  sendVerificationOtpEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getFirebaseMessaging: vi.fn(() => null),
  isFirebaseConfigured: vi.fn(() => false),
}));

vi.mock("@/lib/scoring-engine", () => ({
  rankWaitlist: vi.fn(async () => []),
}));

import { notifyBooking } from "@/lib/notify";
import { sendTransactionalEmail } from "@/lib/email";
import { getFirebaseMessaging } from "@/lib/firebase-admin";

const emailMock = vi.mocked(sendTransactionalEmail);
const messagingMock = vi.mocked(getFirebaseMessaging);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const BASE_BOOKING = {
  id: "bk-1",
  serviceId: "svc-1",
  employeeId: "emp-1",
  userId: "user-1",
  date: new Date("2026-10-05T00:00:00Z"),
  timeSlot: "10:00",
  slotStart: "10:00",
  slotEnd: "11:00",
  name: "Casey Customer",
  email: "casey@example.com",
  phone: "+911234567890",
  notes: null,
  status: "confirmed",
  price: 500,
  employee: { id: "emp-1", name: "Arjun Mehta" },
  service: { id: "svc-1", name: "Precision Haircut", durationMinutes: 60, price: 500 },
  bookingServices: [],
};

function mockMessaging(sendEachForMulticast: ReturnType<typeof vi.fn>) {
  messagingMock.mockReturnValue({ sendEachForMulticast } as never);
}

beforeEach(() => {
  logRows.clear();
  vi.clearAllMocks();

  // In-memory NotificationLog honouring the unique (bookingId,event,channel).
  mockDb.notificationLog.findUnique.mockImplementation(async ({ where }: never | any) => {
    const k = where.bookingId_event_channel;
    const key = `${k.bookingId}|${k.event}|${k.channel}`;
    return logRows.has(key) ? { id: "log-1", ...k } : null;
  });
  mockDb.notificationLog.create.mockImplementation(async ({ data }: never | any) => {
    const key = `${data.bookingId}|${data.event}|${data.channel}`;
    if (logRows.has(key)) {
      const err = new Error("Unique constraint") as Error & { code?: string };
      err.code = "P2002";
      throw err;
    }
    logRows.add(key);
    return { id: "log-1", ...data };
  });

  mockDb.booking.findUnique.mockResolvedValue(BASE_BOOKING);
  mockDb.deviceToken.findMany.mockResolvedValue([]);
  mockDb.deviceToken.update.mockResolvedValue({});
  mockDb.waitlist.findFirst.mockResolvedValue(null);
  mockDb.waitlist.findUnique.mockResolvedValue(null);

  emailMock.mockResolvedValue(true);
  messagingMock.mockReturnValue(null); // push unconfigured by default
});

// ─── Idempotency ─────────────────────────────────────────────────────────────

describe("notifyBooking idempotency", () => {
  it("sends the confirmation email only once across two calls", async () => {
    await notifyBooking("bk-1", "CONFIRMED");
    await notifyBooking("bk-1", "CONFIRMED");

    expect(emailMock).toHaveBeenCalledTimes(1);
    expect(logRows.has("bk-1|CONFIRMED|email")).toBe(true);
  });

  it("sends push only once across two calls", async () => {
    mockDb.deviceToken.findMany.mockResolvedValue([{ id: "d1", token: "tok-1" }]);
    const sendEach = vi.fn().mockResolvedValue({ responses: [{ success: true }] });
    mockMessaging(sendEach);

    await notifyBooking("bk-1", "CONFIRMED");
    await notifyBooking("bk-1", "CONFIRMED");

    expect(sendEach).toHaveBeenCalledTimes(1);
    expect(logRows.has("bk-1|CONFIRMED|push")).toBe(true);
  });

  it("different events are logged independently", async () => {
    await notifyBooking("bk-1", "CONFIRMED");
    await notifyBooking("bk-1", "REMINDER_24H");

    expect(emailMock).toHaveBeenCalledTimes(2);
    expect(logRows.has("bk-1|CONFIRMED|email")).toBe(true);
    expect(logRows.has("bk-1|REMINDER_24H|email")).toBe(true);
  });
});

// ─── Channel isolation ───────────────────────────────────────────────────────

describe("channel isolation", () => {
  it("a rejecting email channel does not block push (and vice versa)", async () => {
    mockDb.deviceToken.findMany.mockResolvedValue([{ id: "d1", token: "tok-1" }]);
    const sendEach = vi.fn().mockResolvedValue({ responses: [{ success: true }] });
    mockMessaging(sendEach);
    emailMock.mockRejectedValue(new Error("SMTP down"));

    // Must resolve — never throw into the booking flow.
    await expect(notifyBooking("bk-1", "CONFIRMED")).resolves.toBeUndefined();

    expect(sendEach).toHaveBeenCalledTimes(1);
    // Email failed → no email log row → a retry may send email again later.
    expect(logRows.has("bk-1|CONFIRMED|email")).toBe(false);
    expect(logRows.has("bk-1|CONFIRMED|push")).toBe(true);
  });

  it("a failed email send is not logged, so the next call retries it", async () => {
    emailMock.mockResolvedValueOnce(false); // provider failure
    await notifyBooking("bk-1", "CONFIRMED");
    expect(logRows.has("bk-1|CONFIRMED|email")).toBe(false);

    await notifyBooking("bk-1", "CONFIRMED"); // retry succeeds
    expect(emailMock).toHaveBeenCalledTimes(2);
    expect(logRows.has("bk-1|CONFIRMED|email")).toBe(true);
  });

  it("a broken push channel does not block email", async () => {
    mockDb.deviceToken.findMany.mockResolvedValue([{ id: "d1", token: "tok-1" }]);
    const sendEach = vi.fn().mockRejectedValue(new Error("FCM down"));
    mockMessaging(sendEach);

    await expect(notifyBooking("bk-1", "CONFIRMED")).resolves.toBeUndefined();
    expect(emailMock).toHaveBeenCalledTimes(1);
    expect(logRows.has("bk-1|CONFIRMED|email")).toBe(true);
    expect(logRows.has("bk-1|CONFIRMED|push")).toBe(false); // retried later
  });
});

// ─── Guests: email only ──────────────────────────────────────────────────────

describe("guest bookings", () => {
  it("guest (no userId) sends email only — push channel never queried", async () => {
    mockDb.booking.findUnique.mockResolvedValue({ ...BASE_BOOKING, userId: null });
    mockDb.deviceToken.findMany.mockResolvedValue([{ id: "d1", token: "tok-1" }]);

    await notifyBooking("bk-1", "CONFIRMED");
    await notifyBooking("bk-1", "CONFIRMED");

    expect(emailMock).toHaveBeenCalledTimes(1);
    expect(mockDb.deviceToken.findMany).not.toHaveBeenCalled();
    expect(logRows.has("bk-1|CONFIRMED|push")).toBe(false);
  });
});

// ─── Stale token pruning ─────────────────────────────────────────────────────

describe("stale token revocation", () => {
  it.each([
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token",
  ])("revokes the device row on %s", async (code) => {
    mockDb.deviceToken.findMany.mockResolvedValue([{ id: "d-stale", token: "stale-token" }]);
    const sendEach = vi.fn().mockResolvedValue({
      responses: [{ success: false, error: { code, message: "gone" } }],
    });
    mockMessaging(sendEach);

    await notifyBooking("bk-1", "CONFIRMED");

    expect(mockDb.deviceToken.update).toHaveBeenCalledWith({
      where: { id: "d-stale" },
      data: { revokedAt: expect.any(Date) },
    });
    // All tokens failed → push NOT logged (retry after re-registration).
    expect(logRows.has("bk-1|CONFIRMED|push")).toBe(false);
  });

  it("mixed results: revokes stale token, logs push when one token succeeds", async () => {
    mockDb.deviceToken.findMany.mockResolvedValue([
      { id: "d-ok", token: "good-token" },
      { id: "d-stale", token: "stale-token" },
    ]);
    const sendEach = vi.fn().mockResolvedValue({
      responses: [
        { success: true },
        { success: false, error: { code: "messaging/registration-token-not-registered", message: "gone" } },
      ],
    });
    mockMessaging(sendEach);

    await notifyBooking("bk-1", "CONFIRMED");

    expect(mockDb.deviceToken.update).toHaveBeenCalledWith({
      where: { id: "d-stale" },
      data: { revokedAt: expect.any(Date) },
    });
    expect(logRows.has("bk-1|CONFIRMED|push")).toBe(true);
  });
});

// ─── Templates ───────────────────────────────────────────────────────────────

describe("event templates", () => {
  it("CONFIRMED sends an .ics attachment", async () => {
    await notifyBooking("bk-1", "CONFIRMED");
    expect(emailMock).toHaveBeenCalledTimes(1);
    const msg = emailMock.mock.calls[0][0];
    expect(msg.to).toBe("casey@example.com");
    expect(msg.attachments?.[0]?.filename).toMatch(/\.ics$/);
    expect(msg.attachments?.[0]?.content.toString("utf8")).toContain("BEGIN:VCALENDAR");
  });

  it("CANCELLED sends a cancellation email without .ics", async () => {
    await notifyBooking("bk-1", "CANCELLED");
    const msg = emailMock.mock.calls[0][0];
    expect(msg.subject).toMatch(/Cancel/i);
    expect(msg.attachments).toBeUndefined();
  });

  it("push payload is data-only with type/bookingId/deepLink/title/body", async () => {
    mockDb.deviceToken.findMany.mockResolvedValue([{ id: "d1", token: "tok-1" }]);
    const sendEach = vi.fn().mockResolvedValue({ responses: [{ success: true }] });
    mockMessaging(sendEach);

    await notifyBooking("bk-1", "CONFIRMED");

    const payload = sendEach.mock.calls[0][0];
    expect(payload.notification).toBeUndefined(); // data-only per contract
    expect(payload.data).toEqual({
      type: "CONFIRMED",
      bookingId: "bk-1",
      deepLink: "/bookings/bk-1",
      title: expect.any(String),
      body: expect.any(String),
    });
  });
});
