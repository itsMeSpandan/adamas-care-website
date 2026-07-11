# Audit Report — Adamas Care (salon_spa_website)

**Date:** 2026-07-11
**Scope:** Full source review of the repository (Next.js 14 App Router + Prisma/PostgreSQL).
**Auditor:** Automated source review (no live/dynamic testing performed).

---

## 1. Executive Summary

This is a salon & spa booking application (Next.js 14, React 18, Prisma 6 + PostgreSQL,
JWT auth via `jose`, bcrypt password hashing, EmailJS/Resend email). The codebase is
functional and has reasonable UX, but it contains **multiple critical and high-severity
security defects**, most of which stem from secrets being committed to the repository and
server-side authorization checks being too weak or absent.

### Severity breakdown

| Severity | Count | Highlight |
|----------|-------|-----------|
| 🔴 Critical | 2 | Hardcoded DB credentials; JWT fallback dev secret |
| 🟠 High | 4 | IDOR on profile; PII exposure on bookings GET; IDOR on booking PATCH; client-supplied price |
| 🟡 Medium | 5 | OTP unique-collision 500; weak rate limiter; unused refresh token; FK-delete 500; no slot validation |
| 🟢 Low | 5 | Missing CSP; OTP in console/response; no DB indexes; enum vs string drift; boilerplate docs |

**Overall verdict:** Not safe to deploy in current state. The two critical items must be
remediated and all secrets rotated before any production exposure. Several high-severity
authorization bugs allow any logged-in user to read all customer PII and tamper with other
users' data.

---

## 2. Critical Findings

### C-1 — Production database credentials committed to the repo
- `prisma/schema.prisma:7` — `datasource db { url = "postgresql://neondb_owner:***@ep-odd-water…/neondb?sslmode=require" }`
- `.env:12` — same connection string is committed (`.gitignore` only ignores `.env*.local`, **not** `.env`).

The NeonDB username/password are checked into version control in two places. Anyone with
repo access (or a leaked `.git` history) can connect to and read/modify the production
database.

**Fix:**
1. Rotate the NeonDB password immediately.
2. Remove the hardcoded URL from `schema.prisma` — Prisma already reads `DATABASE_URL` from the environment at runtime; the literal in the schema is unnecessary and dangerous. Keep only `url = env("DATABASE_URL")`.
3. Add `.env` to `.gitignore` and purge it from git history (`git filter-repo` / BFG).
4. Move secrets to the deployment platform's secret store.

### C-2 — JWT signed with a committed fallback secret (auth bypass)
- `lib/auth.ts:4-6`: `const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-dev-secret-change-in-production");`
- Neither `.env` nor `.env.example` defines `SESSION_SECRET`.

If `SESSION_SECRET` is not explicitly set in the deployment environment (very likely here,
since it is absent from `.env`), every session token is signed with the literal public
string `"fallback-dev-secret-change-in-production"`, which is in the source code. An
attacker can forge a token with **any `userId` and `role: "admin"`** and gain full admin
access to every protected endpoint. This is a complete authentication/authorization bypass.

**Fix:**
1. Generate a strong random secret (`openssl rand -base64 48`) and set it as `SESSION_SECRET` in the deployment environment.
2. **Fail closed** — throw at startup if `process.env.SESSION_SECRET` is missing rather than falling back to a dev value.

---

## 3. High-Severity Findings

### H-1 — IDOR on `PUT /api/auth/profile` (broken object-level authorization)
- `app/api/auth/profile/route.ts:10-28`

The route requires authentication but uses `userId` **from the request body** to select
which user to update. There is no check that `session.userId === userId`. Any authenticated
user can submit another user's `userId` and change that user's `name`, `email`, or
`avatarUrl`. (Password change still requires the victim's current password, so it is not
directly exploitable, but profile fields are.)

**Fix:** Derive the target user from `session.userId`; ignore any client-supplied `userId`.

### H-2 — `GET /api/bookings` exposes all customers' PII to any logged-in user
- `app/api/bookings/route.ts:8-19` uses `requireAuth` (any user) and returns `getBookings()` = **every** booking.

