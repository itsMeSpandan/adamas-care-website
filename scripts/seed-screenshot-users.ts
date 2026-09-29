/**
 * scripts/seed-screenshot-users.ts — create demo users for UI walkthroughs.
 *
 *   npx tsx scripts/seed-screenshot-users.ts
 *
 * Idempotent: upserts three verified users (admin / employee / customer).
 * Passwords are only re-hashed when verification fails, so re-runs are cheap.
 * The employee user is linked to a real Employee record so /employee works.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// tsx doesn't auto-load .env — parse it manually (same file Next.js loads).
function loadEnv(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    console.error("⚠️  Could not read .env");
  }
}

loadEnv();

import { db } from "@/lib/db";
import { hashPassword, comparePassword } from "@/lib/crypto";

const PASSWORD = "Screenshot123!";

interface DemoUser {
  email: string;
  name: string;
  role: "admin" | "employee" | "user";
}

const demoUsers: DemoUser[] = [
  { email: "admin@gracesalon.test", name: "Ada Admin", role: "admin" },
  { email: "employee@gracesalon.test", name: "Evan Employee", role: "employee" },
  { email: "customer@gracesalon.test", name: "Casey Customer", role: "user" },
];

async function upsertUser(u: DemoUser, employeeId?: string): Promise<void> {
  const existing = await db.user.findUnique({ where: { email: u.email } });

  if (!existing) {
    await db.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: await hashPassword(PASSWORD, 10),
        gender: "other",
        whatsappNumber: "+9170039445160",
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=e8ddd3&color=1F1F1F`,
        emailVerified: true,
        employeeId: employeeId ?? null,
      },
    });
    console.log(`✅ created ${u.role}: ${u.email}`);
    return;
  }

  const data: Record<string, unknown> = {
    role: u.role,
    emailVerified: true,
    name: u.name,
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=e8ddd3&color=1F1F1F`,
  };
  if (employeeId) data.employeeId = employeeId;

  // Only pay the bcrypt cost when the stored password no longer matches.
  const passwordOk = await comparePassword(PASSWORD, existing.password).catch(() => false);
  if (!passwordOk) data.password = await hashPassword(PASSWORD, 10);

  await db.user.update({ where: { email: u.email }, data });
  console.log(`✅ updated ${u.role}: ${u.email}${passwordOk ? "" : " (password reset)"}`);
}

async function main(): Promise<void> {
  // Link the employee demo user to the first real Employee record.
  const employee = await db.employee.findFirst({ orderBy: { id: "asc" } });
  let employeeId: string | undefined;

  if (employee) {
    employeeId = employee.id;
    if (employee.email === "" || employee.email === "employee@gracesalon.test") {
      await db.employee.update({
        where: { id: employee.id },
        data: { email: "employee@gracesalon.test" },
      });
      console.log(`✅ linked Employee "${employee.name}" (${employee.id})`);
    } else {
      console.log(`ℹ️  Employee "${employee.name}" already has email ${employee.email} — linking by id only`);
    }
  } else {
    console.log("⚠️  No Employee records found — /employee may show limited data");
  }

  for (const u of demoUsers) {
    await upsertUser(u, u.role === "employee" ? employeeId : undefined);
  }

  console.log(`\nDone. Password for all demo users: ${PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
