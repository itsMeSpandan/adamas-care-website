/** Phase 1 inventory: report accounts without a usable email address. */
import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

// Load .env manually (tsx does not auto-load it)
try {
  for (const line of readFileSync(resolve(process.cwd(), ".env"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
} catch { /* .env may not exist */ }

const db = new PrismaClient();

(async () => {
  const users = await db.user.findMany({ select: { id: true, email: true, whatsappNumber: true } });
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const invalid = users.filter((u) => !valid.test(u.email || ""));
  console.log(JSON.stringify({
    total: users.length,
    invalidEmailCount: invalid.length,
    invalidEmails: invalid.map((u) => ({ id: u.id, email: u.email, hasPhone: !!u.whatsappNumber })),
  }, null, 2));
  await db.$disconnect();
})();
