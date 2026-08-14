/**
 * Seed script: Test user with multiple bookings + loyalty data
 *
 * Usage: npx tsx scripts/seed-test-user.ts
 *
 * Creates:
 *   - A test user (test@adamascare.com / testpassword123)
 *   - 6 bookings with various statuses (completed, confirmed, pending, cancelled)
 *   - Loyalty transactions for completed bookings
 *   - Loyalty rewards for redemption testing
 *   - A couple of reward redemptions
 *
 * Safe to run multiple times — skips if user already exists.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

import { bcrypt as wasmBcrypt } from "hash-wasm";

async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  globalThis.crypto.getRandomValues(salt);
  return wasmBcrypt({
    password: password.normalize("NFKC"),
    salt,
    costFactor: 12,
    outputType: "encoded",
  });
}

// ── Config ───────────────────────────────────────────────────────────────────

const TEST_USER = {
  name: "Test Customer",
  email: "test@adamascare.com",
  password: "testpassword123",
  role: "user" as const,
  avatarUrl: "/avatars/test-customer.jpg",
};

// Loyalty points rate: 1 point per 10 currency units spent
const POINTS_PER_100_SPENT = 10;

function calculatePoints(price: number): number {
  return Math.floor((price / 100) * POINTS_PER_100_SPENT);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function seedTestUser() {
  console.log("🧪 Seeding test user with bookings and loyalty data...\n");

  // ── 1. Check for existing data ───────────────────────────────────────────

  const existingUser = await prisma.user.findUnique({
    where: { email: TEST_USER.email },
  });

  if (existingUser) {
    console.log(`⚠️  User "${TEST_USER.email}" already exists (id: ${existingUser.id}).`);
    console.log("   Skipping user creation. Checking bookings...\n");

    const existingBookings = await prisma.booking.findMany({
      where: { userId: existingUser.id },
    });

    if (existingBookings.length > 0) {
      console.log(`   User already has ${existingBookings.length} bookings. Nothing to do.`);
      await prisma.$disconnect();
      return;
    }
  }

  // ── 2. Get services and employees ────────────────────────────────────────

  const services = await prisma.service.findMany({
    select: { id: true, name: true, price: true, durationMinutes: true },
  });

  const employees = await prisma.employee.findMany({
    select: { id: true, name: true },
  });

  if (services.length === 0) {
    console.error("❌ No services found. Run the main seed first.");
    await prisma.$disconnect();
    process.exit(1);
  }

  if (employees.length === 0) {
    console.error("❌ No employees found. Run the main seed first.");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`   Found ${services.length} services and ${employees.length} employees.`);

  // ── 3. Create the test user ──────────────────────────────────────────────

  let user;
  if (existingUser) {
    user = existingUser;
    console.log(`\n👤 Using existing user: ${user.email} (${user.id})`);
  } else {
    // Use hash-wasm bcrypt — same as the login endpoint's comparePassword
    const hashedPassword = await hashPassword(TEST_USER.password);

    user = await prisma.user.create({
      data: {
        name: TEST_USER.name,
        email: TEST_USER.email,
        password: hashedPassword,
        role: TEST_USER.role,
        avatarUrl: TEST_USER.avatarUrl,
        loyaltyPoints: 0,
      },
    });
    console.log(`\n👤 Created user: ${user.email} (${user.id})`);
  }

  // ── 4. Create bookings ───────────────────────────────────────────────────

  // Dates spread across past months for realism
  const now = new Date();
  const bookingsData = [
    {
      service: services[0], // Precision Haircut ($85)
      employee: employees[0],
      date: new Date(now.getFullYear(), now.getMonth() - 3, 15),
      timeSlot: "10:00 AM",
      status: "completed" as const,
      phone: "9876543210",
      notes: "Regular haircut appointment",
    },
    {
      service: services[2], // Hydra Facial ($150)
      employee: employees[1],
      date: new Date(now.getFullYear(), now.getMonth() - 2, 8),
      timeSlot: "2:00 PM",
      status: "completed" as const,
      phone: "9876543210",
      notes: "First facial treatment",
    },
    {
      service: services[6], // Deep Tissue Massage ($130)
      employee: employees[2],
      date: new Date(now.getFullYear(), now.getMonth() - 1, 20),
      timeSlot: "11:00 AM",
      status: "completed" as const,
      phone: "9876543210",
      notes: "Back pain relief",
    },
    {
      service: services[4], // Gel Manicure ($55)
      employee: employees[3],
      date: new Date(now.getFullYear(), now.getMonth() - 1, 5),
      timeSlot: "3:30 PM",
      status: "completed" as const,
      phone: "9876543210",
      notes: null,
    },
    {
      service: services[1], // Color & Gloss Treatment ($180)
      employee: employees[0],
      date: new Date(now.getFullYear(), now.getMonth(), 10),
      timeSlot: "1:00 PM",
      status: "confirmed" as const,
      phone: "9876543210",
      notes: "Color touch-up",
    },
    {
      service: services[8], // Bridal Glam Package ($450)
      employee: employees[4],
      date: new Date(now.getFullYear(), now.getMonth() + 1, 5),
      timeSlot: "9:00 AM",
      status: "pending" as const,
      phone: "9876543210",
      notes: "Trial run before the wedding",
    },
  ];

  const createdBookings: Array<{ id: string; price: number; status: string; serviceName: string }> = [];
  let totalPoints = 0;

  for (const b of bookingsData) {
    // Check if booking already exists (same user + date + time)
    const existing = await prisma.booking.findFirst({
      where: {
        userId: user.id,
        date: b.date,
        timeSlot: b.timeSlot,
      },
    });

    if (existing) {
      console.log(`   ⏭️  Booking already exists: ${b.service.name} on ${b.date.toISOString().split("T")[0]} (${b.status})`);
      createdBookings.push({ id: existing.id, price: existing.price, status: existing.status, serviceName: b.service.name });
      continue;
    }

    const booking = await prisma.booking.create({
      data: {
        serviceId: b.service.id,
        employeeId: b.employee.id,
        userId: user.id,
        date: b.date,
        timeSlot: b.timeSlot,
        name: user.name,
        email: user.email,
        phone: b.phone,
        notes: b.notes,
        status: b.status,
        price: b.service.price,
      },
    });

    createdBookings.push({ id: booking.id, price: booking.price, status: booking.status, serviceName: b.service.name });
    console.log(`   ✅ Booking: ${b.service.name} ($${b.service.price}) — ${b.status} — ${b.date.toISOString().split("T")[0]}`);

    // Award loyalty points for completed bookings
    if (b.status === "completed") {
      const points = calculatePoints(b.service.price);
      totalPoints += points;

      // Check for existing transaction
      const existingTx = await prisma.loyaltyTransaction.findFirst({
        where: { bookingId: booking.id, type: "earn" },
      });

      if (!existingTx) {
        await prisma.loyaltyTransaction.create({
          data: {
            userId: user.id,
            type: "earn",
            points: points,
            balanceAfter: totalPoints,
            bookingId: booking.id,
            note: `Earned from ${b.service.name} booking`,
          },
        });
      }
    }
  }

  // Update user's total loyalty points
  if (totalPoints > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { loyaltyPoints: totalPoints },
    });
    console.log(`\n💰 Total loyalty points awarded: ${totalPoints}`);
  }

  // ── 5. Create loyalty rewards ────────────────────────────────────────────

  const rewardsData = [
    {
      name: "10% Off Any Service",
      description: "Get 10% off any single service. Perfect for treating yourself!",
      pointsCost: 50,
      discountType: "percent",
      discountValue: 10,
      stock: null, // unlimited
    },
    {
      name: "₹200 Off Hair Services",
      description: "Save ₹200 on any hair service — haircut, color, or treatment.",
      pointsCost: 80,
      discountType: "fixed",
      discountValue: 200,
      serviceId: services[0].id, // Precision Haircut category
      stock: 20,
    },
    {
      name: "Free Gel Manicure",
      description: "Redeem for a complimentary gel manicure session.",
      pointsCost: 120,
      discountType: "free_service",
      discountValue: 0,
      serviceId: services[4].id, // Gel Manicure
      stock: 10,
    },
    {
      name: "25% Off Facial Treatment",
      description: "Get 25% off any facial — Hydra Facial or Anti-Aging.",
      pointsCost: 150,
      discountType: "percent",
      discountValue: 25,
      stock: 5,
    },
  ];

  const createdRewards: Array<{ id: string; name: string; pointsCost: number }> = [];

  for (const r of rewardsData) {
    const existing = await prisma.loyaltyReward.findFirst({
      where: { name: r.name },
    });

    if (existing) {
      console.log(`   ⏭️  Reward already exists: "${r.name}"`);
      createdRewards.push({ id: existing.id, name: existing.name, pointsCost: existing.pointsCost });
      continue;
    }

    const reward = await prisma.loyaltyReward.create({
      data: {
        name: r.name,
        description: r.description,
        pointsCost: r.pointsCost,
        discountType: r.discountType,
        discountValue: r.discountValue,
        serviceId: r.serviceId || null,
        stock: r.stock,
      },
    });

    createdRewards.push({ id: reward.id, name: reward.name, pointsCost: reward.pointsCost });
    console.log(`   🎁 Reward: "${r.name}" (${r.pointsCost} points)`);
  }

  // ── 6. Create a sample redemption (use some points) ──────────────────────

  if (createdRewards.length > 0 && totalPoints > 0) {
    const rewardToRedeem = createdRewards[0]; // "10% Off Any Service" (50 pts)
    const currentBalance = totalPoints;

    const existingRedemption = await prisma.rewardRedemption.findFirst({
      where: { userId: user.id, rewardId: rewardToRedeem.id, status: "active" },
    });

    if (!existingRedemption && currentBalance >= rewardToRedeem.pointsCost) {
      const code = `TEST-${Date.now().toString(36).toUpperCase()}`;

      // Create redemption first to get its ID
      const redemption = await prisma.rewardRedemption.create({
        data: {
          userId: user.id,
          rewardId: rewardToRedeem.id,
          pointsSpent: rewardToRedeem.pointsCost,
          status: "active",
          code,
          expiresAt: new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()),
        },
      });

      // Create redemption transaction linked to the redemption
      const newBalance = currentBalance - rewardToRedeem.pointsCost;
      const redeemTx = await prisma.loyaltyTransaction.create({
        data: {
          userId: user.id,
          type: "redeem",
          points: -rewardToRedeem.pointsCost,
          balanceAfter: newBalance,
          rewardRedemptionId: redemption.id,
          note: `Redeemed "${rewardToRedeem.name}"`,
        },
      });

      // Link the redemption back to the transaction via Prisma relation
      await prisma.rewardRedemption.update({
        where: { id: redemption.id },
        data: { transaction: { connect: { id: redeemTx.id } } },
      });

      // Update user balance
      await prisma.user.update({
        where: { id: user.id },
        data: { loyaltyPoints: newBalance },
      });

      totalPoints = newBalance;
      console.log(`\n🎟️  Redeemed "${rewardToRedeem.name}" for ${rewardToRedeem.pointsCost} points (code: ${code})`);
    }
  }

  // ── 7. Print summary ─────────────────────────────────────────────────────

  const finalUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { loyaltyPoints: true },
  });

  const txCount = await prisma.loyaltyTransaction.count({ where: { userId: user.id } });
  const redemptionCount = await prisma.rewardRedemption.count({ where: { userId: user.id } });

  console.log("\n" + "═".repeat(60));
  console.log("  🧪 TEST USER SEEDED SUCCESSFULLY");
  console.log("═".repeat(60));
  console.log(`\n  📧 Email:    ${TEST_USER.email}`);
  console.log(`  🔑 Password: ${TEST_USER.password}`);
  console.log(`  👤 Role:     user`);
  console.log(`\n  📊 Bookings:       ${createdBookings.length} (${createdBookings.filter(b => b.status === "completed").length} completed, ${createdBookings.filter(b => b.status === "confirmed").length} confirmed, ${createdBookings.filter(b => b.status === "pending").length} pending)`);
  console.log(`  💰 Loyalty Points: ${finalUser?.loyaltyPoints ?? 0}`);
  console.log(`  📝 Transactions:   ${txCount}`);
  console.log(`  🎟️  Redemptions:    ${redemptionCount}`);
  console.log(`  🎁 Rewards Available: ${createdRewards.length}`);
  console.log("\n" + "═".repeat(60));
  console.log("  Sign in and explore the loyalty dashboard at /account/loyalty");
  console.log("  Rewards catalog at /account/loyalty/rewards");
  console.log("═".repeat(60) + "\n");

  await prisma.$disconnect();
}

seedTestUser().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
