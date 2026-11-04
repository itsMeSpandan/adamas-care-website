import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PATCH } from "@/app/api/bookings/[id]/route";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { COOKIE_NAMES } from "@/lib/constants";

/**
 * Regression tests for the booking PATCH ownership hole.
 *
 * Previously any authenticated account could PATCH any booking id: cancel or
 * confirm someone else's appointment (real emails, loyalty clawbacks,
 * reliability penalties) or overwrite their rating/review.
 *
 * These tests deliberately only exercise paths that send NO notifications, so
 * running them never emails a real customer.
 */

const OWNER_EMAIL = "sec-test-owner@gracesalon.test";
const ATTACKER_EMAIL = "sec-test-attacker@gracesalon.test";
const ADMIN_EMAIL = "sec-test-admin@gracesalon.test";
const ALL_EMAILS = [OWNER_EMAIL, ATTACKER_EMAIL, ADMIN_EMAIL];

let ownerId: string;
let attackerId: string;
let adminId: string;
let bookingId: string;

async function cookieFor(userId: string, role: string, email: string) {
  const token = await signToken({ userId, role, email }, "15m");
  return `${COOKIE_NAMES.session}=${token}`;
}

function requestWith(cookie: string | null, body: unknown): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (cookie) headers.cookie = cookie;
  return new Request("http://localhost/api/bookings/test", {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

function context(id: string): { params: Promise<Record<string, string>> } {
  return { params: Promise.resolve({ id }) };
}

// The exported handler is a Next.js route handler; calling it directly is the
// closest thing to the real request path without booting a server.
type Handler = (
  request: Request,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<Response>;

const patch: Handler = PATCH as unknown as Handler;

beforeAll(async () => {
  await db.user.deleteMany({ where: { email: { in: ALL_EMAILS } } });

  const [owner, attacker, admin] = await Promise.all([
    db.user.create({
      data: {
        name: "Sec Test Owner",
        email: OWNER_EMAIL,
        password: "x",
        avatarUrl: "",
      },
    }),
    db.user.create({
      data: {
        name: "Sec Test Attacker",
        email: ATTACKER_EMAIL,
        password: "x",
        avatarUrl: "",
      },
    }),
    db.user.create({
      data: {
        name: "Sec Test Admin",
        email: ADMIN_EMAIL,
        password: "x",
        role: "admin",
        avatarUrl: "",
      },
    }),
  ]);

  ownerId = owner.id;
  attackerId = attacker.id;
  adminId = admin.id;

  const booking = await db.booking.create({
    data: {
      userId: ownerId,
      date: new Date(Date.UTC(2031, 0, 15)),
      timeSlot: "11:00",
      slotStart: "11:00",
      slotEnd: "12:00",
      name: "Sec Test Owner",
      email: OWNER_EMAIL,
      phone: "+910000000000",
      price: 85,
      status: "pending",
    },
  });
  bookingId = booking.id;
});

afterAll(async () => {
  await db.booking.deleteMany({ where: { id: bookingId } }).catch(() => {});
  await db.user.deleteMany({ where: { email: { in: ALL_EMAILS } } }).catch(() => {});
  await db.$disconnect();
});

describe("PATCH /api/bookings/[id] authorization", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await patch(requestWith(null, { status: "cancelled" }), context(bookingId));
    expect(res.status).toBe(401);
  });

  it("returns 404 for a booking that does not exist", async () => {
    const cookie = await cookieFor(attackerId, "user", ATTACKER_EMAIL);
    const res = await patch(
      requestWith(cookie, { status: "cancelled" }),
      context("definitely-not-a-booking")
    );
    expect(res.status).toBe(404);
  });

  it("forbids a different customer from cancelling someone else's booking", async () => {
    const cookie = await cookieFor(attackerId, "user", ATTACKER_EMAIL);
    const res = await patch(requestWith(cookie, { status: "cancelled" }), context(bookingId));
    expect(res.status).toBe(403);

    const after = await db.booking.findUnique({ where: { id: bookingId } });
    expect(after?.status).toBe("pending");
  });

  it("forbids a different customer from confirming someone else's booking", async () => {
    const cookie = await cookieFor(attackerId, "user", ATTACKER_EMAIL);
    const res = await patch(requestWith(cookie, { status: "confirmed" }), context(bookingId));
    expect(res.status).toBe(403);

    const after = await db.booking.findUnique({ where: { id: bookingId } });
    expect(after?.status).toBe("pending");
  });

  it("forbids a different customer from rating or reviewing someone else's booking", async () => {
    const cookie = await cookieFor(attackerId, "user", ATTACKER_EMAIL);
    const res = await patch(
      requestWith(cookie, { rating: 5, review: "pwned" }),
      context(bookingId)
    );
    expect(res.status).toBe(403);

    const after = await db.booking.findUnique({ where: { id: bookingId } });
    expect(after?.rating).toBeNull();
    expect(after?.review).toBeNull();
  });

  it("stops a customer from promoting their own booking to confirmed", async () => {
    const cookie = await cookieFor(ownerId, "user", OWNER_EMAIL);
    const res = await patch(requestWith(cookie, { status: "confirmed" }), context(bookingId));
    expect(res.status).toBe(403);

    const after = await db.booking.findUnique({ where: { id: bookingId } });
    expect(after?.status).toBe("pending");
  });

  it("still lets the owner rate their own booking", async () => {
    const cookie = await cookieFor(ownerId, "user", OWNER_EMAIL);
    // Booking.rating is a double precision column, so the route's 0.1-step
    // rounding survives: a 4.6 review must come back as 4.6, not 4. (It used
    // to be Int?, and Postgres silently truncated the decimal.)
    const res = await patch(
      requestWith(cookie, { rating: 4.6, review: "Lovely" }),
      context(bookingId)
    );
    expect(res.status).toBe(200);

    const after = await db.booking.findUnique({ where: { id: bookingId } });
    expect(after?.rating).toBe(4.6);
    expect(after?.review).toBe("Lovely");
  });

  it("does not let an admin rewrite a customer's review", async () => {
    const cookie = await cookieFor(adminId, "admin", ADMIN_EMAIL);
    const res = await patch(
      requestWith(cookie, { rating: 1, review: "admin was here" }),
      context(bookingId)
    );
    expect(res.status).toBe(403);

    const after = await db.booking.findUnique({ where: { id: bookingId } });
    expect(after?.review).toBe("Lovely");
  });

  it("still returns 400 for an invalid status from an authorized caller", async () => {
    const cookie = await cookieFor(adminId, "admin", ADMIN_EMAIL);
    const res = await patch(requestWith(cookie, { status: "suspended" }), context(bookingId));
    expect(res.status).toBe(400);
  });
});
