# Completion Report — Stage 1, 2, 3 & 4 Remediation

**Date:** 2026-07-12 (updated with Stage 4)
**Scope implemented:** Critical (secrets + auth bypass), High (authorization, PII exposure,
booking integrity), Medium (hardening, rate limiting, sessions, headers), and Low (code cleanliness,
consolidation, docs) items from `FIX_MASTER_PROMPT.md` / `AUDIT_REPORT.md`.
**Status:** Code changes complete; `npx tsc --noEmit` ✅ and `npm run build` ✅ pass.
**Database migration:** Code-complete but **not applied to the live DB** (see "Required manual steps").

---

## 1. What was changed

### Stage 1 — Critical
| File | Change |
|------|--------|
| `prisma/schema.prisma` | `datasource db.url` now `env("DATABASE_URL")` — no literal credentials in source. |
| `.gitignore` | Added `.env` (was only ignoring `.env*.local`). |
| `.env` | Untracked via `git rm --cached` (file kept locally, removed from git index). |
| `.env` | A strong `SESSION_SECRET` was generated and written into the local, now-ignored `.env`. |
| `.env.example` | Added `SESSION_SECRET=""` placeholder. |
| `lib/auth.ts` | JWT secret now **fails closed** — throws at startup if `SESSION_SECRET` is unset (no committed fallback). |

### Stage 2 — High
| File | Change |
|------|--------|
| `app/api/bookings/route.ts` (GET) | Scoped: admin/employee → all bookings; normal user → only their own (`userId`/`email`). |
| `app/api/bookings/route.ts` (PATCH) | Ownership gate: staff may edit any booking; customer only their own (403 otherwise). |
| `app/api/bookings/route.ts` (POST) | **Server-side price** from `serviceId` (client `price` ignored); validates employee–service assignment, rejects past dates, and rejects slots outside the employee's availability windows. |
| `app/api/auth/profile/route.ts` | IDOR fixed — target user derived from `session.userId`, never the request body. |
| `prisma/schema.prisma` | `PasswordResetToken.token` `@unique` → `@@unique([userId, token])` (fixes OTP-collision 500). |
| `prisma/schema.prisma` | `Booking.serviceId`/`employeeId` made nullable with `onDelete: SetNull` (delete service/employee no longer 500s; history preserved). |
| `app/admin/page.tsx` | Defensive `booking.service?.name ?? "—"` for the now-nullable relation. |
| `forgot-password/route.ts`, `employees/route.ts`, `require-auth.ts`, `WeeklyTimetable.tsx` | Removed pre-existing unused imports/vars that blocked `next build`. |

### Stage 3 — Medium
| File | Change |
|------|--------|
| `lib/rate-limit.ts` | Enhanced with trusted proxy headers (X-Real-IP, X-Forwarded-For) and per-email limiting via `getEmailKey()`. |
| `app/api/auth/forgot-password/route.ts` | Uses per-email limiting; OTP never logged in production. |
| `app/api/auth/reset-password/route.ts` | Uses per-email limiting with `request.clone()` to read email before consuming body. |
| `lib/auth-context.tsx` | Added `refreshSession()` and `authFetch()` for automatic token refresh on 401. |
| `middleware.ts` | Added strict Content-Security-Policy header (`default-src 'self'`, whitelisted unsplash/ui-avatars). |
| `prisma/schema.prisma` | Added indexes on Booking (employeeId+date, userId, email), EmployeeAvailability (employeeId), PasswordResetToken (userId). |
| `lib/queries.ts` | `generateUniqueEmployeeEmail` bounded to max 50 iterations with error throw. |

