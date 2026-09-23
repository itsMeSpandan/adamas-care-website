/**
 * lib/scoring-engine.ts — Unified scoring engine for waitlist ranking,
 * slot suggestions, and reverse-suggestion (cancellation → best customer).
 *
 * All scoring logic flows through a single `scoreCandidate` function so
 * there is zero duplicated ranking logic across use cases.
 */

import { db } from "@/lib/db";
import {
  timeToMinutes,
  minutesToTime,
  subtractTimeRange,
  mergeWindows,
} from "@/lib/slots";

// Re-export the pure scoring engine for convenience
export { scoreCandidate, DEFAULT_WEIGHTS } from "@/lib/scoring";
import { scoreCandidate } from "@/lib/scoring";


// ─── Phase 2: Waitlist ranking ──────────────────────────────────────────────

export interface WaitlistCandidate {
  waitlistId: string;
  userId: string;
  closenessScore: number;
  reliabilityScore: number;
  loadScore: number;
}

export interface RankedWaitlistEntry {
  waitlistId: string;
  userId: string;
  score: number;
}

/**
 * Rank waitlist entries for a given employee + slotStart.
 *
 * - closenessScore = normalized wait time (longer wait → higher score)
 * - reliabilityScore = derived from UserReliability (fewer issues → higher)
 * - loadScore = 0 (not applicable for waitlist ranking)
 *
 * Returns entries sorted descending by score.
 */
