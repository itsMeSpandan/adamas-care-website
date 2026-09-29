/** One-off: verify PasswordResetToken / EmailVerificationToken DB shape after Phase 2.1 migration. */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
(async () => {
  const cols: { column_name: string }[] = await db.$queryRawUnsafe(
    "SELECT column_name FROM information_schema.columns WHERE table_name='PasswordResetToken'"
  );
  const tbl: { table_name: string }[] = await db.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_name='EmailVerificationToken'"
  );
  console.log("PasswordResetToken cols:", cols.map((c) => c.column_name).sort().join(", "));
  console.log("EmailVerificationToken exists:", tbl.length === 1);
  await db.$disconnect();
})();