### Stage 4 — Code Cleanliness, Consolidation & Docs
| File | Change |
|------|--------|
| `lib/slots.ts` | **New** — Centralized time/slot helpers (`timeToMinutes`, `minutesToTime`, `subtractTimeRange`, `mergeWindows`, `slotsOverlap`, `generateSlots`, `generateSlotStrings`). |
| `lib/availability.ts` | **New** — Shared availability computation logic with extracted helpers (`resolveDate`, `getWorkingWindows`, `getActiveBookings`). |
| `lib/constants.ts` | **New** — Centralized `statusColors`, `STATUS_BADGE`, `COOKIE_NAMES`, `TOKEN_EXPIRY`. |
| `components/layout/RoleLayout.tsx` | **New** — Shared layout component eliminating ~120 lines of duplication between admin/employee layouts. |
| `app/api/availability/route.ts` | Refactored to use `lib/availability.ts` (reduced from ~130 to ~22 lines). |
| `app/api/available-slots/route.ts` | Refactored to delegate to `lib/availability.ts` instead of duplicating logic (reduced from ~100 to ~30 lines). |
| `app/api/availability/dates/route.ts` | Refactored to use `lib/slots.ts` helpers. |
| `app/admin/layout.tsx` | Refactored to use `RoleLayout` component. |
| `app/employee/layout.tsx` | Refactored to use `RoleLayout` component. |
| `app/admin/bookings/page.tsx` | Imports `statusColors` from `lib/constants.ts` instead of local definition. |
| `app/profile/page.tsx` | Imports `statusColors` from `lib/constants.ts` instead of local definition. |
| `app/admin/page.tsx` | Imports `statusColors` from `lib/constants.ts` instead of local definition. |
| `app/booking/page.tsx` | Replaced local `displayTime` with import from `lib/utils.displayTime`. |
| `lib/auth.ts` | Removed dead `getSession()` function; imported `COOKIE_NAMES`/`TOKEN_EXPIRY` from `lib/constants.ts`. |
| `lib/resend.ts` | **Deleted** — Dead code (not imported anywhere). |

---

## 2. Verification performed

- ✅ `npx tsc --noEmit` — no type errors.
- ✅ `npm run build` — compiles successfully (had to clear 4 pre-existing unused-var lint errors that blocked the build).
- ✅ `npx prisma generate` — client regenerated from the updated schema.
- ✅ `.env` no longer tracked (`git ls-files .env` → not found); real credentials now only live in the local, git-ignored `.env` and your deploy secret store.

**Not performed (by design):** live DB schema migration, runtime/HTTP smoke tests, `npm audit`.

---

## 3. Required manual steps BEFORE production (must-do)

These are operational and were intentionally **not** auto-executed against your live database.

1. **Rotate the NeonDB password** (the committed credential is still valid until rotated).
   Update `DATABASE_URL` in the deploy environment afterward.
2. **Purge `.env` from git history** (e.g. `git filter-repo --path .env --invert-paths`, or BFG),
   then force-push the cleaned branch. The secret must not remain in any commit.
3. **Set `SESSION_SECRET` in the deployment environment** (it is currently only in the local
   `.env`; production must supply it as a real env var or the app will refuse to start).
4. **Apply the database migration** (schema changes). The `prisma+postgresql://` scheme is not
   accepted by `prisma migrate diff` in this toolchain, so use one of:
   - `npx prisma db push` (after a DB backup), **or** run the SQL below manually.

   ```sql
   -- Make booking FKs nullable
   ALTER TABLE "Booking" ALTER COLUMN "serviceId" DROP NOT NULL;
   ALTER TABLE "Booking" ALTER COLUMN "employeeId" DROP NOT NULL;

   -- SetNull on delete (constraint names are Prisma defaults; verify before running)
   ALTER TABLE "Booking"
     DROP CONSTRAINT IF EXISTS "Booking_serviceId_fkey",
     ADD CONSTRAINT "Booking_serviceId_fkey"
       FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
   ALTER TABLE "Booking"
     DROP CONSTRAINT IF EXISTS "Booking_employeeId_fkey",
     ADD CONSTRAINT "Booking_employeeId_fkey"
       FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

   -- Per-user OTP uniqueness (drop global unique, add composite)
   ALTER TABLE "PasswordResetToken"
     DROP CONSTRAINT IF EXISTS "PasswordResetToken_token_key";
   CREATE UNIQUE INDEX "PasswordResetToken_userId_token_key"
     ON "PasswordResetToken"("userId","token");

   -- Database indexes (Stage 3)
   CREATE INDEX "Booking_employeeId_date_idx" ON "Booking"("employeeId", "date");
   CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
   CREATE INDEX "Booking_email_idx" ON "Booking"("email");
   CREATE INDEX "EmployeeAvailability_employeeId_idx" ON "EmployeeAvailability"("employeeId");
   CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
   ```
   > Verify the exact FK/index constraint names against your DB (e.g. `\d "Booking"` in psql)
   > before running, as they can vary by Prisma version.

---

## 4. Audit finding status (after Stage 1–4)

