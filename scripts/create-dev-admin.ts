/**
 * scripts/create-dev-admin.ts — create a single developer/admin account.
 *
 * Deliberately standalone: it does NOT call prisma/seed.ts and touches no other
 * rows, so it is safe to run against a populated database.
 *
 *   npx tsx scripts/create-dev-admin.ts
 *
 * Credentials come from the environment (with local-only defaults):
 *   DEV_ADMIN_EMAIL     default dev.admin@gracesalon.test
 *   DEV_ADMIN_PASSWORD  default DevAdmin!2026
 *
 * Safety rails (this project already leaked a hardcoded admin password once):
 *   - Refuses to run when NODE_ENV=production, regardless of overrides.
 *   - Refuses to run when NEXT_PUBLIC_BASE_URL is not a localhost/127.0.0.1 URL.
 *   - Never overwrites an existing account's password unless it fails to verify,
 *     so re-runs are cheap and can't silently rotate a real credential.
 *
 * Idempotent: re-running just re-confirms the same account.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// tsx doesn't auto-load .env — parse it manually (same file Next.js loads).
function loadEnv(): void {
  try {
    for (const line of readFileSync(resolve(process.cwd(), ".env"), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let value = m[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    console.warn("⚠️  Could not read .env — relying on already-set environment.");
  }
}

loadEnv();

import { db } from "@/lib/db";
import { hashPassword, comparePassword } from "@/lib/crypto";

const EMAIL = process.env.DEV_ADMIN_EMAIL || "dev.admin@gracesalon.test";
const PASSWORD = process.env.DEV_ADMIN_PASSWORD || "DevAdmin!2026";
const NAME = process.env.DEV_ADMIN_NAME || "Dev Admin";

function assertSafeToRun(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to run: NODE_ENV=production. This script only creates local dev credentials.",
    );
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const isLocal =
    base === "" ||
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/?$/.test(base);

  if (!isLocal) {
    throw new Error(
      `Refusing to run: NEXT_PUBLIC_BASE_URL is "${base}", which is not a local address. ` +
        "Create production admins through an explicit, audited process instead.",
    );
  }

  if (PASSWORD.length < 12) {
    throw new Error("Refusing to run: DEV_ADMIN_PASSWORD must be at least 12 characters.");
  }
}

async function main(): Promise<void> {
  assertSafeToRun();

  const existing = await db.user.findUnique({ where: { email: EMAIL } });

  // Only (re)hash when the stored hash doesn't already match, so re-runs are cheap.
  const needsPassword =
    !existing || !(await comparePassword(PASSWORD, existing.password));

  const password = needsPassword ? await hashPassword(PASSWORD) : existing!.password;

  const user = await db.user.upsert({
    where: { email: EMAIL },
    create: {
      email: EMAIL,
      name: NAME,
      password,
      role: "admin",
      emailVerified: true,
      mustChangePassword: false,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        NAME,
      )}&background=e8ddd3&color=1F1F1F`,
    },
    update: {
      // Keep the account usable but do not silently escalate anything else.
      role: "admin",
      emailVerified: true,
      ...(needsPassword ? { password } : {}),
    },
  });

  console.log("✅ Dev admin ready");
  console.log(`   id       ${user.id}`);
  console.log(`   email    ${user.email}`);
  console.log(`   password ${PASSWORD}`);
  console.log(`   role     ${user.role}`);
  console.log(`   reused   ${existing ? "existing row updated" : "new row created"}`);
  console.log(`   pw set   ${needsPassword ? "hashed this run" : "left unchanged"}`);
}

main()
  .catch((err) => {
    console.error("❌", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
