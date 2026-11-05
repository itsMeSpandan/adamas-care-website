-- CreateIndex
CREATE INDEX IF NOT EXISTS "Booking_createdAt_idx" ON "Booking"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Booking_date_idx" ON "Booking"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Service_category_idx" ON "Service"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Service_featured_idx" ON "Service"("featured");
