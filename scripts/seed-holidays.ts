/**
 * One-time seed script: Indian public & festive holidays
 *
 * Usage: npx tsx scripts/seed-holidays.ts
 *
 * Seeds Indian holidays for 2025 and 2026 into the database.
 * Safe to run multiple times — duplicates are skipped.
 */

import { PrismaClient } from "@prisma/client";
import { getHolidaysForYear } from "../lib/holidays";

const prisma = new PrismaClient();

async function seedHolidays() {
  // Parse --year args
  const args = process.argv.slice(2);
  const yearIndices = args
    .map((arg, i) => (arg === "--year" ? i + 1 : -1))
    .filter((i) => i >= 0);

  let years: number[] = [];
  if (yearIndices.length > 0) {
    years = yearIndices.map((i) => parseInt(args[i], 10)).filter((y) => !isNaN(y));
  } else {
    // Default: current year + next year
    const currentYear = new Date().getFullYear();
    years = [currentYear, currentYear + 1];
  }

  console.log(`🗓️  Seeding Indian holidays for: ${years.join(", ")}\n`);

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const year of years) {
    const holidaysForYear = getHolidaysForYear(year);

    console.log(`── Year ${year}: ${holidaysForYear.length} holidays to seed ──`);

    let created = 0;
    let skipped = 0;

    for (const h of holidaysForYear) {
      try {
        const holidayDate = new Date(h.date + "T00:00:00Z");

        const existing = await prisma.holiday.findFirst({
          where: { date: holidayDate, name: h.name },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.holiday.create({
          data: {
            name: h.name,
            date: holidayDate,
            type: h.type,
            isRecurring: h.isRecurring,
          },
        });

        created++;
        console.log(`  ✅ ${h.name} (${h.date}) [${h.type}]`);
      } catch (error) {
        totalFailed++;
        console.error(`  ❌ Failed to seed "${h.name}":`, error);
      }
    }

    totalCreated += created;
    totalSkipped += skipped;
    console.log(`  📊 Created: ${created} | Skipped: ${skipped}\n`);
  }

  console.log(`\n🏁 Seeding complete:`);
  console.log(`   Total created:  ${totalCreated}`);
  console.log(`   Total skipped:  ${totalSkipped}`);
  console.log(`   Total failed:   ${totalFailed}`);

  const count = await prisma.holiday.count();
  console.log(`   Holidays in DB: ${count}`);

  await prisma.$disconnect();
}

seedHolidays().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
