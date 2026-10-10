-- Waitlist.serviceId was declared as a bare String? with no relation, so Prisma
-- never created a foreign key for it. Deleting a service (which the service
-- catalogue import does) left waitlist rows pointing at a service that no
-- longer existed, silently.
--
-- Clear any such orphan first, then constrain the column the way Booking and
-- LoyaltyReward already are.

UPDATE "Waitlist" w
SET "serviceId" = NULL
WHERE w."serviceId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Service" s WHERE s."id" = w."serviceId");

ALTER TABLE "Waitlist"
  ADD CONSTRAINT "Waitlist_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