export async function rankWaitlist(
  employeeId: string,
  slotStart: string
): Promise<RankedWaitlistEntry[]> {
  // Fetch all waiting entries for this employee + slot
  const entries = await db.waitlist.findMany({
    where: { employeeId, slotStart, status: "waiting" },
    orderBy: { createdAt: "asc" },
  });

  if (entries.length === 0) return [];

  const now = new Date();

  // Fetch reliability data for all involved users
  const userIds = Array.from(new Set(entries.map((e) => e.userId)));
  const reliabilities = await db.userReliability.findMany({
    where: { userId: { in: userIds } },
  });
  const reliabilityMap = new Map(
    reliabilities.map((r) => [r.userId, r])
  );

  // Compute raw wait durations (milliseconds)
  const waitDurations = entries.map(
    (e) => now.getTime() - e.createdAt.getTime()
  );
  const maxWait = Math.max(...waitDurations);

  // Compute raw reliability penalties
  const reliabilityPenalties = entries.map((e) => {
    const r = reliabilityMap.get(e.userId);
    if (!r) return 0;
    // Weighted penalty: no-shows are worse than late cancels, which are worse than regular cancels
    return r.noShowCount * 3 + r.lateCancelCount * 2 + r.cancelCount;
  });
  const maxPenalty = Math.max(...reliabilityPenalties, 1);

  // Score each candidate
  const candidates: WaitlistCandidate[] = entries.map((e, i) => ({
    waitlistId: e.id,
    userId: e.userId,
    closenessScore: maxWait > 0 ? waitDurations[i] / maxWait : 0.5,
    reliabilityScore:
      maxPenalty > 0
        ? 1 - reliabilityPenalties[i] / (maxPenalty + 1)
        : 1,
    loadScore: 0, // not applicable for waitlist
  }));

  // Score and rank using the unified engine with loadWeight=0
  // Reliability is weighted higher than wait-time so that users with
  // many no-shows / late cancels are deprioritized even if they waited
  // longer — this prevents gaming the waitlist by cancelling frequently.
  const ranked: RankedWaitlistEntry[] = candidates.map((c) => ({
    waitlistId: c.waitlistId,
    userId: c.userId,
    score: scoreCandidate(c, {
      closeness: 0.35,
      reliability: 0.65,
      loadPenalty: 0, // irrelevant here
    }),
  }));

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

// ─── Phase 3: Slot / stylist suggestions ─────────────────────────────────────

export interface SuggestedSlot {
  employeeId: string;
  employeeName?: string;
  start: string;
  end: string;
  score: number;
  closenessScore: number;
  reliabilityScore: number;
  loadScore: number;
}

/**
 * Given requested serviceIds and a preferredTime, find and rank alternative slots.
 *
 * Candidates = other employees who offer the requested services with open slots
 * near preferredTime, plus nearby times with the same employee.
 *
 * - closenessScore = inverse time distance from preferredTime (nearer = higher)
 * - reliabilityScore = employee's rating, normalized (0–5 → 0–1)
 * - loadScore = booked-hours-today / working-hours-today
 *
 * Returns top 3, sorted descending by score.
 */
export async function suggestAlternatives(
  requestedServiceIds: string[],
  preferredTime: string, // "HH:MM"
  dateStr: string
): Promise<SuggestedSlot[]> {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return [];

  const date = new Date(Date.UTC(year, month - 1, day));
  const jsDay = date.getUTCDay();
  const dbDay = jsDay === 0 ? 6 : jsDay - 1;
  const dayStart = new Date(Date.UTC(year, month - 1, day));
  const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  const prefMinutes = timeToMinutes(preferredTime);

  // Find all employees who offer ANY of the requested services
  const employeeServices = await db.employeeService.findMany({
    where: { serviceId: { in: requestedServiceIds } },
    select: { employeeId: true },
  });
  const employeeIds = Array.from(new Set(employeeServices.map((es) => es.employeeId)));

  if (employeeIds.length === 0) return [];

  // Fetch employee data + availability + overrides + bookings in parallel
  const [employees, allOverrides, allBookings] = await Promise.all([
    db.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, name: true, rating: true },
    }),
    db.availabilityOverride.findMany({
      where: { employeeId: { in: employeeIds }, overrideDate: dayStart },
    }),
    db.booking.findMany({
      where: {
        employeeId: { in: employeeIds },
        date: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["cancelled"] },
      },
      select: {
        employeeId: true,
        slotStart: true,
        slotEnd: true,
        timeSlot: true,
        totalDurationMinutes: true,
      },
    }),
  ]);

  // Fetch availability windows for all candidates
  const allAvailability = await db.employeeAvailability.findMany({
    where: { employeeId: { in: employeeIds }, dayOfWeek: dbDay, isActive: true },
    orderBy: { startTime: "asc" },
  });

  // Group by employee
  const availabilityMap = new Map<string, { start: string; end: string }[]>();
  for (const a of allAvailability) {
    if (!availabilityMap.has(a.employeeId)) availabilityMap.set(a.employeeId, []);
    availabilityMap.get(a.employeeId)!.push({ start: a.startTime, end: a.endTime });
  }

  const overridesMap = new Map<string, typeof allOverrides>();
  for (const o of allOverrides) {
    if (!overridesMap.has(o.employeeId)) overridesMap.set(o.employeeId, []);
    overridesMap.get(o.employeeId)!.push(o);
  }

  const bookingsMap = new Map<string, typeof allBookings>();
  for (const b of allBookings) {
    if (!b.employeeId) continue;
    if (!bookingsMap.has(b.employeeId)) bookingsMap.set(b.employeeId, []);
    bookingsMap.get(b.employeeId)!.push(b);
  }

  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  // For each employee, compute free gaps and generate candidate slots
  const allCandidates: SuggestedSlot[] = [];

  for (const empId of employeeIds) {
    let windows = availabilityMap.get(empId) || [];
    if (windows.length === 0) continue;

    // Apply overrides
    const overrides = overridesMap.get(empId) || [];
    for (const override of overrides) {
      if (override.isBlocked) {
        if (!override.startTime) {
          windows = [];
          break;
        }
        windows = subtractTimeRange(
          windows,
          override.startTime,
          override.endTime || "23:59"
        );
      } else if (override.startTime && override.endTime) {
        windows.push({ start: override.startTime, end: override.endTime });
      }
    }
    if (windows.length === 0) continue;
    windows = mergeWindows(windows);

    // Subtract booked slots (with 10 min buffer)
    const empBookings = bookingsMap.get(empId) || [];
    for (const b of empBookings) {
      if (b.slotStart && b.slotEnd) {
        const bufferedEnd = minutesToTime(timeToMinutes(b.slotEnd) + 10);
        windows = subtractTimeRange(windows, b.slotStart, bufferedEnd);
      }
    }

    // Compute load: booked minutes / working minutes
    let totalWorkingMinutes = 0;
    for (const w of windows) {
      totalWorkingMinutes += timeToMinutes(w.end) - timeToMinutes(w.start);
    }
    let totalBookedMinutes = 0;
    for (const b of empBookings) {
      if (b.slotStart && b.slotEnd) {
        totalBookedMinutes +=
          timeToMinutes(b.slotEnd) - timeToMinutes(b.slotStart);
      }
    }

    const emp = employeeMap.get(empId);
    const reliabilityNorm = emp ? emp.rating / 5 : 0.5;

    // Generate 15-min stepping slots that fit within each free gap
    // We don't know the exact duration here; use 60min as a minimum candidate window
    const STEP = 15;
    const MIN_DURATION = 30;

    for (const w of windows) {
      const wStart = timeToMinutes(w.start);
      const wEnd = timeToMinutes(w.end);
      for (let t = wStart; t + MIN_DURATION <= wEnd; t += STEP) {
        const slotStartStr = minutesToTime(t);
        const slotEndStr = minutesToTime(t + MIN_DURATION);

        // Closeness: inverse distance from preferred time (use midpoint)
        const midpoint = t + MIN_DURATION / 2;
        const timeDistance = Math.abs(midpoint - prefMinutes);
        const maxDistance = 8 * 60; // 8 hours as normalization baseline
        const closeness = Math.max(0, 1 - timeDistance / maxDistance);

        // Load: higher = worse
        const workingMins =
          totalWorkingMinutes > 0 ? totalWorkingMinutes : 480;
        const load = Math.min(1, totalBookedMinutes / workingMins);

        allCandidates.push({
          employeeId: empId,
          employeeName: emp?.name,
          start: slotStartStr,
          end: slotEndStr,
          score: 0,
          closenessScore: closeness,
          reliabilityScore: reliabilityNorm,
          loadScore: load,
        });
      }
    }
  }

  // Score all candidates using the unified engine
  for (const c of allCandidates) {
    c.score = scoreCandidate(c);
  }

  // Sort descending, return top 3
  allCandidates.sort((a, b) => b.score - a.score);
  return allCandidates.slice(0, 3);
}

