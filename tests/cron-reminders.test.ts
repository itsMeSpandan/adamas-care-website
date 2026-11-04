/**
 * tests/cron-reminders.test.ts — GET /api/cron/reminders window logic.
 *
 * Product rules under test:
 *   - REMINDER_24H fires for slots ~23–25h out (next day)
 *   - REMINDER_6H fires for slots ~5.5–6.5h out (6 hours before)
 *   - the old 1-hour reminder is gone (1h-out bookings get nothing)
 *   - CRON_SECRET Bearer auth is enforced before any work
 *
 * notifyBooking/db are mocked — no real email or push is ever sent; its
 * idempotency (NotificationLog) is covered by tests/notify.test.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockDb, notifyBooking } = vi.hoisted(() => ({
  mockDb: { booking: { findMany: vi.fn() } },
  notifyBooking: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/notify", () => ({ notifyBooking: notifyBooking }));

import { GET } from "@/app/api/cron/reminders/route";

const HOUR = 60 * 60 * 1000;
const SECRET = "test-cron-secret";
const originalSecret = process.env.CRON_SECRET;

function makeRequest(auth?: string): Request {
  return new Request("http://localhost/api/cron/reminders", {
    headers: auth === undefined ? {} : { authorization: auth },
  });
}

/** Booking whose date is `hoursFromNow` away (slotStart null → date is the slot). */
function bookingAt(id: string, hoursFromNow: number) {
  return { id, date: new Date(Date.now() + hoursFromNow * HOUR), slotStart: null };
}

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  mockDb.booking.findMany.mockReset();
  notifyBooking.mockReset();
});

afterEach(() => {
  process.env.CRON_SECRET = originalSecret;
});

describe("auth", () => {
  it("401s without an Authorization header and does no work", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(mockDb.booking.findMany).not.toHaveBeenCalled();
  });

  it("401s with a wrong bearer token", async () => {
    const res = await GET(makeRequest("Bearer nope"));
    expect(res.status).toBe(401);
    expect(notifyBooking).not.toHaveBeenCalled();
  });
});

describe("reminder windows", () => {
  it("sends next-day (24h) and 6-hours-before reminders exactly once each", async () => {
    mockDb.booking.findMany.mockResolvedValue([
      bookingAt("b-6h", 6),
      bookingAt("b-24h", 24),
    ]);

    const res = await GET(makeRequest(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent24h).toBe(1);
    expect(body.sent6h).toBe(1);

    const calls = notifyBooking.mock.calls.map((c) => `${c[0]}|${c[1]}`);
    expect(calls).toContain("b-6h|REMINDER_6H");
    expect(calls).toContain("b-24h|REMINDER_24H");
  });

  it("no longer sends the old 1-hour reminder", async () => {
    mockDb.booking.findMany.mockResolvedValue([bookingAt("b-1h", 1)]);

    const res = await GET(makeRequest(`Bearer ${SECRET}`));
    const body = await res.json();
    expect(body.sent24h).toBe(0);
    expect(body.sent6h).toBe(0);
    expect(notifyBooking).not.toHaveBeenCalled();
  });

  it("keeps bookings outside both windows untouched", async () => {
    mockDb.booking.findMany.mockResolvedValue([
      bookingAt("b-3h", 3),
      bookingAt("b-now", 0.1),
      bookingAt("b-12h", 12),
      bookingAt("b-30h", 30),
    ]);

    const res = await GET(makeRequest(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(notifyBooking).not.toHaveBeenCalled();
  });

  it("includes times just inside the 6h window edges", async () => {
    mockDb.booking.findMany.mockResolvedValue([
      bookingAt("b-5.6h", 5.6),
      bookingAt("b-6.4h", 6.4),
    ]);

    await GET(makeRequest(`Bearer ${SECRET}`));
    const calls = notifyBooking.mock.calls.map((c) => `${c[0]}|${c[1]}`);
    expect(calls).toContain("b-5.6h|REMINDER_6H");
    expect(calls).toContain("b-6.4h|REMINDER_6H");
  });
});
