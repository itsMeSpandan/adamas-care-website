/**
 * One-time migration script: plain-text → bcrypt password hashing
 *
 * Usage: npx tsx scripts/migrate-passwords.ts
 *
 * This script:
 * 1. Reads all users from the database
 * 2. Identifies plain-text passwords (not starting with $2a$ or $2b$)
 * 3. Hashes them with bcrypt (cost factor 12)
 * 4. Updates the database
 *
 * Safe to run multiple times — already-hashed passwords are skipped.
 */

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";

function isBcryptHash(password: string): boolean {
  return password.startsWith("$2a$") || password.startsWith("$2b$");
}

async function migratePasswords() {
  console.log("🔑 Starting password migration (plain-text → bcrypt)...\n");

  const users = await db.user.findMany({
    select: { id: true, email: true, password: true },
  });

  console.log(`Found ${users.length} users total.`);

  const plainTextUsers = users.filter((u) => !isBcryptHash(u.password));
  const alreadyHashed = users.length - plainTextUsers.length;

  console.log(`Already hashed: ${alreadyHashed}`);
  console.log(`Plain-text to migrate: ${plainTextUsers.length}\n`);

  if (plainTextUsers.length === 0) {
    console.log("✅ All passwords are already hashed. Nothing to do.");
    return;
  }

  let migrated = 0;
  let failed = 0;

  for (const user of plainTextUsers) {
    try {
      const hashedPassword = await hashPassword(user.password);

      // Verify the hash round-trips correctly
      const { comparePassword } = await import("@/lib/crypto");
      const verified = await comparePassword(user.password, hashedPassword);
      if (!verified) {
        console.error(`❌ Hash verification failed for ${user.email} — skipping.`);
        failed++;
        continue;
      }

      await db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      migrated++;
      console.log(`✅ Migrated: ${user.email}`);
    } catch (error) {
      failed++;
      console.error(`❌ Failed to migrate ${user.email}:`, error);
    }
  }

  console.log(`\n📊 Migration complete:`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Failed:   ${failed}`);
  console.log(`   Skipped (already hashed): ${alreadyHashed}`);

  // Final verification: confirm no plain-text passwords remain
  const stillPlaintext = await db.user.findMany({
    where: {
      NOT: [
        { password: { startsWith: "$2a$" } },
        { password: { startsWith: "$2b$" } },
      ],
    },
    select: { email: true },
  });

  if (stillPlaintext.length > 0) {
    console.log(`\n⚠️  WARNING: ${stillPlaintext.length} users still have plain-text passwords!`);
    stillPlaintext.forEach((u) => console.log(`   - ${u.email}`));
  } else {
    console.log("\n✅ Verification passed: no plain-text passwords remain.");
  }

  await db.$disconnect();
}

migratePasswords().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