Each booking includes `name`, `email`, `phone`, `notes`, and service/client details. Any
authenticated account (a normal customer) can fetch the entire customer database. The
profile page hides this by filtering client-side, but the data is fully exposed over the wire.

**Fix:** Restrict `GET /api/bookings` to `requireRole("admin")` (and/or `employee`), or scope results to the caller's own `userId`/employee. Never return another user's PII to a normal account.

### H-3 — IDOR on `PATCH /api/bookings/[id]`
- `app/api/bookings/[id]/route.ts:8-57` uses only `requireAuth`.

Any authenticated user can cancel, change status, or post a rating/review on **any** booking
by id. A malicious user could cancel other customers' appointments or forge reviews.

**Fix:** Enforce ownership (booking `userId === session.userId`) or admin/employee role before mutating a booking.

### H-4 — Booking price taken from the client (price manipulation)
- `app/api/bookings/route.ts:39-101`; client sends `price` in `app/booking/page.tsx:194`.

The server stores `price` exactly as submitted by the client. The only guard is
`price === undefined`. A client (or intercepted request) can book a premium service with
`price: 0` or a negative value. There is no server-side lookup of the service's real price.

**Fix:** Never trust client price. Look up `serviceId`, compute the charged price server-side, and validate `employeeId` actually offers `serviceId`.

---

## 4. Medium-Severity Findings

### M-1 — `PasswordResetToken.token` is `@unique` over a 6-digit OTP space → 500
- `prisma/schema.prisma:118-127` (`token String @unique`); `app/api/auth/forgot-password/route.ts:61-70`.

The OTP is only 6 digits (1,000,000 values). With `@unique`, two different users receiving
the same OTP (birthday-collision, or just bad luck at volume) cause `create` to throw a
unique-constraint error → HTTP 500 on forgot-password. The OTP should be unique **per user**,
not globally.

**Fix:** Remove the global `@unique`; store a random UUID as the lookup token and send the
6-digit OTP as a separate, non-unique field. Or key the uniqueness on `(userId, token)`.

### M-2 — In-memory rate limiter is ineffective on serverless and spoofable
- `lib/rate-limit.ts` — module-level `Map`; key derived from `x-forwarded-for` (`getRateLimitKey`, line 73-77).

On serverless platforms (Vercel) each instance has its own memory, so the limiter does not
span instances and is trivially bypassed by sending a random `X-Forwarded-For` header. It
also provides no per-account/per-email limiting for OTP or login.

**Fix:** Use a shared store (Redis/Upstash) and derive the client IP from trusted proxy
headers server-side, not from a client-controllable header.

### M-3 — Refresh token is set but never used (15-minute sessions, dead code)
- `lib/auth.ts:71-77` sets `adamascare_refresh` (7d); `middleware`/routes never read it.
- `lib/auth.ts:9` access token expires in 15 minutes.

After 15 minutes from login the access cookie expires and `getSessionFromRequest` returns
`null` → API calls 401, even though the UI still shows "logged in" (the client only checks
`/api/auth/me` on mount). The refresh cookie and `REFRESH_TOKEN_EXPIRY` are dead code.

**Fix:** Either implement a refresh flow (`/api/auth/refresh` verifying the refresh cookie
and issuing a new access token), or drop the refresh cookie entirely and lengthen the
access token appropriately.

### M-4 — Deleting a Service/Employee with existing bookings → 500
- `prisma/schema.prisma:113-115` — `Booking.service` / `Booking.employee` relations have **no `onDelete`**.
- `app/api/services/[id]/route.ts:41-54` and `app/api/employees/[id]/route.ts:53-72` call `delete` directly.

Deleting a service or employee that has bookings throws a foreign-key constraint error
(returned as 500). Decide on semantics: `onDelete: SetNull` (keep booking history, null the
FK) or `Cascade`, and add it to the schema.

### M-5 — No server-side validation of booking slot / employee-service / date
- `app/api/bookings/route.ts` only checks required fields + a conflict check.