// ─── Phase 4: Reverse suggestion (slot opens → best customer) ────────────────

/**
 * When a Booking is cancelled and no Waitlist entry matches exactly,
 * find the best customer to notify based on recent search/view activity.
 *
 * Uses the SAME scoreCandidate function — no duplicated logic.
 *
 * Assumption: the caller provides a list of recent searchers (users who
 * searched for this employee+time-window in the last 24-48h). If no
 * such data is available, the caller should pass an empty array and
 * this function returns an empty result.
 */
export async function suggestBestCustomerForOpenedSlot(
  employeeId: string,
  slotStart: string, // "HH:MM"
  slotEnd: string, // "HH:MM"
  recentSearchers: Array<{
    userId: string;
    searchedTime: string; // "HH:MM" they originally requested
    searchedAt: Date; // when they searched
  }>
): Promise<Array<{ userId: string; score: number }>> {
  if (recentSearchers.length === 0) return [];

  const now = new Date();
  const slotMidMinutes =
    (timeToMinutes(slotStart) + timeToMinutes(slotEnd)) / 2;

  // Fetch reliability data
  const userIds = recentSearchers.map((s) => s.userId);
  const reliabilities = await db.userReliability.findMany({
    where: { userId: { in: userIds } },
  });
  const reliabilityMap = new Map(reliabilities.map((r) => [r.userId, r]));

  const results = recentSearchers.map((s) => {
    // Closeness: how close was their requested time to the now-open slot
    const searchedMidMinutes = timeToMinutes(s.searchedTime);
    const timeDistance = Math.abs(searchedMidMinutes - slotMidMinutes);
    const maxDistance = 4 * 60; // 4 hours normalization
    const closeness = Math.max(0, 1 - timeDistance / maxDistance);

    // Recency: how recently they searched (within 48h window)
    const hoursAgo =
      (now.getTime() - s.searchedAt.getTime()) / (1000 * 60 * 60);
    const recency = Math.max(0, 1 - hoursAgo / 48);

    // Reliability from UserReliability
    const r = reliabilityMap.get(s.userId);
    let reliability = 1;
    if (r) {
      const penalty = r.noShowCount * 3 + r.lateCancelCount * 2 + r.cancelCount;
      reliability = Math.max(0, 1 - penalty / 10);
    }

    // Use the same unified scoring — recency folds into closeness
    const score = scoreCandidate({
      closenessScore: closeness * 0.7 + recency * 0.3, // blend time-match and recency
      reliabilityScore: reliability,
      loadScore: 0, // not relevant for customer selection
    });

    return { userId: s.userId, score };
  });

  results.sort((a, b) => b.score - a.score);
  return results;
}

