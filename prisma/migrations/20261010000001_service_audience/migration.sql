-- Service audience: which clients may book a service (male / female / unisex).
-- Existing services default to 'unisex' so no current service becomes
-- unbookable before an admin classifies it.

CREATE TYPE "ServiceAudience" AS ENUM ('male', 'female', 'unisex');

ALTER TABLE "Service"
  ADD COLUMN "audience" "ServiceAudience" NOT NULL DEFAULT 'unisex';
