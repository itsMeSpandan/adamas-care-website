/**
 * Seed script: Give the demo user (demo@adamascare.com) loyalty data
 *
 * Usage: npx tsx scripts/seed-demo-user-loyalty.ts
 *
 * Creates:
 *   - Completed bookings linked to the demo user
 *   - Loyalty earn transactions for those bookings
 *   - Updates demo user's loyaltyPoints
 *
 * Safe to run multiple times — idempotent (skips if transactions exist).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@adamascare.com";

// Loyalty: 1 point per 10 currency units
function calculatePoints(price: number): number {
  return Math.floor(price / 10);
}

async function seedDemoUserLoyalty() {
  console.log("🌱 Seeding demo user with loyalty data...\n");

  // 1. Find the demo user
  const user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });

  if (!user) {
    console.error(`❌ Demo user "${DEMO_EMAIL}" not found. Run the main seed first.`);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`👤 Found demo user: ${user.name} (${user.id})`);

  // 2. Find services and employees
  const services = await prisma.service.findMany({
    select: { id: true, name: true, price: true },
  });
  const employees = await prisma.employee.findMany({
    select: { id: true, name: true },
  });

  if (services.length === 0 || employees.length === 0) {
    console.error("❌ No services or employees found. Run the main seed first.");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`   Found ${services.length} services and ${employees.length} employees.`);

  // 3. Check if user already has loyalty data
  const existingTransactions = await prisma.loyaltyTransaction.count({
    where: { userId: user.id },
  });

  if (existingTransactions > 0) {
    console.log(`   User already has ${existingTransactions} loyalty transactions. Skipping.`);
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { loyaltyPoints: true },
    });
    console.log(`   Current balance: ${currentUser?.loyaltyPoints ?? 0} points.`);
    await prisma.$disconnect();
    return;
  }

  // 4. Create bookings linked to the demo user
  const now = new Date();
  const bookingsToCreate = [
    {
      service: services.find((s) => s.id === "hydra-facial") || services[0],
      employee: employees[0],
      date: new Date(now.getFullYear(), now.getMonth() - 2, 10),
      status: "completed" as const,
    },
    {
      service: services.find((s) => s.id === "deep-tissue-massage") || services[1],
      employee: employees.length > 2 ? employees[2] : employees[1],
      date: new Date(now.getFullYear(), now.getMonth() - 1, 5),
      status: "completed" as const,
    },
    {
      service: services.find((s) => s.id === "precision-haircut") || services[2],
      employee: employees[0],
      date: new Date(now.getFullYear(), now.getMonth() - 1, 20),
      status: "completed" as const,
    },
    {
      service: services.find((s) => s.id === "gel-manicure") || services[3],
      employee: employees.length > 3 ? employees[3] : employees[0],
      date: new Date(now.getFullYear(), now.getMonth(), 1),
      status: "completed" as const,
    },
  ];

  let totalPoints = 0;
  const createdBookings: Array<{ id: string; price: number }> = [];

  for (const b of bookingsToCreate) {
    const booking = await prisma.booking.create({
      data: {
        serviceId: b.service.id,
        employeeId: b.employee.id,
        userId: user.id,
        date: b.date,
        timeSlot: "10:00 AM",
        slotStart: "10:00",
        slotEnd: b.service.name.includes("Facial") || b.service.name.includes("Massage")
          ? "11:30" : "11:00",
        name: user.name,
        email: user.email,
        phone: "9876543211",
        status: b.status,
        price: b.service.price,
      },
    });

    createdBookings.push({ id: booking.id, price: booking.price });
    console.log(`   ✅ Booking: ${b.service.name} ($${b.service.price}) — ${b.date.toISOString().split("T")[0]}`);

    // Award points for completed booking
    const points = calculatePoints(b.service.price);
    totalPoints += points;
  }

  // 5. Create loyalty transactions for each booking
  let runningBalance = 0;
  for (const booking of createdBookings) {
    const points = calculatePoints(booking.price);
    runningBalance += points;

    await prisma.loyaltyTransaction.create({
      data: {
        userId: user.id,
        type: "earn",
        points,
        balanceAfter: runningBalance,
        bookingId: booking.id,
        note: `Earned from booking (₹${booking.price})`,
      },
    });
  }

  // 6. Update user's total loyalty points
  await prisma.user.update({
    where: { id: user.id },
    data: { loyaltyPoints: totalPoints },
  });

  // 7. Summary
  console.log("\n" + "═".repeat(60));
  console.log("  ✅ DEMO USER SEEDED WITH LOYALTY DATA");
  console.log("═".repeat(60));
  console.log(`\n  📧 Email:    ${DEMO_EMAIL}`);
  console.log(`  🔑 Password: demo123`);
  console.log(`  💰 Points:   ${totalPoints}`);
  console.log(`  📝 Transactions: ${createdBookings.length}`);
  console.log("\n" + "═".repeat(60) + "\n");

  await prisma.$disconnect();
}

seedDemoUserLoyalty().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
