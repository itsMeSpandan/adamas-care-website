-- Phase 2.1: hashed password-reset tokens + separate email-verification OTP table.
-- DESTRUCTIVE: drops raw OTP columns (transient data only).
-- DropIndex
DROP INDEX "PasswordResetToken_userId_token_key";

-- AlterTable
ALTER TABLE "PasswordResetToken" DROP COLUMN "token",
DROP COLUMN "used",
ADD COLUMN     "requestIp" TEXT,
ADD COLUMN     "tokenHash" TEXT NOT NULL,
ADD COLUMN     "usedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_userId_otpHash_key" ON "EmailVerificationToken"("userId", "otpHash");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
