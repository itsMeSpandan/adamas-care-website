-- In-app notifications: the message a signed-in user sees in the header bell
-- and on /account/notifications. Until now a freed waitlist slot could only be
-- delivered by email or push, so with no RESEND_API_KEY configured the offer
-- went nowhere at all.

CREATE TABLE "Notification" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "type"      TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "deepLink"  TEXT,
    "bookingId" TEXT,
    "readAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
