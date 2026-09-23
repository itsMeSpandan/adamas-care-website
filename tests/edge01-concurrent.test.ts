/**
 * EDGE-01 concurrent booking test — fires two simultaneous booking
 * requests for the same employee+slot against the real NeonDB.
 *
 * Verifies that the advisory lock serializes them: exactly one succeeds,
 * the other gets a clean conflict response.
 *
 * Uses a live Prisma client (not mocked) against the seeded database.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Use a unique test user to avoid collisions with seeded data
const TEST_USER_ID = "edge01-test-user";
const TEST_EMPLOYEE_ID = "priya-sharma";
const TEST_SLOT_START = "10:00";
const TEST_SLOT_END = "11:00";
const TEST_DATE = new Date("2027-03-15"); // Far future to avoid existing bookings

// Minimal simulation of the booking-creation logic with advisory lock.
// Mirrors the code in app/api/bookings/route.ts POST handler.
async function tryBook(client: PrismaClient, label: string): Promise<{ success: boolean; error?: string }> {
  try {
    await client.$transaction(async (tx) => {
      // Lock scoped to this employee — serializes all booking attempts
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${TEST_EMPLOYEE_ID}))`;

      // Check for overlap
      const overlapping = await tx.booking.findFirst({
        where: {
          employeeId: TEST_EMPLOYEE_ID,
          date: { gte: TEST_DATE, lte: new Date("2027-03-15T23:59:59.999Z") },
          status: { in: ["confirmed", "pending"] },
          slotStart: { not: null },
          slotEnd: { not: null },
        },
      });

      if (overlapping) {
        throw new Error("CONFLICT");
      }

      // Create booking (userId=null to avoid FK constraint on test users)
      await tx.booking.create({
        data: {
          employeeId: TEST_EMPLOYEE_ID,
          userId: null,
          date: TEST_DATE,
          timeSlot: TEST_SLOT_START,
          slotStart: TEST_SLOT_START,
          slotEnd: TEST_SLOT_END,
          name: `Edge-01 Test (${label})`,
          email: "edge01@test.com",
          phone: "+91 00000 00000",
          status: "confirmed",
          price: 100,
        },
      });
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

describe("EDGE-01: Concurrent booking race condition (real DB)", () => {
  beforeAll(async () => {
    // Clean up any previous test data
    await prisma.booking.deleteMany({
      where: { email: "edge01@test.com" },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.booking.deleteMany({
      where: { email: "edge01@test.com" },
    });
    await prisma.$disconnect();
  });

  it("exactly one of two concurrent bookings succeeds", async () => {
    // Fire two concurrent transactions using the same advisory lock pattern
    const [resultA, resultB] = await Promise.all([
      tryBook(prisma, "user-a"),
      tryBook(prisma, "user-b"),
    ]);

    console.log("Result A:", JSON.stringify(resultA));
    console.log("Result B:", JSON.stringify(resultB));

    const successCount = [resultA, resultB].filter((r) => r.success).length;
    const conflictCount = [resultA, resultB].filter((r) => !r.success && r.error === "CONFLICT").length;

    // Exactly one must succeed
    expect(successCount).toBe(1);
    // The other must get a conflict (or potentially also succeed if the
    // advisory lock wasn't effective — in which case the unique index
    // catches it as P2002)
    expect(successCount + conflictCount).toBe(2);
  });

  it("only one CONFIRMED booking exists for the slot in the DB", async () => {
    // Verify directly in the DB
    const bookings = await prisma.booking.findMany({
      where: {
        employeeId: TEST_EMPLOYEE_ID,
        date: TEST_DATE,
        slotStart: TEST_SLOT_START,
        email: "edge01@test.com",
      },
    });

    // Filter to active bookings only
    const activeBookings = bookings.filter(
      (b) => b.status === "confirmed" || b.status === "pending"
    );

    expect(activeBookings.length).toBe(1);
    expect(activeBookings[0].slotStart).toBe(TEST_SLOT_START);
    expect(activeBookings[0].slotEnd).toBe(TEST_SLOT_END);
  });
});
