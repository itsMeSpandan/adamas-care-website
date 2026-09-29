/** One-off: prove an expired reset token is rejected, then restore the demo password. */
import { readFileSync } from "fs";
import { resolve } from "path";
import crypto from "crypto";

try {
  for (const line of readFileSync(resolve(process.cwd(), ".env"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
} catch { /* no .env */ }

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/crypto";

const db = new PrismaClient();

(async () => {
  const user = await db.user.findUnique({ where: { email: "customer@gracesalon.test" } });
  if (!user) throw new Error("demo user not found");

  // 1. Insert an already-expired reset token for a known raw token.
  const rawToken = "expired-token-test-" + crypto.randomBytes(16).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await db.passwordResetToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() - 60_000), // expired 1 minute ago
      requestIp: "127.0.0.1",
    },
  });
  console.log("EXPIRED_RAW_TOKEN=" + rawToken);

  // 2. Restore demo password to Screenshot123! (bcrypt cost 12).
  const hashed = await hashPassword("Screenshot123!");
  await db.user.update({ where: { id: user.id }, data: { password: hashed } });
  console.log("demo password restored to Screenshot123!");

  await db.$disconnect();
})();