The server does not verify that `employeeId` offers `serviceId`, that the date is in the
future, or that `slotStart`/`slotEnd` fall within the employee's availability windows /
business hours. A crafted request can book arbitrary times (e.g. `3:00 AM`).

**Fix:** Validate against `EmployeeAvailability`/`AvailabilityOverride`, confirm the
employee–service assignment, reject past dates, and reject out-of-range slots.

---

## 5. Low-Severity Findings

- **L-1 Missing Content-Security-Policy.** `middleware.ts` sets HSTS, frame-options,
  nosniff, referrer-policy, permissions-policy, but no CSP. Add a CSP (at least
  `default-src 'self'` + the image hosts) to reduce XSS/data-injection blast radius.
- **L-2 OTP handling in non-production.** `forgot-password` logs the OTP to the console and
  returns it in the response whenever `NODE_ENV !== "production"`. Ensure real prod builds
  never do this (currently env-gated, which is acceptable, but verify the deploy `NODE_ENV`).
- **L-3 No DB indexes** on `Booking.employeeId`, `Booking.date`, `Booking.userId`,
  `EmployeeAvailability.employeeId`. Availability/booking queries will do sequential scans
  and degrade at scale.
- **L-4 Type drift.** `User.role` is a `UserRole` enum while `Employee.role` is free `String`;
  `Service.category` is `String` but `lib/types.ts` defines a `ServiceCategory` union. Align
  the schema and types.
- **L-5 `generateUniqueEmployeeEmail`** (`lib/queries.ts:309-323`) uses `while (true)`; if the
  DB is unreachable it loops forever. Bound the retries.
- **L-6 `README.md`** is the create-next-app boilerplate — no project, setup, or deployment docs.
- **L-7 Email enumeration:** `register` returns 409 for an existing email (minor
  enumeration signal). `forgot-password` correctly returns a generic message — keep that
  pattern.

---

## 6. Correctness / Reliability

- **Two overlapping availability endpoints.** `/api/availability` (24h `HH:MM`, returns
  `isBooked`) and `/api/available-slots` (12h `H:MM AM`, different time format, different
  past-slot logic) do nearly the same job with inconsistent output formats
  (`app/api/availability/route.ts` vs `app/api/available-slots/route.ts`). Consolidate.
- **N+1 availability queries.** `/api/availability/dates` runs one DB query per day of the
  month (`availability/dates/route.ts:34-101`), and the booking page fans out to every
  employee when "Any" is selected. Batch into a single `groupBy`/date-range query.
- **`parseInt` robustness.** `parseInt(searchParams.get("serviceDuration") || "60", 10)` can
  yield `NaN`; guard it.
- **`new Date(date)` for booking date** (`bookings/route.ts:56`) accepts arbitrary strings;
  validate/parse explicitly and reject invalid dates.

---

## 7. Code Cleanliness Report

### What's good
- Consistent server/client separation; clear `lib/` module boundaries (`auth`, `queries`, `db`, `rate-limit`).
- Centralized `cn()`, `formatPrice()`, `formatDuration()`, `displayTime()` in `lib/utils.ts`.
- Security headers wired through `middleware.ts`; email enumeration mitigated on password reset.
- `scripts/migrate-passwords.ts` is well-structured and idempotent.

### Issues