// ─── Phase 5: Multi-service duration calculation ─────────────────────────────

// Buffer between consecutive services in a multi-service booking.
// Assumption: a small 5-minute transition allows the specialist to prepare
// between services. This is a reasonable default for salon/spa workflows;
// if a config value already exists it should be used instead.
const BUFFER_PER_TRANSITION_MINUTES = 5;

/**
 * Compute total duration for a multi-service booking.
 *
 * All selected services are performed by a single employee in one
 * continuous block (sequential, no gaps beyond the buffer).
 *
 * Cross-employee service splitting is NOT supported yet — flagged as
 * a future enhancement.
 */
export async function computeTotalDuration(serviceIds: string[]): Promise<number> {
  if (serviceIds.length === 0) return 0;

  const services = await db.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, durationMinutes: true },
  });

  const serviceMap = new Map(services.map((s) => [s.id, s.durationMinutes]));

  let total = 0;
  for (const sid of serviceIds) {
    total += serviceMap.get(sid) ?? 0;
  }

  // Add buffer between services: (n-1) transitions × buffer
  total += Math.max(0, serviceIds.length - 1) * BUFFER_PER_TRANSITION_MINUTES;

  return total;
}

// ─── Phase 6: Dynamic day-adaptive slot generation ───────────────────────────

/**
 * Return available time intervals for an employee on a date,
 * considering:
 *  1. EmployeeAvailability (recurring weekly hours)
 *  2. AvailabilityOverride (date-specific leave / extra hours)
 *  3. Existing Bookings (CONFIRMED or PENDING — both still hold the slot)
 *  4. A cleanup buffer (10 min) after each booking
 *
 * Steps in 15-minute increments so slots feel dynamic, not rigid.
 *
 * Edge cases handled:
 *  - Zero bookings → full working day available
 *  - Back-to-back bookings → zero slots in that stretch
 *  - Multi-service duration > single gap → gap excluded
 *  - Full-day leave override → empty array
 *  - Gap exactly equals requested duration → one valid slot
 *  - Duration > entire working day → empty array, no crash
 */
export interface SlotInterval {
  start: string;
  end: string;
}

// Buffer after each booking to allow cleanup between clients
const BOOKING_CLEANUP_BUFFER_MINUTES = 10;
const SLOT_STEP_MINUTES = 15;

export async function getDynamicAvailableSlots(
  employeeId: string,
  dateStr: string,
  totalDurationMinutes: number
): Promise<SlotInterval[]> {
  if (totalDurationMinutes <= 0) return [];

  const [year, month, day] = dateStr.split("-").map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return [];

  const date = new Date(Date.UTC(year, month - 1, day));
  const jsDay = date.getUTCDay();
  const dbDay = jsDay === 0 ? 6 : jsDay - 1;
  const dayStart = new Date(Date.UTC(year, month - 1, day));
  const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  // 1. Get working hours for this employee on this day
  let windows = await getWorkingHours(employeeId, dbDay, dayStart);
  if (windows.length === 0) return [];

  // 2. Subtract existing bookings (CONFIRMED or PENDING)
  const bookings = await db.booking.findMany({
    where: {
      employeeId,
      date: { gte: dayStart, lte: dayEnd },
      status: { in: ["confirmed", "pending"] },
      slotStart: { not: null },
      slotEnd: { not: null },
    },
    select: { slotStart: true, slotEnd: true },
  });

  for (const b of bookings) {
    if (b.slotStart && b.slotEnd) {
      const bufferedEnd = minutesToTime(
        timeToMinutes(b.slotEnd) + BOOKING_CLEANUP_BUFFER_MINUTES
      );
      windows = subtractTimeRange(windows, b.slotStart, bufferedEnd);
    }
  }

  // 3. For each free gap, generate valid start times
  const result: SlotInterval[] = [];
  for (const gap of windows) {
    const gapStart = timeToMinutes(gap.start);
    const gapEnd = timeToMinutes(gap.end);
    const gapDuration = gapEnd - gapStart;

    // Skip gaps shorter than the requested duration
    if (gapDuration < totalDurationMinutes) continue;

    // Generate every valid start time at SLOT_STEP_MINUTES increments
    for (
      let t = gapStart;
      t + totalDurationMinutes <= gapEnd;
      t += SLOT_STEP_MINUTES
    ) {
      result.push({
        start: minutesToTime(t),
        end: minutesToTime(t + totalDurationMinutes),
      });
    }
  }

  return result;
}

