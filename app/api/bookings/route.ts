import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBookings } from "@/lib/queries";
import { requireAuth } from "@/lib/require-auth";
import { getSessionFromRequest } from "@/lib/auth";
import { applyRedemptionToBooking, linkRedemptionToBooking } from "@/lib/loyalty";
import { logAudit, getClientIp } from "@/lib/audit";

export const dynamic = "force-dynamic";

// ---------- Time helpers (local to this route) ----------

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function subtractTimeRange(
  windows: { start: number; end: number }[],
  blockStart: number,
  blockEnd: number
): { start: number; end: number }[] {
  const result: { start: number; end: number }[] = [];
  for (const w of windows) {
    const ws = w.start;
    const we = w.end;
    if (blockEnd <= ws || blockStart >= we) {
      result.push(w);
    } else {
      if (blockStart > ws) {
        result.push({ start: ws, end: Math.min(blockStart, we) });
      }
      if (blockEnd < we) {
        result.push({ start: Math.max(blockEnd, ws), end: we });
      }
    }
  }
  return result;
}

function mergeWindows(
  windows: { start: number; end: number }[]
): { start: number; end: number }[] {
  if (windows.length === 0) return [];
  const sorted = [...windows].sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = sorted[i].end > last.end ? sorted[i].end : last.end;
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

// Verify a requested [slotStart, slotEnd] fits within the employee's active
// availability windows for the given date (honoring overrides).
async function isSlotWithinAvailability(
  employeeId: string,
  dateStr: string,
  slotStart: string,
  slotEnd: string
): Promise<boolean> {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  const jsDay = date.getUTCDay();
  const dbDay = jsDay === 0 ? 6 : jsDay - 1;

  const availability = await db.employeeAvailability.findMany({
    where: { employeeId, dayOfWeek: dbDay, isActive: true },
    orderBy: { startTime: "asc" },
  });
  if (availability.length === 0) return false;

  let windows = availability.map((a) => ({
    start: timeToMinutes(a.startTime),
    end: timeToMinutes(a.endTime),
  }));

  const dayStart = new Date(Date.UTC(year, month - 1, day));
  const overrides = await db.availabilityOverride.findMany({
    where: { employeeId, overrideDate: dayStart },
  });

  for (const override of overrides) {
    if (override.isBlocked) {
      if (!override.startTime) {
        windows = [];
        break;
      }
      windows = subtractTimeRange(
        windows,
        timeToMinutes(override.startTime),
        timeToMinutes(override.endTime || "23:59")
      );
    } else if (override.startTime && override.endTime) {
      windows.push({
        start: timeToMinutes(override.startTime),
        end: timeToMinutes(override.endTime),
      });
    }
  }

  if (windows.length === 0) return false;
  windows = mergeWindows(windows);

  const s = timeToMinutes(slotStart);
  const e = timeToMinutes(slotEnd);
  return windows.some((w) => s >= w.start && e <= w.end);
}

// ------------------------- GET -------------------------

export const GET = requireAuth(async (request: Request) => {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Staff may view all bookings; a regular customer sees only their own.
    if (session.role === "admin" || session.role === "employee") {
      const bookings = await getBookings();
      return NextResponse.json({ bookings });
    }

    const bookings = await db.booking.findMany({
      where: {
        OR: [{ userId: session.userId }, { email: session.email }],
      },
      include: { service: true, user: true, employee: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
});

// ------------------------- POST ------------------------

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();

    const {
      serviceId,
      serviceIds,
      employeeId,
      userId,
      date,
      slotStart,
      slotEnd,
      name,
      email,
      phone,
      notes,
      redemptionCode,
    } = body;

    // Support both single serviceId (legacy) and serviceIds array (multi-service)
    const resolvedServiceIds: string[] = serviceIds
      ? (Array.isArray(serviceIds) ? serviceIds : [serviceIds])
      : serviceId
        ? [serviceId]
        : [];

    if (
      resolvedServiceIds.length === 0 ||
      !employeeId ||
      !date ||
      !slotStart ||
      !slotEnd ||
      !name ||
      !email ||
      !phone
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Server-side validation: all services must exist and employee must offer each
    const services = await db.service.findMany({
      where: { id: { in: resolvedServiceIds } },
    });
    if (services.length !== resolvedServiceIds.length) {
      return NextResponse.json({ error: "One or more invalid service IDs" }, { status: 400 });
    }

    const assignments = await db.employeeService.findMany({
      where: { serviceId: { in: resolvedServiceIds }, employeeId },
    });
    const assignedServiceIds = new Set(assignments.map((a) => a.serviceId));
    const missing = resolvedServiceIds.filter((sid) => !assignedServiceIds.has(sid));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Selected specialist does not offer service(s): ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // WhatsApp verification check: unverified users cannot book
    const sessionUserId = (await getSessionFromRequest(request))?.userId;
    if (sessionUserId) {
      const bookingUser = await db.user.findUnique({
        where: { id: sessionUserId },
        select: { gender: true, emailVerified: true, role: true, whatsappNumber: true },
      });

      // Admins and employees can book regardless of verification status
      if (bookingUser && bookingUser.role === "user" && !bookingUser.emailVerified) {
        return NextResponse.json(
          { error: "Please verify your WhatsApp number before booking. Check your WhatsApp for the verification code." },
          { status: 403 }
        );
      }
      if (bookingUser?.gender) {
        const employee = await db.employee.findUnique({
          where: { id: employeeId },
          select: { gender: true },
        });
        if (employee && employee.gender && employee.gender !== bookingUser.gender) {
          return NextResponse.json(
            { error: "This specialist is not available for your booking" },
            { status: 403 }
          );
        }
      }

      // EDGE-02: Enforce restriction for same-day bookings.
      // Users with repeated no-shows have restrictedUntil set; they must
      // book at least 24 hours in advance — same-day bookings are blocked.
      const reliability = await db.userReliability.findUnique({
        where: { userId: sessionUserId },
      });
      if (reliability?.restrictedUntil && reliability.restrictedUntil > new Date()) {
        // Parse requested date and compare to today (UTC)
        const [reqYear, reqMonth, reqDay] = date.split("-").map(Number);
        const now = new Date();
        const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const requestedDateUTC = new Date(Date.UTC(reqYear, reqMonth - 1, reqDay));
        const isSameDay = requestedDateUTC.getTime() === todayUTC.getTime();
        if (isSameDay) {
          return NextResponse.json(
            { error: "Same-day booking temporarily restricted. Please book at least 24 hours ahead." },
            { status: 403 }
          );
        }
      }
    }

    // Reject past dates (compare as YYYY-MM-DD strings).
    const today = new Date();
    const todayKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
    if (typeof date !== "string" || date < todayKey) {
      return NextResponse.json(
        { error: "Booking date cannot be in the past" },
        { status: 400 }
      );
    }

    // Reject slots outside the employee's availability windows.
    const within = await isSlotWithinAvailability(employeeId, date, slotStart, slotEnd);
    if (!within) {
      return NextResponse.json(
        { error: "Selected time is outside the specialist's availability" },
        { status: 400 }
      );
    }

    const bookingDate = new Date(date);

    // Server-side price: compute total from all services (never trust client)
    const finalPrice = services.reduce((sum, s) => sum + s.price, 0);
    const postSession = await getSessionFromRequest(request);
    const postSessionUserId = postSession?.userId ?? null;

    // ─── EDGE-01: Race-condition-safe booking creation ───────────────────
    // Wrap conflict check + creation in a transaction with a Postgres
    // advisory lock keyed by employeeId. This serializes all booking
    // attempts for the same employee so two concurrent requests cannot
    // both pass the overlap check and create duplicate bookings.
    //
    // The partial unique index on (employeeId, slotStart) WHERE status IN
    // ('confirmed', 'pending') acts as a hard backstop if the lock is ever
    // bypassed — P2002 is caught below and translated to a clean 409.
    try {
      const result = await db.$transaction(async (tx) => {
        // Lock scoped to this employee — serializes all booking attempts
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${employeeId}))`;

        // Re-check for overlap inside the lock
        const dayStart = new Date(bookingDate);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(bookingDate);
        dayEnd.setUTCHours(23, 59, 59, 999);

        const overlapping = await tx.booking.findFirst({
          where: {
            employeeId,
            date: { gte: dayStart, lte: dayEnd },
            status: { in: ["confirmed", "pending"] },
            slotStart: { not: null },
            slotEnd: { not: null },
          },
        });

        if (overlapping && overlapping.slotStart && overlapping.slotEnd) {
          if (
            timeToMinutes(slotStart) < timeToMinutes(overlapping.slotEnd) &&
            timeToMinutes(overlapping.slotStart) < timeToMinutes(slotEnd)
          ) {
            throw new Error("CONFLICT");
          }
        }

        let bookingPrice = finalPrice;
        let discountInfo: { amount: number; redemptionId: string } | undefined;

        // Handle redemption inside the same locked transaction
        if (redemptionCode && postSessionUserId) {
          const { discountedPrice, discountAmount: disc, redemptionId } =
            await applyRedemptionToBooking(tx, postSessionUserId, redemptionCode, finalPrice);
          bookingPrice = discountedPrice;
          if (disc > 0 && redemptionId) {
            discountInfo = { amount: disc, redemptionId };
          }
        }

        const booking = await tx.booking.create({
          data: {
            serviceId: resolvedServiceIds[0] || null,
            employeeId,
            userId: userId || null,
            date: bookingDate,
            timeSlot: slotStart,
            slotStart: slotStart || null,
            slotEnd: slotEnd || null,
            name,
            email,
            phone,
            notes: notes || null,
            price: bookingPrice,
          },
        });

        // Create BookingService junction rows for multi-service bookings
        if (resolvedServiceIds.length > 1) {
          for (let i = 0; i < resolvedServiceIds.length; i++) {
            await tx.bookingService.create({
              data: { bookingId: booking.id, serviceId: resolvedServiceIds[i], position: i },
            });
          }
        }

        // Link redemption to booking if applicable
        if (redemptionCode && postSessionUserId && discountInfo) {
          await linkRedemptionToBooking(tx, discountInfo.redemptionId, booking.id);
        }

        return { booking, discount: discountInfo };
      });

      return NextResponse.json({
        booking: result.booking,
        discount: result.discount,
      }, { status: 201 });
    } catch (err) {
      // Translate advisory-lock conflict into clean 409
      if (err instanceof Error && err.message === "CONFLICT") {
        return NextResponse.json(
          { error: "This slot was just taken. Please pick another." },
          { status: 409 }
        );
      }
      // Translate partial-unique-index violation (P2002) into clean 409
      const prismaErr = err as { code?: string; meta?: { target?: string[] } };
      if (prismaErr.code === "P2002") {
        return NextResponse.json(
          { error: "This slot was just taken. Please pick another." },
          { status: 409 }
        );
      }
      // Handle redemption-specific errors
      if (redemptionCode) {
        const message = err instanceof Error ? err.message : "Failed to apply redemption";
        return NextResponse.json({ error: message }, { status: 400 });
      }
      throw err;
    }
  } catch (error) {
    console.error("Failed to create booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
});

// ------------------------- PATCH -----------------------

export const PATCH = requireAuth(async (request: Request, context) => {
  const { id } = await context!.params!;

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const booking = await db.booking.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Authorization: staff may modify any booking; a customer may only modify
    // their own (matched by userId or email).
    const isStaff = session.role === "admin" || session.role === "employee";
    const isOwner =
      (booking.userId != null && booking.userId === session.userId) ||
      booking.email === session.email;
    if (!isStaff && !isOwner) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { status, rating, review } = body;

    // Handle status updates
    if (status) {
      if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status. Must be one of: pending, confirmed, completed, cancelled" },
          { status: 400 }
        );
      }
      const updated = await db.booking.update({ where: { id }, data: { status } });

      // Audit log for admin status changes
      if (session.role === "admin" || session.role === "employee") {
        logAudit({
          action: `booking_${status}`,
          entityType: "booking",
          entityId: id,
          adminId: session.userId,
          adminName: session.email,
          details: `Booking status changed to ${status}`,
          ip: getClientIp(request),
        });
      }

      return NextResponse.json({ booking: updated });
    }

    // Handle rating/review updates
    if (rating !== undefined) {
      const numRating = Number(rating);
      if (isNaN(numRating) || numRating < 0 || numRating > 5) {
        return NextResponse.json(
          { error: "Invalid rating. Must be between 0 and 5" },
          { status: 400 }
        );
      }

      const updated = await db.booking.update({
        where: { id },
        data: {
          rating: Math.round(numRating * 10) / 10,
          review: review ?? null,
        },
      });
      return NextResponse.json({ booking: updated });
    }

    return NextResponse.json(
      { error: "Nothing to update. Provide status, rating, or review." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to update booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
});
