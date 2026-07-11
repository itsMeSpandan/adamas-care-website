# Completion Report — Stage 1 & Stage 2 Remediation

**Date:** 2026-07-11
**Scope implemented:** Critical (secrets + auth bypass) and High (authorization, PII exposure,
booking integrity) items from `FIX_MASTER_PROMPT.md` / `AUDIT_REPORT.md`.
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
   ```
   > Verify the exact FK/index constraint names against your DB (e.g. `\d "Booking"` in psql)
   > before running, as they can vary by Prisma version.

---

## 4. Audit finding status (after Stage 1 + 2)

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
| M-2 | In-memory rate limiter | ⬜ Still open (Stage 3) |
| M-3 | Unused refresh token / 15-min sessions | ⬜ Still open (Stage 3) |
| L-1 | Missing CSP | ⬜ Still open (Stage 3) |
| L-3 | Missing DB indexes | ⬜ Still open (Stage 3) |
| CC-1…CC-12 | Code cleanliness | ⬜ Still open (Stage 4) |

---

## 5. Production-readiness assessment

**Before Stage 1+2:** Not deployable — secrets in git, trivial auth bypass, full customer PII
exposure, editable other users' data, free/arbitrary booking prices.

**After Stage 1+2 (code):** ~**6 / 10**.
- Strengths: auth-bypass and all High-severity authorization/data-exposure bugs are resolved in
  code; build is green; secrets are out of source control locally.
- Gaps preventing a higher score:
  - Operational secret remediation (rotate password, purge git history, set `SESSION_SECRET` in
    deploy) is **not yet done** — C-1 is only code-mitigated.
  - DB migration not applied.
  - No automated tests; `npm audit` not run.
  - Remaining hardening (rate limiting, refresh-token lifecycle, CSP) sits in Stage 3.

**Recommendation:** Do not deploy until the four "Required manual steps" above are complete and
Stage 3 is at least partially done (rate limiter + CSP are the highest-value remaining items).

---

## 6. Security posture assessment

**Before:** ~**2 / 10** — a single hardcoded secret + a committed JWT fallback allowed complete
account/admin takeover and bulk PII exfiltration by any logged-in user.

**After Stage 1+2 (code):** ~**7 / 10**.
- Eliminated: JWT forgery (fail-closed secret), PII exposure via bookings API, profile/booking
  IDOR, price manipulation, OTP-collision 500, broken delete cascade.
- Residual risk (medium, Stage 3):
  - Rate limiter is in-memory + spoofable `X-Forwarded-For` (brute-force/abuse risk on
    login/OTP).
  - Refresh token is dead code → sessions expire in 15 min (UX + a window where stale UI shows
    "logged in").
  - No CSP header (XSS blast radius larger).
  - No DB indexes on hot columns (performance degradation, not a direct vuln).
- Residual risk (operational): until the DB password is rotated and git history purged, the
  exposed credential remains a live threat.

**Path to ~9/10:** complete the manual secret steps, then Stage 3 (shared-store rate limiter,
implement/remove refresh token, add CSP, add indexes) and add basic auth/authorization tests.

---

## 7. Summary

Stage 1 and Stage 2 are implemented and the project builds cleanly. All 2 Critical (code side)
and 4 High findings, plus 3 Medium findings (OTP uniqueness, FK cascade, slot validation), are
resolved in source. The remaining work is **operational secret remediation + DB migration**
(must-do before any deploy) and the **Stage 3/4 hardening & cleanup** items. Security posture
moved from ~2/10 to ~7/10; production-readiness from non-deployable to ~6/10.