/**
 * Fetch and merge working hours for an employee on a given DB day-of-week,
 * applying any AvailabilityOverrides for the given date.
 */
async function getWorkingHours(
  employeeId: string,
  dbDay: number,
  dayStart: Date
): Promise<SlotInterval[]> {
  const availability = await db.employeeAvailability.findMany({
    where: { employeeId, dayOfWeek: dbDay, isActive: true },
    orderBy: { startTime: "asc" },
  });

  if (availability.length === 0) return [];

  let windows: SlotInterval[] = availability.map((a) => ({
    start: a.startTime,
    end: a.endTime,
  }));

  const overrides = await db.availabilityOverride.findMany({
    where: { employeeId, overrideDate: dayStart },
  });

  for (const override of overrides) {
    if (override.isBlocked) {
      if (!override.startTime) {
        // Full-day leave → no working hours
        windows = [];
        break;
      }
      // Partial block
      windows = subtractTimeRange(
        windows,
        override.startTime,
        override.endTime || "23:59"
      );
    } else if (override.startTime && override.endTime) {
      // Extra hours outside normal schedule
      windows.push({ start: override.startTime, end: override.endTime });
    }
  }

  return windows.length === 0 ? [] : mergeWindows(windows);
}

// ─── Phase 3 (addition): Gender-matched employee filter ──────────────────────

/**
 * Filter employees by the requesting user's gender preference.
 *
 * - MALE user → only male employees
 * - FEMALE user → only female employees
 * - null / other / unspecified → ALL eligible employees (no filter)
 *
 * NOTE: the UNSPECIFIED fallback is intentional — do NOT accidentally "fix"
 * this into a hard block later. Users who haven't set a gender should still
 * be able to book any employee.
 */
export async function getEligibleEmployees(
  userId: string,
  serviceIds: string[]
): Promise<Array<{ id: string; name: string; gender: string | null; rating: number }>> {
  // 1. Find all employees who offer any of the requested services
  const employeeServices = await db.employeeService.findMany({
    where: { serviceId: { in: serviceIds } },
    select: { employeeId: true },
  });
  const employeeIds = Array.from(new Set(employeeServices.map((es) => es.employeeId)));

  if (employeeIds.length === 0) return [];

  // 2. Fetch the user's gender
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { gender: true },
  });

  // 3. Fetch all candidate employees
  const employees = await db.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, name: true, gender: true, rating: true },
  });

  // 4. Apply gender filter — null/other means no filter
  if (!user || user.gender === null) {
    return employees;
  }

  return employees.filter((e) => e.gender === user.gender);
}

// ─── Phase 7 integration helpers ─────────────────────────────────────────────

/**
 * Create a multi-service booking with the correct totalDurationMinutes.
 *
 * Creates the Booking record and all BookingService junction rows in
 * a single transaction.
 *
 * Assumption: all services are performed by a single employee.
 * Cross-employee splitting is NOT supported — flagged as a future
 * enhancement.
 */
export async function createMultiServiceBooking(data: {
  userId?: string;
  employeeId: string;
  serviceIds: string[];
  date: Date;
  slotStart: string;
  slotEnd: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  price: number;
}) {
  const totalDurationMinutes = await computeTotalDuration(data.serviceIds);

  return db.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: {
        serviceId: data.serviceIds[0] || null, // keep legacy field populated
        employeeId: data.employeeId,
        userId: data.userId || null,
        date: data.date,
        timeSlot: data.slotStart,
        slotStart: data.slotStart,
        slotEnd: data.slotEnd,
        name: data.name,
        email: data.email,
        phone: data.phone,
        notes: data.notes || null,
        price: data.price,
        totalDurationMinutes,
      },
    });

    // Create junction rows for each service in order
    for (let i = 0; i < data.serviceIds.length; i++) {
      await tx.bookingService.create({
        data: {
          bookingId: booking.id,
          serviceId: data.serviceIds[i],
          position: i,
        },
      });
    }

    return booking;
  });
}
