/**
 * scripts/acceptance-db.ts — final acceptance-test helper (Phase FINAL).
 *
 * Usage:
 *   npx tsx scripts/acceptance-db.ts set-gender
 *   npx tsx scripts/acceptance-db.ts make-reminder-booking
 *   npx tsx scripts/acceptance-db.ts re-notify <bookingId>
 *   npx tsx scripts/acceptance-db.ts log <bookingId>
 *   npx tsx scripts/acceptance-db.ts log-count <bookingId>
 *   npx tsx scripts/acceptance-db.ts cleanup
 */
import { readFileSync } from "fs";
import { resolve } from "path";

try {
  for (const line of readFileSync(resolve(process.cwd(), ".env"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
} catch { /* no .env */ }

import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const cmd = process.argv[2];

async function main() {
  if (cmd === "set-gender") {
    const u = await db.user.update({
      where: { email: "customer@gracesalon.test" },
      data: { gender: "male" },
    });
    console.log("gender set:", u.email, u.gender);
    return;
  }

  if (cmd === "make-reminder-booking") {
    // Slot exactly ~1h from now (cron REMINDER_1H window), computed with the
    // same convention the cron uses: date midnight + UTC hours of the slot.
    const target = new Date(Date.now() + 60 * 60 * 1000);
    const date = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()));
    const slotStart = `${String(target.getUTCHours()).padStart(2, "0")}:${String(target.getUTCMinutes()).padStart(2, "0")}`;
    const end = new Date(target.getTime() + 60 * 60 * 1000);
    const slotEnd = `${String(end.getUTCHours()).padStart(2, "0")}:${String(end.getUTCMinutes()).padStart(2, "0")}`;

    const booking = await db.booking.create({
      data: {
        serviceId: "precision-haircut",
        employeeId: "arjun-mehta",
        userId: null,
        date,
        timeSlot: slotStart,
        slotStart,
        slotEnd,
        name: "Cron Tester",
        email: "cron-tester@example.com",
        phone: "+910000000000",
        notes: "acceptance: reminder window",
        price: 85,
        status: "confirmed",
      },
    });
    console.log("reminder-booking:", booking.id, "date=", date.toISOString(), "slot=", slotStart);
    return;
  }

  if (cmd === "re-notify") {
    // Idempotency probe: call notifyBooking twice for the same booking and
    // report the log rows before/after (relative import — tsx has no @ alias).
    const { notifyBooking } = await import("../lib/notify");
    const bookingId = process.argv[3]!;
    const before = await db.notificationLog.count({ where: { bookingId } });
    await notifyBooking(bookingId, "CONFIRMED");
    await notifyBooking(bookingId, "CONFIRMED");
    const after = await db.notificationLog.count({ where: { bookingId } });
    const rows = await db.notificationLog.findMany({ where: { bookingId } });
    console.log(`rows before=${before} after=${after}`);
    console.log(rows.map((r) => `${r.event}/${r.channel}`).join(", ") || "(none)");
    return;
  }

  if (cmd === "log" || cmd === "log-count") {
    const bookingId = process.argv[3];
    const rows = await db.notificationLog.findMany({
      where: { bookingId },
      orderBy: { createdAt: "asc" },
    });
    if (cmd === "log-count") {
      console.log(JSON.stringify(rows.map((r) => `${r.event}/${r.channel}`)));
    } else {
      for (const r of rows) console.log(`${r.createdAt.toISOString()} ${r.event} ${r.channel}`);
      if (rows.length === 0) console.log("(no notification log rows)");
    }
    return;
  }

  if (cmd === "cleanup") {
    // Deletes acceptance-created bookings; NotificationLog cascades.
    const a = await db.booking.deleteMany({ where: { notes: "acceptance test" } });
    const b = await db.booking.deleteMany({ where: { notes: "acceptance: guest booking" } });
    const c = await db.booking.deleteMany({ where: { notes: "acceptance: reminder window" } });
    // restore fixture gender
    await db.user.update({
      where: { email: "customer@gracesalon.test" },
      data: { gender: "other" },
    });
    console.log(`deleted: ${a.count} + ${b.count} + ${c.count} bookings; fixture gender restored`);
    return;
  }

  console.log("unknown command:", cmd);
  process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