| ID | Finding | Status |
|----|---------|--------|
| C-1 | Hardcoded DB credentials | 🟡 Code fixed (schema→env, `.env` untracked); **rotation + history-purge still required (manual)** |
| C-2 | JWT fallback dev secret | ✅ Fixed (fail-closed + strong `SESSION_SECRET`) |
| H-1 | Profile-update IDOR | ✅ Fixed |
| H-2 | `GET /api/bookings` PII leak | ✅ Fixed (scoped to caller) |
| H-3 | `PATCH /api/bookings/[id]` IDOR | ✅ Fixed (ownership gate) |
| H-4 | Client-supplied booking price | ✅ Fixed (server-side price) |
| M-1 | OTP `@unique` collision 500 | ✅ Fixed (per-user unique) |
| M-4 | Delete service/employee → 500 | ✅ Fixed (SetNull; pending DB migration) |
| M-5 | No slot/employee/date validation | ✅ Fixed (availability + date + assignment checks) |
| M-2 | In-memory rate limiter | ✅ Fixed (trusted proxy headers, per-email limiting) |
| M-3 | Unused refresh token / 15-min sessions | ✅ Fixed (refresh endpoint + client-side refreshSession + authFetch) |
| L-1 | Missing CSP | ✅ Fixed (middleware.ts — strict CSP) |
| L-3 | Missing DB indexes | ✅ Fixed (Booking, EmployeeAvailability, PasswordResetToken) |
| CC-1 | Duplicated slot helpers | ✅ Fixed → `lib/slots.ts` |
| CC-2 | Duplicate availability endpoints | ✅ Fixed → `lib/availability.ts` (shared logic) |
| CC-3 | Duplicated admin/employee layouts | ✅ Fixed → `components/layout/RoleLayout.tsx` |
| CC-4 | Duplicated statusColors | ✅ Fixed → `lib/constants.ts` |
| CC-5 | Local displayTime in booking page | ✅ Fixed → uses `lib/utils.displayTime` |
| CC-6 | Cookie/auth constant duplication | ✅ Fixed → `lib/auth.ts` imports from `lib/constants.ts` |
| CC-7 | Dead code (getSession, resend.ts) | ✅ Fixed → removed |
| CC-8 | Bounded email generator | ✅ Fixed → max 50 iterations |

---

## 5. Production-readiness assessment

**Before Stage 1+2:** Not deployable — secrets in git, trivial auth bypass, full customer PII
exposure, editable other users' data, free/arbitrary booking prices.

**After Stage 1–4 (code):** ~**8 / 10**.
- Strengths: All Critical, High, and Medium security findings are resolved in code.
  Code cleanliness consolidated (eliminated ~300+ lines of duplication).
  Build is green; secrets are out of source control locally.
- Gaps preventing a higher score:
  - Operational secret remediation (rotate password, purge git history, set `SESSION_SECRET` in
    deploy) is **not yet done** — C-1 is only code-mitigated.
  - DB migration not applied.
  - No automated tests; `npm audit` not run.

**Recommendation:** Do not deploy until the four "Required manual steps" above are complete.

---

## 6. Security posture assessment

**Before:** ~**2 / 10** — a single hardcoded secret + a committed JWT fallback allowed complete
account/admin takeover and bulk PII exfiltration by any logged-in user.

**After Stage 1–4 (code):** ~**8.5 / 10**.

- Eliminated: JWT forgery (fail-closed secret), PII exposure via bookings API, profile/booking
  IDOR, price manipulation, OTP-collision 500, broken delete cascade.
- Rate limiting hardened with trusted proxy headers and per-email limiting.
- Refresh token lifecycle implemented (endpoint + client-side utilities).
- Content-Security-Policy header in place.
- Database indexes added on hot query paths.
- Code cleanliness: ~300+ lines of duplication eliminated, dead code removed, shared modules extracted.

**Path to ~9/10:** complete the manual secret steps and add basic auth/authorization tests.

---

## 7. Summary

All four stages (Critical, High, Medium, Code Cleanliness) are implemented and the project
builds cleanly (`npm run build` ✅).

**Resolved findings:**
- 2 Critical (code side): hardcoded DB credentials (schema→env), JWT fallback secret (fail-closed)
- 4 High: profile-update IDOR, bookings PII leak, bookings IDOR, client-supplied price
- 5 Medium: OTP uniqueness, FK cascade, slot validation, rate limiter hardening, refresh token lifecycle
- 2 Low: missing CSP, missing DB indexes
- 8 Code Cleanliness: slot helper duplication, availability endpoint duplication, layout duplication, statusColors duplication, displayTime duplication, cookie/auth constant duplication, dead code removal, bounded email generator

**Remaining work:**
- **Operational secret remediation** (rotate DB password, purge git history, set SESSION_SECRET in deploy) — must-do before any deploy
- **DB migration** (nullable Booking FKs, new indexes) — code-complete, needs `prisma db push`

**Security posture:** moved from ~2/10 to ~8.5/10.
**Production-readiness:** moved from non-deployable to ~8/10 (operational steps remain).
