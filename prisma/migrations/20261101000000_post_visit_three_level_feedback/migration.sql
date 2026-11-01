-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'REVIEWED', 'FOLLOW_UP', 'RESOLVED');

-- CreateEnum
CREATE TYPE "FeedbackSource" AS ENUM ('app', 'legacy');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT,
    "source" "FeedbackSource" NOT NULL DEFAULT 'app',
    "overallRating" INTEGER NOT NULL,
    "npsScore" INTEGER,
    "overallTags" TEXT[],
    "overallComment" TEXT,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "adminNotes" TEXT,
    "reviewedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackEmployeeRating" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "tags" TEXT[],
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackEmployeeRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackServiceRating" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "tags" TEXT[],
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackServiceRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_bookingId_key" ON "Feedback"("bookingId");

-- CreateIndex
CREATE INDEX "Feedback_status_idx" ON "Feedback"("status");

-- CreateIndex
CREATE INDEX "Feedback_isFlagged_idx" ON "Feedback"("isFlagged");

-- CreateIndex
CREATE INDEX "Feedback_overallRating_idx" ON "Feedback"("overallRating");

-- CreateIndex
CREATE INDEX "Feedback_source_idx" ON "Feedback"("source");

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");

-- CreateIndex
CREATE INDEX "FeedbackEmployeeRating_employeeId_rating_idx" ON "FeedbackEmployeeRating"("employeeId", "rating");

-- CreateIndex
CREATE INDEX "FeedbackEmployeeRating_employeeId_createdAt_idx" ON "FeedbackEmployeeRating"("employeeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackEmployeeRating_feedbackId_employeeId_key" ON "FeedbackEmployeeRating"("feedbackId", "employeeId");

-- CreateIndex
CREATE INDEX "FeedbackServiceRating_serviceId_rating_idx" ON "FeedbackServiceRating"("serviceId", "rating");

-- CreateIndex
CREATE INDEX "FeedbackServiceRating_serviceId_createdAt_idx" ON "FeedbackServiceRating"("serviceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackServiceRating_feedbackId_serviceId_key" ON "FeedbackServiceRating"("feedbackId", "serviceId");

-- CreateIndex
CREATE INDEX "Booking_status_completedAt_idx" ON "Booking"("status", "completedAt");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackEmployeeRating" ADD CONSTRAINT "FeedbackEmployeeRating_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackEmployeeRating" ADD CONSTRAINT "FeedbackEmployeeRating_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackServiceRating" ADD CONSTRAINT "FeedbackServiceRating_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackServiceRating" ADD CONSTRAINT "FeedbackServiceRating_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Data Backfill ───────────────────────────────────────────────────────────

-- 1. Backfill completedAt from updatedAt for existing completed bookings
UPDATE "Booking"
SET "completedAt" = "updatedAt"
WHERE "status" = 'completed' AND "completedAt" IS NULL;

-- 2. Backfill legacy rated bookings into Feedback (overallRating & overallComment only)
-- ROUND and clamp between 1 and 5; mark source as 'legacy'; status 'REVIEWED'; isFlagged false.
-- Note: Does NOT create employee or service rating rows (per requirements).
INSERT INTO "Feedback" (
  "id",
  "bookingId",
  "userId",
  "source",
  "overallRating",
  "overallComment",
  "status",
  "isFlagged",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy_' || "id",
  "id" AS "bookingId",
  "userId",
  'legacy'::"FeedbackSource" AS "source",
  ROUND(LEAST(5.0, GREATEST(1.0, "rating")))::INTEGER AS "overallRating",
  "review" AS "overallComment",
  'REVIEWED'::"FeedbackStatus" AS "status",
  false AS "isFlagged",
  "updatedAt" AS "createdAt",
  "updatedAt" AS "updatedAt"
FROM "Booking"
WHERE "rating" IS NOT NULL
ON CONFLICT ("bookingId") DO NOTHING;
