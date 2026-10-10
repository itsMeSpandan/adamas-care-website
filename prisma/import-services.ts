/**
 * prisma/import-services.ts — replace the service catalog with the owner's
 * price list.
 *
 *   npm run db:import-services -- --dry-run   # show what would change
 *   npm run db:import-services                # apply
 *
 * The catalog comes from prisma/data/grace_salon_services.csv via
 * prisma/services-catalog.ts, which is the same source `prisma/seed.ts` uses —
 * so a seeded database and an existing one end up identical.
 *
 * Destructive by design: services that are no longer on the menu are deleted.
 * That cascades the specialist links and the per-booking service links, and
 * clears the service on bookings, waitlist entries and loyalty rewards (those
 * records themselves survive). The dry run prints the affected counts first.
 */

import { PrismaClient } from "@prisma/client";
import { buildCatalog } from "./services-catalog";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const { services, skipped } = buildCatalog();
  const catalogIds = services.map((s) => s.id);

  const existing = await prisma.service.findMany({ select: { id: true } });
  const existingIds = existing.map((s) => s.id);
  const removedIds = existingIds.filter((id) => !catalogIds.includes(id));
  const addedIds = catalogIds.filter((id) => !existingIds.includes(id));
  const keptIds = catalogIds.filter((id) => existingIds.includes(id));

  console.log(`catalog: ${services.length} services from the price list`);
  console.log(`  ${addedIds.length} new, ${keptIds.length} updated, ${removedIds.length} removed`);

  if (removedIds.length > 0) {
    const [bookingLinks, waitlistRefs, rewardRefs, specialistLinks] = await Promise.all([
      prisma.bookingService.count({ where: { serviceId: { in: removedIds } } }),
      prisma.waitlist.count({ where: { serviceId: { in: removedIds } } }),
      prisma.loyaltyReward.count({ where: { serviceId: { in: removedIds } } }),
      prisma.employeeService.count({ where: { serviceId: { in: removedIds } } }),
    ]);
    console.log(
      `  removing: ${removedIds.join(", ")}\n` +
        `  cascade: ${bookingLinks} booking-service link(s), ${specialistLinks} specialist link(s) deleted; ` +
        `${waitlistRefs} waitlist and ${rewardRefs} loyalty reference(s) cleared`
    );
  }

  if (skipped.length > 0) {
    console.log(`\nskipped ${skipped.length} row(s) — not imported:`);
    for (const s of skipped) {
      console.log(`  ${s.category} · ${s.service} (${s.gender}) — ${s.reason}`);
    }
  }

  if (dryRun) {
    console.log("\ndry run — nothing written");
    return;
  }

  // 1. Give everything the price list still contains its current values.
  for (const service of services) {
    const { employeeIds, ...fields } = service;
    await prisma.service.upsert({
      where: { id: service.id },
      create: { ...fields },
      update: { ...fields },
    });
    await prisma.employeeService.deleteMany({ where: { serviceId: service.id } });
    if (employeeIds.length > 0) {
      await prisma.employeeService.createMany({
        data: employeeIds.map((employeeId) => ({ serviceId: service.id, employeeId })),
      });
    }
  }

  // 2. Then drop whatever the price list no longer lists.
  if (removedIds.length > 0) {
    // Clear the waitlist references explicitly rather than relying on the
    // foreign key. Waitlist.serviceId had no constraint until
    // 20261010000002_waitlist_service_fk, so on an older database the delete
    // would otherwise leave rows pointing at a service that isn't there.
    await prisma.waitlist.updateMany({
      where: { serviceId: { in: removedIds } },
      data: { serviceId: null },
    });
    await prisma.service.deleteMany({ where: { id: { in: removedIds } } });
  }

  const final = await prisma.service.findMany({
    select: { id: true, audience: true, employeeServices: { select: { id: true } } },
  });
  const unlinked = final.filter((s) => s.employeeServices.length === 0);
  console.log(`\n✅ catalog now holds ${final.length} services`);
  const byAudience = final.reduce<Record<string, number>>((acc, s) => {
    acc[s.audience] = (acc[s.audience] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`   audience: ${Object.entries(byAudience).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  if (unlinked.length > 0) {
    console.warn(`   ⚠️  ${unlinked.length} service(s) have no specialist assigned: ${unlinked.map((s) => s.id).join(", ")}`);
  }

  // Integrity check: nothing may still point at a service that isn't here.
  // (Waitlist.serviceId had no foreign key before 20261010000002, so this is
  // the check that would have caught a silent orphan.)
  const liveIds = new Set(final.map((s) => s.id));
  const [waitlistRefs, bookingRefs, rewardRefs] = await Promise.all([
    prisma.waitlist.findMany({ where: { serviceId: { not: null } }, select: { serviceId: true } }),
    prisma.booking.findMany({ where: { serviceId: { not: null } }, select: { serviceId: true } }),
    prisma.loyaltyReward.findMany({ where: { serviceId: { not: null } }, select: { serviceId: true } }),
  ]);
  const dangling = [...waitlistRefs, ...bookingRefs, ...rewardRefs].filter(
    (r) => r.serviceId && !liveIds.has(r.serviceId)
  );
  if (dangling.length > 0) {
    console.error(`   ❌ ${dangling.length} reference(s) still point at a removed service: ${Array.from(new Set(dangling.map((d) => d.serviceId))).join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("   no dangling service references");
  }
}

main()
  .catch((e) => {
    console.error("❌ Import failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
