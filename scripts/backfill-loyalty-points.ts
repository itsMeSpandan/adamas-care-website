/**
 * One-time backfill script: award loyalty points for historical completed bookings.
 *
 * Usage: npx tsx scripts/backfill-loyalty-points.ts
 *
 * This script:
 * 1. Finds all completed bookings with a userId
 * 2. Skips bookings that already have a LoyaltyTransaction (idempotent)
 * 3. Computes points from booking.price using the same earning rate
 * 4. Creates LoyaltyTransaction records and increments User.loyaltyPoints
 * 5. Logs a summary
 *
 * Safe to run multiple times — already-processed bookings are skipped.
 */

import { db } from "@/lib/db";
import { LOYALTY_POINTS_PER_CURRENCY_UNIT } from "@/lib/constants";

function computePointsEarned(price: number): number {
  return Math.floor(price * LOYALTY_POINTS_PER_CURRENCY_UNIT);
}

async function backfillLoyaltyPoints() {
  console.log("🔄 Starting loyalty points backfill...\n");

  // 1. Find all completed bookings with a userId
  const completedBookings = await db.booking.findMany({
    where: {
      status: "completed",
      userId: { not: null },
    },
    select: { id: true, userId: true, price: true, date: true },
  });

  console.log(`Found ${completedBookings.length} completed bookings with users.`);

  // 2. Find which bookingIds already have an earn transaction
  const existingEarns = await db.loyaltyTransaction.findMany({
    where: { type: "earn", bookingId: { not: null } },
    select: { bookingId: true },
  });
  const alreadyProcessed = new Set(existingEarns.map((t) => t.bookingId));

  const bookingsToProcess = completedBookings.filter(
    (b) => !alreadyProcessed.has(b.id)
  );
  const skipped = completedBookings.length - bookingsToProcess.length;

  console.log(`${bookingsToProcess.length} bookings to process, ${skipped} already have transactions.\n`);

  if (bookingsToProcess.length === 0) {
    console.log("✅ Nothing to backfill. All bookings already processed.");
    return;
  }

  // 3. Group by userId for batch processing
  const byUser = new Map<string, { bookingId: string; price: number; date: Date }[]>();
  for (const b of bookingsToProcess) {
    if (!b.userId) continue;
    const list = byUser.get(b.userId) || [];
    list.push({ bookingId: b.id, price: b.price, date: b.date });
    byUser.set(b.userId, list);
  }

  let totalPointsAwarded = 0;
  let usersUpdated = 0;

  // 4. Process each user's bookings in a transaction
  for (const [userId, bookings] of Array.from(byUser.entries())) {
    try {
      await db.$transaction(async (tx) => {
        let userPoints = 0;

        for (const booking of bookings) {
          const points = computePointsEarned(booking.price);
          if (points <= 0) continue;

          // Create loyalty transaction
          await tx.loyaltyTransaction.create({
            data: {
              userId,
              type: "earn",
              points,
              balanceAfter: 0, // Will be correct after user update
              bookingId: booking.bookingId,
              note: "Backfilled from historical booking",
            },
          });

          userPoints += points;
        }

        if (userPoints > 0) {
          // Increment user's total loyalty points
          const updated = await tx.user.update({
            where: { id: userId },
            data: { loyaltyPoints: { increment: userPoints } },
            select: { loyaltyPoints: true },
          });

          // Now fix the balanceAfter in the transactions we just created
          await tx.loyaltyTransaction.updateMany({
            where: { userId, type: "earn", note: "Backfilled from historical booking" },
            data: { balanceAfter: updated.loyaltyPoints },
          });

          totalPointsAwarded += userPoints;
          usersUpdated++;
          console.log(`  ✅ ${userId}: +${userPoints} points (total: ${updated.loyaltyPoints})`);
        }
      });
    } catch (error) {
      console.error(`  ❌ Failed for user ${userId}:`, error);
    }
  }

  console.log(`\n🎉 Backfill complete!`);
  console.log(`   Users updated: ${usersUpdated}`);
  console.log(`   Total points awarded: ${totalPointsAwarded}`);
  console.log(`   Bookings skipped (already processed): ${skipped}`);
}

backfillLoyaltyPoints()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
