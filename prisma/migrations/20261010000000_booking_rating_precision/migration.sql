-- Booking.rating was an integer column, but the API stores one decimal
-- (Math.round(rating * 10) / 10 — e.g. 4.6). Postgres silently rounded the
-- value on write, so every half-star review was truncated (4.6 → 4) while the
-- request still returned 200. Store ratings as double precision, the same type
-- Employee.rating already uses.

ALTER TABLE "Booking" ALTER COLUMN "rating" TYPE DOUBLE PRECISION;