| # | Issue | Location | Recommendation |
|---|-------|----------|----------------|
| CC-1 | **Massive duplication of time helpers** — `timeToMinutes`, `minutesToTime`, `subtractTimeRange`, `mergeWindows` are copy-pasted verbatim across 3 route files | `availability/route.ts`, `available-slots/route.ts`, `availability/dates/route.ts` | Extract to `lib/time.ts` (or `lib/slots.ts`) and import. |
| CC-2 | **Duplicated admin/employee layouts** — `admin/layout.tsx` and `employee/layout.tsx` are ~95% identical | `app/admin/layout.tsx`, `app/employee/layout.tsx` | Share a `RoleLayout` component parameterized by links/role. |
| CC-3 | `displayTime()` reimplemented locally in `booking/page.tsx:269-274` though `lib/utils.displayTime` exists | `app/booking/page.tsx` | Import `displayTime` from `lib/utils`. |
| CC-4 | **Inconsistent ID generation** — `svc_${Date.now()}_${random}` / `emp_…` instead of DB `@default(cuid())` | `services/route.ts:29`, `employees/route.ts:36` | Use Prisma-generated IDs (`@default(cuid())` / `@default(uuid())`). |
| CC-5 | **Inconsistent typing** — enum vs string `role`; string vs union `category` | `schema.prisma`, `lib/types.ts` | Unify types across schema and TS. |
| CC-6 | **No centralized input validation** — each route hand-rolls field checks with inconsistent error shapes | all API routes | Introduce `zod` schemas shared by client + server. |
| CC-7 | **Unused / dead code** — `resend.ts` (legacy, unused), refresh cookie (M-3), `getSession` (cookie-store variant) rarely used | `lib/resend.ts`, `lib/auth.ts` | Remove or document; prune dead paths. |
| CC-8 | **Huge component files** — `booking/page.tsx` (731 lines), `profile/page.tsx` (683 lines), `admin/page.tsx` (236 lines) | `app/**/page.tsx` | Split into smaller step/sub-components and extract pure helpers. |
| CC-9 | **`.gitignore` misses `.env`** | `.gitignore:28-29` | Add `.env` (keep `.env.example`). |
| CC-10 | **Boilerplate README** | `README.md` | Document setup, env vars, scripts, deploy. |
| CC-11 | **Duplicated `statusColors` map** | `app/profile/page.tsx:32`, `app/admin/page.tsx:88` | Hoist to a shared constant. |
| CC-12 | Magic strings for cookie names / env vars scattered across files | `lib/auth.ts`, `lib/emailjs.ts`, etc. | Centralize config constants. |

### Style / consistency notes
- `"use client"` files mix `any`/`unknown` returns and `as` casts (e.g. `bookings/route.ts:33`
  `data.bookings || data || []`). Add explicit types.
- `export const dynamic = "force-dynamic"` is set on nearly every route — fine, but consider
  per-route caching for read endpoints.
- Console `.error` logging is used consistently; add a structured logger for prod.

---

## 8. Performance

- **N+1 availability queries** (M/Correctness above) — biggest hot spot; 30+ queries/month/user.
- `getBookings()` eagerly includes `user`, `employee`, `service` and returns **all** rows to
  the client (H-2). Paginate and scope server-side.
- No composite indexes on the most-filtered columns (`employeeId`+`date`).
- `RevenueChart`/`admin` compute aggregates in JS over the full booking set every render —
  push aggregation to the DB (`groupBy`) for scale.

---

## 9. Prioritized Remediation Plan

1. **[Critical]** Rotate NeonDB password; remove hardcoded DB URL from `schema.prisma`; purge `.env` from git; add `.env` to `.gitignore`. (C-1)
2. **[Critical]** Set a strong `SESSION_SECRET` in the deploy environment and make `lib/auth.ts` fail closed if it is unset. (C-2)
3. **[High]** Scope `GET /api/bookings` to admin/employee and/or the caller's own data. (H-2)
4. **[High]** Enforce ownership/role on `PATCH /api/bookings/[id]`. (H-3)
5. **[High]** Derive profile update target from `session.userId`, not the request body. (H-1)
6. **[High]** Compute booking price server-side from `serviceId`; validate employee–service & slot. (H-4, M-5)
7. **[Medium]** Fix OTP uniqueness; replace in-memory limiter with a shared store; implement or remove refresh token; add `onDelete` to booking relations. (M-1…M-4)
8. **[Low/Quality]** Add CSP; add DB indexes; unify types & IDs; de-duplicate time helpers, layouts, config; add `zod` validation; write real README. (L-1…L-7, CC-1…CC-12)

---

## 10. Recommended Next Steps (not yet performed)

- Run `npm audit` / `npm outdated` for dependency vulnerabilities.
- Add a CSP and verify `NODE_ENV=production` in the deploy.
- Add automated tests for auth/authorization and booking validation.
- Consider `/security-review` on the committed diff before merging.
